import { Audio as ExpoAv } from "expo-av";
import { Asset } from "expo-asset";
import { Platform } from "react-native";
import { API_URL } from "@/constants/theme";
import { parseSoundLine, PHONEME_ASSETS } from "@/lib/phonemes";

const LANG = "en-GB";

type BrowserVoice = { name: string; lang: string; default?: boolean };
type Utterance = {
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  text: string;
  voice: BrowserVoice | null;
  onend: (() => void) | null;
};
type SynthApi = {
  cancel: () => void;
  speak: (u: Utterance) => void;
  getVoices: () => BrowserVoice[];
  onvoiceschanged: ((this: unknown, ev: unknown) => unknown) | null;
  addEventListener?: (name: string, fn: () => void, opts?: { once?: boolean }) => void;
};

export type SpeakStyle = "word" | "sentence" | "sound" | "coach";
export type SpeakOpts = { blend?: string };

function cleanTalk(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/** Natural spoken line. Keep it like a person, not a drill. */
export function teachLine(text: string, style: SpeakStyle, _opts?: SpeakOpts) {
  const clean = cleanTalk(text).replace(/[.]+$/, "");
  if (!clean) return "";
  if (style === "sound") {
    const m = clean.match(/^(.*?),\s*as in\s+(.+)$/i);
    if (m) return `${m[1].trim()}, as in ${m[2].replace(/[.]+$/, "").trim()}.`;
    return `${clean}.`;
  }
  if (style === "coach") return clean;
  if (style === "word") return clean;
  return /[.!?]$/.test(text.trim()) ? cleanTalk(text) : `${clean}.`;
}

function styleProsody(style: SpeakStyle) {
  if (style === "word") return { rate: 0.92, pitch: 1.04 };
  if (style === "sound") return { rate: 0.94, pitch: 1.04 };
  if (style === "coach") return { rate: 1, pitch: 1.05 };
  return { rate: 0.96, pitch: 1.03 };
}

function getApi(): { synth: SynthApi; Utter: new (t: string) => Utterance } | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    speechSynthesis?: SynthApi;
    SpeechSynthesisUtterance?: new (t: string) => Utterance;
  };
  if (!w.speechSynthesis || !w.SpeechSynthesisUtterance) return null;
  return { synth: w.speechSynthesis, Utter: w.SpeechSynthesisUtterance };
}

const REJECT_VOICE =
  /male|fred|albert|bad news|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|zarvox|daniel|david|mark|ravi|george|gordon|thomas|arthur|ryan|guy|eric|andrew|brian|christopher|steffan/i;

const PREFERRED = [
  /google uk english female/i,
  /libby/i,
  /sonia/i,
  /katie/i,
  /serena/i,
  /hazel/i,
  /samantha/i,
  /karen/i,
  /moira/i,
  /fiona/i,
  /kate/i,
  /victoria/i,
  /zira/i,
  /google us english/i,
  /female/i,
];

let cachedVoice: BrowserVoice | null = null;
let voicesReady: Promise<void> | null = null;

function scoreVoice(v: BrowserVoice) {
  const name = v.name || "";
  if (REJECT_VOICE.test(name)) return -100;
  if (/compact/i.test(name)) return -80;
  let score = 0;
  if (/en-GB/i.test(v.lang)) score += 8;
  else if (/en-AU/i.test(v.lang)) score += 6;
  else if (/en-US/i.test(v.lang) || /^en/i.test(v.lang)) score += 4;
  else return -50;
  PREFERRED.forEach((re, i) => {
    if (re.test(name)) score += 20 - i;
  });
  if (/natural|neural|online/i.test(name)) score += 5;
  if (/female|woman|girl/i.test(name)) score += 4;
  return score;
}

function pickVoice(voices: BrowserVoice[]) {
  if (!voices.length) return null;
  const ranked = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return ranked[0] && scoreVoice(ranked[0]) > 0 ? ranked[0] : voices.find((v) => /^en/i.test(v.lang)) || voices[0];
}

