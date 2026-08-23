import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors, fonts, radii } from "@/constants/theme";
import {
  canListen,
  listenBlockMessage,
  listenLive,
  prefetchClip,
  prefetchSpeech,
  scoreSpeech,
  speak,
  stopSpeaking,
  tokenize,
  whisperAvailable,
  type ScoreResult,
  type SpeakStyle,
} from "@/lib/speech";
import { canRecordAudio, recordUtterance, transcribeClip } from "@/lib/recordAudio";
import { BouncePress } from "@/components/game/BouncePress";
import { useProgress } from "@/context/ProgressContext";
import { playSfx } from "@/lib/sfx";

function howTo(style?: SpeakStyle) {
  if (style === "sound") return "Hear, then record the sound and the example.";
  if (style === "word") return "Hear, then say only that word.";
  return "Hear, then say the whole line.";
}

function LiveDot({ on }: { on: boolean }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!on) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(withTiming(0.35, { duration: 420, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [on, pulse]);
  const style = useAnimatedStyle(() => ({ opacity: on ? pulse.value : 1 }));
  return <Animated.View style={[styles.liveDot, style]} />;
}

function WordChip({
  word,
  ok,
  waiting,
  softMiss,
  isNext,
}: {
  word: string;
  ok: boolean;
  waiting: boolean;
  softMiss: boolean;
  isNext: boolean;
}) {
  const pop = useSharedValue(1);
  useEffect(() => {
    if (!ok) return;
    pop.value = withSequence(
      withTiming(1.14, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) })
    );
  }, [ok, pop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <Animated.View
      style={[
        styles.chip,
        ok ? styles.chipOk : waiting ? styles.chipWait : softMiss ? styles.chipSoft : styles.chipBad,
        isNext && styles.chipNow,
        style,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          ok ? styles.chipTextOk : waiting ? styles.chipTextWait : softMiss ? styles.chipTextSoft : styles.chipTextBad,
        ]}
      >
        {word}
      </Text>
    </Animated.View>
  );
}

