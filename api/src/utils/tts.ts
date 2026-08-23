import crypto from "crypto";
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { Readable } from "stream";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const CACHE_DIR = path.resolve(__dirname, "../../data/speech-cache");
const PHONEME_DIR = path.resolve(__dirname, "../../assets/phonemes");
const VERSION = "edge-v6-phonemes";
const VOICE = process.env.EDGE_TTS_VOICE || "en-GB-SoniaNeural";

const RATES: Record<string, number> = {
  word: 0.88,
  sound: 0.9,
  sentence: 0.94,
  coach: 0.98,
};

const OPENAI_INSTRUCTIONS: Record<string, string> = {
  sound:
    "Affect: a warm British woman speaking to a child she likes. Natural and human, never robotic.",
  word: "Affect: a warm British woman speaking one word to a child. Natural, human, never robotic.",
  sentence: "Affect: a warm British woman reading to a child. Natural connected speech, never robotic.",
  coach: "Affect: a warm British woman. Short, natural encouragement.",
};

const SOUND_FILE: Record<string, string> = {
  "short a": "short-a",
  "short e": "short-e",
  "short i": "short-i",
  "short o": "short-o",
  "short u": "short-u",
  "long a": "long-a",
  "long e": "long-e",
  "long i": "long-i",
  "long o": "long-o",
  "long u": "long-u",
  p: "p",
  t: "t",
  k: "k",
  f: "f",
  s: "s",
  sh: "sh",
  ch: "ch",
  "unvoiced th": "th-unvoiced",
  b: "b",
  d: "d",
  g: "g",
  v: "v",
  z: "z",
  j: "j",
  "voiced th": "th-voiced",
  m: "m",
  n: "n",
  l: "l",
  r: "r",
};

const FFMPEG_BINS = ["ffmpeg", "/opt/homebrew/bin/ffmpeg", "/usr/bin/ffmpeg"];

let lastFailureAt = 0;
let lastFailureKind = "";
let edgeLock: Promise<unknown> = Promise.resolve();

export function ttsConfigured() {
  return true;
}

export function ttsReady() {
  if (lastFailureKind === "edge" && Date.now() - lastFailureAt < 2_000) return false;
  return true;
}

export function ttsProvider() {
  return "edge";
}

function parseSoundLine(text: string) {
  const m = text.replace(/[.]+$/g, "").trim().match(/^(.*?),\s*as in\s+(.+)$/i);
  if (!m) return null;
  const label = m[1].trim().toLowerCase();
  const word = m[2].trim();
  const file = SOUND_FILE[label];
  if (!file) return null;
  return { file, word };
}

function cachePath(text: string, style: string) {
  const rate = RATES[style] ?? RATES.sentence;
  const key = crypto.createHash("sha256").update(`${VERSION}|${VOICE}|${rate}|${style}|${text}`).digest("hex");
  return path.join(CACHE_DIR, `${key}.mp3`);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function streamToBuffer(stream: Readable) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(Buffer.concat(chunks));
    };
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.once("end", finish);
    stream.once("close", finish);
    stream.once("error", (err) => {
      if (done) return;
      done = true;
      reject(err);
    });
  });
}

function runFfmpeg(bin: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    proc.stderr.on("data", (d) => {
      err += String(d);
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim().split("\n").slice(-3).join(" ") || `ffmpeg ${code}`));
    });
  });
}

async function glueMp3(chunks: Buffer[]) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "britbee-tts-"));
  try {
    const files = chunks.map((buf, i) => {
      const file = path.join(dir, `${i}.mp3`);
      fs.writeFileSync(file, buf);
      return file;
    });
    const list = path.join(dir, "list.txt");
    fs.writeFileSync(list, files.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n"));
    const out = path.join(dir, "out.mp3");
    let lastErr: Error | null = null;
    for (const bin of FFMPEG_BINS) {
      try {
        await runFfmpeg(bin, ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", out]);
        return fs.readFileSync(out);
      } catch (e) {
        lastErr = e as Error;
        try {
          await runFfmpeg(bin, ["-y", "-f", "concat", "-safe", "0", "-i", list, "-ar", "24000", "-ac", "1", "-b:a", "96k", out]);
          return fs.readFileSync(out);
        } catch (e2) {
          lastErr = e2 as Error;
        }
      }
    }
    if (lastErr && /ENOENT/.test(lastErr.message)) return Buffer.concat(chunks);
    if (fs.existsSync(out) && fs.statSync(out).size) return fs.readFileSync(out);
    return Buffer.concat(chunks);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function synthesizeEdge(text: string, style: string) {
  const run = async () => {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(escapeXml(text), {
      rate: RATES[style] ?? RATES.sentence,
    });
    const buf = await streamToBuffer(audioStream as Readable);
    tts.close();
    if (!buf.length) throw new Error("Empty Edge TTS audio");
    return buf;
  };
  const pending = edgeLock.then(run, run);
  edgeLock = pending.then(
    () => undefined,
    () => undefined
  );
  return pending;
}

async function synthesizeSound(text: string) {
  const parsed = parseSoundLine(text);
  if (!parsed) return synthesizeEdge(text, "sound");
  const phonemePath = path.join(PHONEME_DIR, `${parsed.file}.mp3`);
  const pausePath = path.join(PHONEME_DIR, "_pause.mp3");
  if (!fs.existsSync(phonemePath)) return synthesizeEdge(parsed.word, "word");
  const phoneme = fs.readFileSync(phonemePath);
  const pause = fs.existsSync(pausePath) ? fs.readFileSync(pausePath) : Buffer.alloc(0);
  const word = await synthesizeEdge(`${parsed.word}.`, "word");
  return glueMp3(pause.length ? [phoneme, pause, word] : [phoneme, word]);
}

async function synthesizeOpenAI(text: string, style: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: process.env.OPENAI_TTS_VOICE || "coral",
      input: text,
      instructions: OPENAI_INSTRUCTIONS[style] || OPENAI_INSTRUCTIONS.sentence,
      response_format: "mp3",
      speed: 0.97,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    if (/quota|billing|exceeded|insufficient/i.test(err)) lastFailureKind = "quota";
    return null;
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function synthesizeSpeech(text: string, style = "sentence") {
  const input = text.replace(/\s+/g, " ").trim().slice(0, 4000);
  if (!input) throw new Error("Nothing to say");
  const file = cachePath(input, style);
  if (fs.existsSync(file)) return fs.readFileSync(file);

  let buf: Buffer | null = null;
  try {
    buf = style === "sound" ? await synthesizeSound(input) : await synthesizeEdge(input, style);
    lastFailureKind = "";
  } catch (e) {
    lastFailureAt = Date.now();
    lastFailureKind = "edge";
    console.error("[tts] Edge voice failed, trying fallback", (e as Error).message || e);
    buf = await synthesizeOpenAI(input, style);
  }

  if (!buf?.length) {
    const err = new Error("Could not make speech") as Error & { status?: number };
    err.status = 503;
    throw err;
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(file, buf);
  return buf;
}