function ensureVoices() {
  const api = getApi();
  if (!api) return Promise.resolve();
  if (voicesReady) return voicesReady;
  voicesReady = new Promise((resolve) => {
    const finish = () => {
      cachedVoice = pickVoice(api.synth.getVoices() || []);
      resolve();
    };
    const now = api.synth.getVoices() || [];
    if (now.length) {
      finish();
      return;
    }
    const onChange = () => finish();
    if (api.synth.addEventListener) api.synth.addEventListener("voiceschanged", onChange, { once: true });
    else api.synth.onvoiceschanged = onChange;
    setTimeout(finish, 600);
  });
  return voicesReady;
}

if (typeof window !== "undefined") {
  ensureVoices();
}

type BrowserAudio = {
  pause: () => void;
  play: () => Promise<unknown>;
  src: string;
};

let currentAudio: BrowserAudio | null = null;
let nativeSound: ExpoAv.Sound | null = null;
let audioModeReady = false;
let speakGen = 0;
const clipCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();
let neuralEnabled: boolean | null = null;
let neuralProbe: Promise<boolean> | null = null;
let whisperEnabled: boolean | null = null;

function clipUri(line: string, style: SpeakStyle) {
  return `${API_URL}/speech?text=${encodeURIComponent(line)}&style=${encodeURIComponent(style)}`;
}

async function ensureAudioMode() {
  if (audioModeReady || Platform.OS === "web") return;
  await ExpoAv.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  audioModeReady = true;
}

function stopCurrentAudio() {
  getApi()?.synth.cancel();
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.src = "";
    } catch {
      /* ignore */
    }
    currentAudio = null;
  }
  if (nativeSound) {
    const sound = nativeSound;
    nativeSound = null;
    void sound.stopAsync().catch(() => undefined);
    void sound.unloadAsync().catch(() => undefined);
  }
}

export function stopSpeaking() {
  speakGen += 1;
  stopCurrentAudio();
}

async function neuralAvailable() {
  if (neuralEnabled === false) return false;
  if (neuralEnabled === true) return true;
  if (neuralProbe) return neuralProbe;
  neuralProbe = fetch(`${API_URL}/speech/status`)
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      whisperEnabled = Boolean(data.sttReady);
      if (data.ready) {
        neuralEnabled = true;
        return true;
      }
      neuralProbe = null;
      return false;
    })
    .catch(() => {
      neuralProbe = null;
      return false;
    });
  return neuralProbe;
}

export async function whisperAvailable() {
  if (whisperEnabled === true) return true;
  try {
    const res = await fetch(`${API_URL}/speech/status`);
    const data = await res.json().catch(() => ({}));
    whisperEnabled = Boolean(data.sttReady);
  } catch {
    whisperEnabled = false;
  }
  return Boolean(whisperEnabled);
}

export function prefetchSpeech() {
  if (Platform.OS !== "web") console.log("[speech] API", API_URL);
  void neuralAvailable();
  void ensureAudioMode();
  void Asset.loadAsync(Object.values(PHONEME_ASSETS)).catch(() => undefined);
}

export function prefetchClip(text: string, style: SpeakStyle = "sentence", opts?: SpeakOpts) {
  if (style === "sound") {
    const parts = parseSoundLine(text);
    if (parts) {
      void Asset.loadAsync(parts.asset).catch(() => undefined);
      prefetchClip(parts.word, "word");
      return;
    }
  }
  const line = teachLine(text, style, opts);
  if (!line || style === "coach") return;
  void neuralAvailable().then((ok) => {
    if (!ok) return;
    if (Platform.OS === "web") void fetchNeural(line, style);
    else void fetch(clipUri(line, style)).catch(() => undefined);
  });
}

function playMp3Url(url: string) {
  if (typeof Audio === "undefined") return false;
  stopCurrentAudio();
  const audio = new Audio(url) as unknown as BrowserAudio;
  currentAudio = audio;
  void audio.play().catch((err) => console.warn("[speech] web play failed", err));
  return true;
}