export function SpeakPractice({
  target,
  playLabel = "Hear it",
  playText,
  style,
  blend,
  onClear,
  onResult,
}: {
  target: string;
  playLabel?: string;
  playText?: string;
  style?: SpeakStyle;
  blend?: string;
  onClear?: () => void;
  onResult?: (result: { ok: boolean; missed: string[] }) => void;
}) {
  const [status, setStatus] = useState<"idle" | "listening" | "checking" | "ok" | "retry">("idle");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [note, setNote] = useState(howTo(style));
  const [whisperOk, setWhisperOk] = useState(false);
  const [level, setLevel] = useState(0);
  const { hitGame } = useProgress();
  const listeningOk = canListen();
  const blockedMsg = listenBlockMessage();
  const useWhisper = whisperOk && canRecordAudio() && !blockedMsg;
  const sessionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    void whisperAvailable().then(setWhisperOk);
  }, [target]);

  useEffect(() => {
    prefetchSpeech();
    const text = playText || target;
    const words = tokenize(text).length;
    const nextStyle: SpeakStyle = style || (playText ? "sound" : words <= 2 ? "word" : "sentence");
    prefetchClip(text, nextStyle, { blend });
    sessionRef.current?.stop();
    sessionRef.current = null;
    setStatus("idle");
    setResult(null);
    setLevel(0);
    setNote(listenBlockMessage() || howTo(style));
  }, [target, playText, style, blend]);

  useEffect(() => () => sessionRef.current?.stop(), []);

  async function play() {
    stopSpeaking();
    const text = playText || target;
    const words = tokenize(text).length;
    const nextStyle: SpeakStyle = style || (playText ? "sound" : words <= 2 ? "word" : "sentence");
    speak(text, nextStyle, { blend });
    if (status === "idle") setNote("Now tap Record and say it clearly.");
  }

  function finishScore(heard: string) {
    const next = scoreSpeech(heard, target, false);
    setResult(next);
    setNote(next.tip);
    setStatus(next.ok ? "ok" : "retry");
    onResult?.(next);
    if (next.ok) {
      hitGame(true);
      onClear?.();
      setNote("You did it! Tap Next.");
    } else {
      hitGame(false);
    }
  }

  function failListen(code: string) {
    hitGame(false);
    setStatus("retry");
    if (code === "NO_SPEECH") {
      setResult(scoreSpeech("", target, false));
      setNote("I did not hear you. Tap Record, then talk a little louder.");
    } else if (code === "LISTEN_BLOCKED") {
      setResult(null);
      setNote(listenBlockMessage() || "Chrome blocked the microphone. Allow the mic for this site, then tap Record.");
    } else {
      setResult(null);
      setNote("Could not check your voice. Allow the microphone, then try Record again.");
    }
  }

  async function listenWithWhisper() {
    const long = (style || "sentence") === "sentence";
    const captions = listenLive(
      (text) => {
        const live = scoreSpeech(text, target, true);
        setResult(live);
        setNote(text ? live.tip : "Speak now. Words turn green as I hear them.");
      },
      {
        timeoutMs: long ? 30000 : 14000,
        silenceMs: long ? 2000 : 1200,
        minListenMs: long ? 1800 : 800,
        phrase: target,
      }
    );
    const recorder = recordUtterance({
      timeoutMs: 60000,
      silenceMs: 60_000,
      minListenMs: 60_000,
      onLevel: setLevel,
    });
    sessionRef.current = {
      stop: () => {
        captions.stop();
        recorder.stop();
      },
    };
    let heardLive = "";
    try {
      heardLive = await captions.done;
    } catch {
      heardLive = "";
    }
    recorder.stop();
    sessionRef.current = null;
    setLevel(0);
    setStatus("checking");
    setNote("Checking what you said…");
    let clip: { base64: string; mime: string } | null = null;
    try {
      clip = await recorder.done;
    } catch {
      clip = null;
    }
    let heard = heardLive;
    if (clip?.base64) {
      try {
        heard = (await transcribeClip(clip.base64, clip.mime, target)) || heardLive;
      } catch {
        heard = heardLive;
      }
    }
    if (!heard) throw new Error("NO_SPEECH");
    finishScore(heard);
  }

  async function listenWithBrowser() {
    const long = (style || "sentence") === "sentence";
    const session = listenLive(
      (text) => {
        const live = scoreSpeech(text, target, true);
        setResult(live);
        setNote(live.tip);
      },
      { timeoutMs: long ? 30000 : 12000, silenceMs: long ? 2200 : 1600, minListenMs: long ? 2500 : 1800, phrase: target }
    );
    sessionRef.current = session;
    const heard = await session.done;
    sessionRef.current = null;
    finishScore(heard);
  }

  async function repeatIt() {
    if (status === "listening") {
      sessionRef.current?.stop();
      return;
    }
    if (status === "checking") return;
    if (!listeningOk || blockedMsg) {
      setStatus("retry");
      setResult(null);
      setNote(blockedMsg || "This screen cannot score your voice. Use Chrome or Edge, tap Hear it, then Record.");
      onResult?.({ ok: false, missed: tokenize(target) });
      playSfx("miss");
      return;
    }
    stopSpeaking();
    playSfx("record");
    await new Promise((r) => setTimeout(r, 120));
    const preview = scoreSpeech("", target, true);
    setStatus("listening");
    setResult(preview);
    setLevel(0);
    setNote("Speak now. Words turn green as I hear them. Pause or tap Stop when you finish.");
    try {
      if (useWhisper) await listenWithWhisper();
      else await listenWithBrowser();
    } catch (err) {
      sessionRef.current = null;
      const name = String((err as { name?: string })?.name || "");
      const code = String((err as Error)?.message || "");
      if (name === "NotAllowedError" || name === "NotFoundError" || name === "NotReadableError") {
        failListen("LISTEN_BLOCKED");
      } else if (code === "TRANSCRIBE_FAILED" || /whisper|transcribe|GROQ/i.test(code)) {
        hitGame(false);
        setStatus("retry");
        setResult(null);
        setNote("I recorded you, but could not check the words. Keep the API running, then try Record again.");
      } else {
        failListen(code);
      }
    }
  }

  const nextIndex = result?.words.findIndex((w) => !w.ok && !w.soft) ?? -1;
  const hit = result?.words.filter((w) => w.ok).length || 0;
  const total = result?.words.length || 0;

  return (
    <View>
      <View style={styles.row}>
        <BouncePress sound={false} onPress={play} disabled={status === "listening" || status === "checking"} style={[styles.btn, styles.play, (status === "listening" || status === "checking") && styles.btnOff]}>
          <View style={styles.btnInner}>
            <Ionicons name="volume-high-outline" size={18} color={colors.navy} />
            <Text style={styles.btnText}>{playLabel}</Text>
          </View>
        </BouncePress>
        <BouncePress sound={false} onPress={repeatIt} disabled={status === "checking"} style={[styles.btn, status === "listening" ? styles.stop : styles.repeat, status === "checking" && styles.btnOff]}>
          <View style={styles.btnInner}>
            {status === "listening" ? (
              <Ionicons name="stop" size={18} color={colors.white} />
            ) : (
              <Ionicons name="mic" size={18} color={colors.white} />
            )}
            <Text style={[styles.btnText, { color: colors.white }]}>
              {status === "listening" ? "Stop" : status === "checking" ? "Checking" : "Record"}
            </Text>
          </View>
        </BouncePress>
      </View>
      {status === "idle" ? <Text style={styles.idle}>{note}</Text> : null}
      {status !== "idle" ? (
        <Animated.View
          entering={FadeIn.duration(140)}
          style={[
            styles.banner,
            status === "listening" || status === "checking" ? styles.live : status === "ok" ? styles.ok : styles.bad,
          ]}
        >
          {status === "listening" || status === "checking" ? (
            <View style={styles.liveHead}>
              <LiveDot on={status === "listening"} />
              <Text style={styles.liveLabel}>{status === "checking" ? "Checking" : "Listening"}</Text>
              {status === "listening" ? (
                <View style={styles.meter}>
                  <View style={[styles.meterFill, { width: `${Math.min(100, Math.round(level * 900))}%` }]} />
                </View>
              ) : null}
              {total ? (
                <Text style={styles.liveCount}>
                  {hit}/{total}
                </Text>
              ) : null}
            </View>
          ) : null}
          {result?.words.length ? (
            <View style={styles.chips}>
              {result.words.map((w, i) => {
                const isNext = status === "listening" && i === nextIndex;
                const waiting = w.pending || status === "listening" || status === "checking";
                const softMiss = !w.ok && !waiting && w.soft;
                return (
                  <WordChip
                    key={`${w.word}-${i}`}
                    word={w.word}
                    ok={w.ok}
                    waiting={waiting}
                    softMiss={softMiss}
                    isNext={isNext}
                  />
                );
              })}
            </View>
          ) : (
            <Text style={styles.bannerText}>{note}</Text>
          )}
          {status === "retry" && result?.missed.length ? (
            <Text style={styles.fix}>Include: {result.missed.join(", ")}</Text>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: radii.button,
    justifyContent: "center",
  },
  btnInner: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnOff: { opacity: 0.45 },
  play: { backgroundColor: colors.practiceYellow, borderWidth: 1, borderColor: "#F0D24A" },
  repeat: { backgroundColor: colors.navy },
  stop: { backgroundColor: colors.nameRed },
  btnText: { fontFamily: fonts.bold, color: colors.navy, fontSize: 14 },
  idle: {
    marginTop: 8,
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
  },
  banner: { marginTop: 10, borderRadius: radii.card, padding: 10 },
  live: { backgroundColor: "#FFF8E1", borderWidth: 1, borderColor: colors.yellow },
  ok: { backgroundColor: colors.successBg },
  bad: { backgroundColor: "#FDECEA" },
  liveHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.nameRed },
  liveLabel: { fontFamily: fonts.bold, color: colors.navy, fontSize: 12 },
  meter: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F0E6A8",
    overflow: "hidden",
  },
  meterFill: { height: 6, borderRadius: 3, backgroundColor: colors.nameRed },
  liveCount: { fontFamily: fonts.bold, color: colors.navy, fontSize: 12 },
  bannerText: { fontFamily: fonts.medium, color: colors.navy, fontSize: 13, lineHeight: 19 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 4 },
  chipOk: { backgroundColor: "#C8E6C9" },
  chipWait: { backgroundColor: "#EEF2F7" },
  chipNow: { borderWidth: 1.5, borderColor: colors.yellow, backgroundColor: colors.practiceYellow },
  chipSoft: { backgroundColor: "#FFF3C4" },
  chipBad: { backgroundColor: "#FFCDD2" },
  chipText: { fontFamily: fonts.bold, fontSize: 13, textTransform: "lowercase" },
  chipTextOk: { color: colors.successText },
  chipTextWait: { color: colors.muted },
  chipTextSoft: { color: "#9A7200" },
  chipTextBad: { color: colors.nameRed },
  fix: { marginTop: 8, fontFamily: fonts.bold, color: colors.nameRed, fontSize: 13, lineHeight: 18 },
});