async function playNativeUri(uri: string) {
  try {
    await ensureAudioMode();
    stopCurrentAudio();
    const { sound } = await ExpoAv.Sound.createAsync(
      { uri },
      { shouldPlay: true, volume: 1, progressUpdateIntervalMillis: 500 }
    );
    nativeSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded || !status.didJustFinish) return;
      if (nativeSound === sound) nativeSound = null;
      void sound.unloadAsync().catch(() => undefined);
    });
    return true;
  } catch (err) {
    console.warn("[speech] native play failed", uri, err);
    return false;
  }
}

function markNeuralDown(status?: number) {
  if (status === 503 || status === 429 || status === 402) neuralEnabled = false;
}

async function fetchNeural(line: string, style: SpeakStyle) {
  const cacheKey = `${style}|${line}`;
  const cached = clipCache.get(cacheKey);
  if (cached) return cached;
  const pending = inflight.get(cacheKey);
  if (pending) return pending;
  const job = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(`${API_URL}/speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: line, style }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        markNeuralDown(res.status);
        return null;
      }
      const blob = await res.blob();
      if (!blob.size) return null;
      const url = URL.createObjectURL(blob);
      clipCache.set(cacheKey, url);
      return url;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  })();
  inflight.set(cacheKey, job);
  try {
    return await job;
  } finally {
    inflight.delete(cacheKey);
  }
}

export function speak(text: string, style: SpeakStyle = "sentence", opts?: SpeakOpts) {
  const gen = ++speakGen;
  if (style === "sound") {
    const parts = parseSoundLine(text);
    if (parts) {
      prefetchClip(parts.word, "word");
      void startPhoneme(parts.asset, gen).then(async (heard) => {
        if (gen !== speakGen) return;
        if (!heard) console.warn("[speech] phoneme clip failed", parts.file);
        await playPrepared(parts.word, "word", gen);
      });
      return;
    }
  }
  void speakPrepared(text, style, opts, gen);
}

async function speakPrepared(text: string, style: SpeakStyle, opts: SpeakOpts | undefined, gen: number) {
  const line = teachLine(text, style, opts);
  if (!line) return;
  await playPrepared(line, style, gen);
}

async function playPrepared(line: string, style: SpeakStyle, gen: number) {
  if (gen !== speakGen) return;
  if (Platform.OS !== "web") {
    if (await neuralAvailable()) {
      if (gen !== speakGen) return;
      const ok = await playNativeUri(clipUri(line, style));
      if (ok || gen !== speakGen) return;
    }
    console.warn("[speech] no native voice", API_URL);
    return;
  }
  const cached = style !== "coach" ? clipCache.get(`${style}|${line}`) : undefined;
  if (cached) {
    playMp3Url(cached);
    return;
  }
  if (await neuralAvailable()) {
    const url = await fetchNeural(line, style);
    if (gen !== speakGen) return;
    if (url) {
      playMp3Url(url);
      return;
    }
  }
  if (gen !== speakGen) return;
  speakBrowser(line, style);
}

function waitForSoundEnd(sound: ExpoAv.Sound, gen: number) {
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (nativeSound === sound) nativeSound = null;
      void sound.unloadAsync().catch(() => undefined);
      resolve();
    };
    const timer = setTimeout(finish, 2500);
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish || gen !== speakGen) {
        clearTimeout(timer);
        finish();
      }
    });
  });
}

function resolveAssetUri(mod: number | string) {
  if (typeof mod === "string" && /^(https?:|blob:|data:|file:|\/)/i.test(mod)) return mod;
  const asset = Asset.fromModule(mod as number);
  return asset.localUri || asset.uri || "";
}

function startPhoneme(mod: number, gen: number) {
  if (Platform.OS === "web") {
    try {
      const uri = resolveAssetUri(mod);
      if (!uri || typeof Audio === "undefined") return Promise.resolve(false);
      stopCurrentAudio();
      const audio = new Audio(uri) as unknown as BrowserAudio;
      currentAudio = audio;
      return new Promise<boolean>((resolve) => {
        const finish = (ok: boolean) => resolve(ok && gen === speakGen);
        const timer = setTimeout(() => finish(true), 2500);
        audio.onended = () => {
          clearTimeout(timer);
          finish(true);
        };
        void audio.play().then(undefined, () => {
          clearTimeout(timer);
          finish(false);
        });
      });
    } catch {
      return Promise.resolve(false);
    }
  }
  return playPhonemeNative(mod, gen);
}

async function playPhonemeNative(mod: number, gen: number) {
  try {
    await ensureAudioMode();
    if (gen !== speakGen) return false;
    stopCurrentAudio();
    const { sound } = await ExpoAv.Sound.createAsync(mod, { shouldPlay: true, volume: 1 });
    if (gen !== speakGen) {
      void sound.unloadAsync().catch(() => undefined);
      return false;
    }
    nativeSound = sound;
    await waitForSoundEnd(sound, gen);
    return gen === speakGen;
  } catch (err) {
    console.warn("[speech] phoneme play failed", err);
    return false;
  }
}

function speakBrowser(line: string, style: SpeakStyle) {
  const api = getApi();
  if (!api) return;
  const { rate, pitch } = styleProsody(style);
  const voice = cachedVoice || pickVoice(api.synth.getVoices() || []);
  stopCurrentAudio();
  const u = new api.Utter(line);
  u.lang = voice?.lang || LANG;
  u.rate = rate;
  u.pitch = pitch;
  u.volume = 1;
  if (voice) u.voice = voice;
  api.synth.speak(u);
}

export function speakWord(word: string, opts?: SpeakOpts) {
  speak(word, "word", opts);
}

export function speakSound(description: string) {
  speak(description, "sound");
}

export function speakCoach(line: string) {
  speak(line, "coach");
}

type Rec = {
  lang: string;
  continuous?: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event?: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

function getRecognitionCtor(): (new () => Rec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function canListen() {
  if (Platform.OS === "web") {
    return Boolean(typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) || Boolean(getRecognitionCtor());
  }
  return Boolean(getRecognitionCtor());
}

export function listenBlockReason() {
  if (typeof window === "undefined") return "NO_WINDOW";
  const secure = Boolean((window as unknown as { isSecureContext?: boolean }).isSecureContext);
  const host = window.location.hostname;
  const local = host === "localhost" || host === "127.0.0.1";
  if (!secure && !local) return "INSECURE";
  const hasMic = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
  if (!hasMic && !getRecognitionCtor()) return "NO_API";
  return null;
}

export function listenBlockMessage() {
  const reason = listenBlockReason();
  if (reason === "INSECURE") {
    const origin = typeof window !== "undefined" ? window.location.origin : "this address";
    return `The mic is blocked on this laptop because the page is HTTP (${origin}). Chrome only allows recording on HTTPS or localhost. Quick fix: in Chrome open chrome://flags/#unsafely-treat-insecure-origin-as-secure , add ${origin} , relaunch Chrome, then try Record again.`;
  }
  if (reason === "NO_API") {
    return "This browser cannot score speech. Use Google Chrome or Microsoft Edge.";
  }
  return null;
}

async function unlockMicrophone() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => track.stop());
}

export type ListenSession = {
  stop: () => void;
  done: Promise<string>;
};

function transcriptFromEvent(event: unknown) {
  const ev = event as {
    resultIndex?: number;
    results: Array<{ isFinal?: boolean; 0?: { transcript?: string } }> & { length: number };
  };
  let finals = "";
  let interim = "";
  for (let i = 0; i < ev.results.length; i++) {
    const bit = String(ev.results[i]?.[0]?.transcript || "");
    if (ev.results[i]?.isFinal) finals += `${bit} `;
    else interim += `${bit} `;
  }
  return {
    finals: finals.replace(/\s+/g, " ").trim(),
    interim: interim.replace(/\s+/g, " ").trim(),
  };
}

/** Live captions stay instant; recording only ends after a real pause, not after the first word. */
export function listenLive(
  onPartial: (text: string) => void,
  opts?: { timeoutMs?: number; silenceMs?: number; minListenMs?: number; phrase?: string; skipUnlock?: boolean }
): ListenSession {
  const timeoutMs = opts?.timeoutMs ?? 25000;
  const silenceMs = opts?.silenceMs ?? 2000;
  const minListenMs = opts?.minListenMs ?? 1800;
  let stopFn = () => undefined;
  const done = new Promise<string>((resolve, reject) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      reject(new Error("LISTEN_UNAVAILABLE"));
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-GB";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finished = false;
    let committed = "";
    let best = "";
    let quiet: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const finish = (text: string, err?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(hardStop);
      if (quiet) clearTimeout(quiet);
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
      const said = text.trim();
      if (said) resolve(said);
      else reject(err || new Error("NO_SPEECH"));
    };

    const scheduleEnd = (text: string) => {
      if (quiet) clearTimeout(quiet);
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(silenceMs, minListenMs - elapsed);
      quiet = setTimeout(() => finish(text), wait);
    };

    const emit = (text: string) => {
      best = text;
      onPartial(text);
      if (text) scheduleEnd(text);
    };

    stopFn = () => finish(best || committed, new Error("NO_SPEECH"));

    rec.onresult = (event) => {
      const { finals, interim } = transcriptFromEvent(event);
      if (finals) committed = `${committed} ${finals}`.replace(/\s+/g, " ").trim();
      emit(`${committed} ${interim}`.replace(/\s+/g, " ").trim());
    };
    rec.onerror = (event) => {
      const code = String((event as { error?: string } | undefined)?.error || "");
      if (code === "no-speech" || code === "aborted" || code === "cancelled") return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        finish(best, new Error("LISTEN_BLOCKED"));
        return;
      }
      finish(best, new Error("LISTEN_FAILED"));
    };
    rec.onend = () => {
      if (finished) return;
      try {
        rec.start();
      } catch {
        /* keep waiting for Stop or silence */
      }
    };
    const hardStop = setTimeout(() => {
      try {
        rec.stop();
      } catch {
        finish(best, new Error("NO_SPEECH"));
      }
    }, timeoutMs);
    void (async () => {
      if (!opts?.skipUnlock) {
        try {
          await unlockMicrophone();
        } catch {
          finish("", new Error("LISTEN_BLOCKED"));
          return;
        }
      }
      try {
        rec.start();
      } catch {
        finish("", new Error(listenBlockReason() === "INSECURE" ? "LISTEN_BLOCKED" : "LISTEN_FAILED"));
      }
    })();
  });
  return { stop: () => stopFn(), done };
}

export function listenOnce(timeoutMs = 7000) {
  return listenLive(() => undefined, { timeoutMs, silenceMs: 2000, minListenMs: 1800 }).done;
}

/** Live word chips only. Does not decide when recording ends. */
export function listenPartial(onPartial: (text: string) => void): { stop: () => void } {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return { stop: () => undefined };
  const rec = new Ctor();
  rec.lang = "en-GB";
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let stopped = false;
  let committed = "";
  rec.onresult = (event) => {
    const { finals, interim } = transcriptFromEvent(event);
    if (finals) committed = `${committed} ${finals}`.replace(/\s+/g, " ").trim();
    onPartial(`${committed} ${interim}`.replace(/\s+/g, " ").trim());
  };
  rec.onerror = () => undefined;
  rec.onend = () => {
    if (stopped) return;
    try {
      rec.start();
    } catch {
      /* mic may already be in use for Whisper */
    }
  };
  try {
    rec.start();
  } catch {
    /* live captions optional */
  }
  return {
    stop: () => {
      stopped = true;
      try {
        rec.abort?.();
      } catch {
        /* ignore */
      }
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    },
  };
}

const OPTIONAL = new Set(["a", "an", "the", "to", "of", "and", "is", "at", "on", "in", "for", "with"]);

const ALIASES: Record<string, string> = {
  gonna: "going",
  wanna: "want",
  colour: "color",
  favourite: "favorite",
  reed: "read",
};

/** Homophones only. Rhymes and near-misses must fail. */
const SOUND_ALIKES: Record<string, string[]> = {
  see: ["sea"],
  bee: ["be"],
  i: ["eye", "aye"],
  read: ["red", "reed"],
};

function closeLetters(a: string, b: string) {
  const x = canon(a).replace(/[^a-z]/g, "");
  const y = canon(b).replace(/[^a-z]/g, "");
  if (!x || !y) return false;
  if (x === y) return true;
  const n = Math.max(x.length, y.length);
  if (n < 6) return false;
  if (x[0] !== y[0]) return false;
  return levenshtein(x, y) <= 1;
}

export function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function canon(word: string) {
  const w = word.toLowerCase().replace(/'/g, "");
  return ALIASES[w] || w;
}

function stem(word: string) {
  return word.replace(/(ing|ed|es|s)$/i, "");
}

/** Chrome dictation writes letter names as a blob: "bee see" → "bcs". */
const LETTER_NAME: Record<string, string> = {
  a: "ay",
  b: "bee",
  c: "see",
  d: "dee",
  e: "ee",
  f: "eff",
  g: "gee",
  h: "aitch",
  i: "eye",
  j: "jay",
  k: "kay",
  l: "ell",
  m: "em",
  n: "en",
  o: "oh",
  p: "pee",
  q: "cue",
  r: "ar",
  s: "ess",
  t: "tee",
  u: "you",
  v: "vee",
  x: "ex",
  y: "why",
  z: "zed",
};

const NAME_LETTER: Record<string, string> = {
  ay: "a",
  bee: "b",
  be: "b",
  see: "c",
  sea: "c",
  dee: "d",
  ee: "e",
  eff: "f",
  gee: "g",
  aitch: "h",
  eye: "i",
  jay: "j",
  kay: "k",
  ell: "l",
  em: "m",
  en: "n",
  oh: "o",
  pee: "p",
  cue: "q",
  ar: "r",
  ess: "s",
  tee: "t",
  you: "u",
  vee: "v",
  ex: "x",
  why: "y",
  zed: "z",
  zee: "z",
};

function decodeLetterSalad(heard: string, _expectWords: string[]) {
  const words = tokenize(heard);
  if (!words.length || !words.every((w) => w.length === 1)) return heard;
  const compact = words.join("");
  if (compact.length < 2 || ![...compact].every((ch) => LETTER_NAME[ch])) return heard;
  return [...compact].map((ch) => LETTER_NAME[ch]).join(" ");
}

function matchWord(heard: string, expected: string) {
  const a = canon(heard);
  const b = canon(expected);
  if (!a || !b) return false;
  if (a === b) return true;
  if (b === "read" && (a === "reed" || a === "red")) return true;
  if (SOUND_ALIKES[b]?.includes(a)) return true;
  if (Math.min(a.length, b.length) >= 4) {
    const sa = stem(a);
    const sb = stem(b);
    if (sa && sa === sb && sa.length >= 4) return true;
    if (a === `${b}s` || b === `${a}s` || a === `${b}es` || b === `${a}es`) return true;
  }
  return closeLetters(a, b);
}

export type ScoreWord = { word: string; ok: boolean; pending?: boolean; soft?: boolean };
export type ScoreResult = {
  ok: boolean;
  similarity: number;
  heard: string;
  expected: string;
  missed: string[];
  extra: string[];
  words: ScoreWord[];
  tip: string;
};

function exampleFromSound(expected: string) {
  const m = expected.match(/as in\s+([a-z]+)/i);
  return m?.[1]?.toLowerCase() || "";
}

export function scoreSpeech(heard: string, expected: string, live = false): ScoreResult {
  const example = exampleFromSound(expected);
  const expectWords = example ? tokenize(example) : tokenize(expected);
  const heardWords = tokenize(decodeLetterSalad(heard, expectWords));

  const words: ScoreWord[] = [];
  const consumed = new Set<number>();
  let hi = 0;
  for (let ei = 0; ei < expectWords.length; ) {
    const exp = expectWords[ei];
    const heardNow = heardWords[hi] || "";
    if (heardNow && matchWord(heardNow, exp)) {
      words.push({ word: exp, ok: true });
      consumed.add(hi);
      ei += 1;
      hi += 1;
      continue;
    }
    if (heardNow && ei + 1 < expectWords.length) {
      const glued = `${expectWords[ei]}${expectWords[ei + 1]}`;
      if (canon(heardNow) === canon(glued)) {
        words.push({ word: expectWords[ei], ok: true });
        words.push({ word: expectWords[ei + 1], ok: true });
        consumed.add(hi);
        ei += 2;
        hi += 1;
        continue;
      }
    }
    if (heardNow && ei + 2 < expectWords.length) {
      const glued = `${expectWords[ei]}${expectWords[ei + 1]}${expectWords[ei + 2]}`;
      if (canon(heardNow) === canon(glued)) {
        words.push({ word: expectWords[ei], ok: true });
        words.push({ word: expectWords[ei + 1], ok: true });
        words.push({ word: expectWords[ei + 2], ok: true });
        consumed.add(hi);
        ei += 3;
        hi += 1;
        continue;
      }
    }
    if (heardNow && OPTIONAL.has(canon(heardNow))) {
      consumed.add(hi);
      hi += 1;
      continue;
    }
    let found = -1;
    for (let k = hi; k < heardWords.length && k < hi + 3; k++) {
      if (matchWord(heardWords[k], exp)) {
        found = k;
        break;
      }
    }
    if (found >= 0) {
      words.push({ word: exp, ok: true });
      consumed.add(found);
      ei += 1;
      hi = found + 1;
      continue;
    }
    words.push({ word: exp, ok: false, pending: live, soft: OPTIONAL.has(exp) });
    ei += 1;
  }

  const contentMissed = words.filter((w) => !w.ok && !OPTIONAL.has(w.word)).map((w) => w.word);
  const extra = heardWords
    .filter((_, i) => !consumed.has(i))
    .filter((w) => !OPTIONAL.has(canon(w)) && w.length > 1);
  const important = expectWords.filter((w) => !OPTIONAL.has(w));
  const hit = important.filter((w) => words.some((x) => x.word === w && x.ok)).length;
  const similarity = important.length ? hit / important.length : heardWords.length ? 1 : 0;
  const heardLine = heard.trim();
  const swapped = contentMissed.length > 0 && extra.length > 0;
  const ok = Boolean(heardLine) && contentMissed.length === 0;
  const nextWord = words.find((w) => !w.ok && !OPTIONAL.has(w.word))?.word;
  const skippedSmall = words.filter((w) => !w.ok && OPTIONAL.has(w.word)).map((w) => w.word);

  let tip = "";
  if (live) {
    if (!heardLine) tip = "Speak now. Words turn green as I hear them.";
    else if (ok) tip = "Lovely — that matches.";
    else if (nextWord) tip = `Not yet. Say “${nextWord}”.`;
    else tip = "Keep going…";
  } else if (!heardLine) {
    tip = "I did not catch any words. Tap Record, then say it a little louder.";
  } else if (ok && skippedSmall.length) {
    tip = `Well done! Next time you can also say: ${skippedSmall.join(", ")}.`;
  } else if (ok) {
    tip = "Well done! That was the right word.";
  } else if (swapped) {
    tip = `That was not the right word. I heard “${extra[0]}”. Please try again and say “${contentMissed[0]}”.`;
  } else if (contentMissed.length === 1) {
    tip = `Not quite. Please try again and say “${contentMissed[0]}”.`;
  } else if (contentMissed.length) {
    tip = `Not quite. Please try again. Say: ${contentMissed.join(", ")}.`;
  } else {
    tip = "Not quite — say it once more, slowly.";
  }

  return {
    ok,
    similarity,
    heard: heardLine,
    expected: expected.replace(/\s+/g, " ").trim(),
    missed: live || ok ? [] : contentMissed,
    extra,
    words,
    tip,
  };
}

function levenshtein(a: string, b: string) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return m[a.length][b.length];
}
