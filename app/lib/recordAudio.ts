import { Platform } from "react-native";
import { API_URL } from "@/constants/theme";

export type RecordSession = {
  stop: () => void;
  done: Promise<{ base64: string; mime: string }>;
};

function pickMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      const comma = raw.indexOf(",");
      resolve(comma >= 0 ? raw.slice(comma + 1) : raw);
    };
    reader.onerror = () => reject(new Error("LISTEN_FAILED"));
    reader.readAsDataURL(blob);
  });
}

function rmsFromAnalyser(analyser: AnalyserNode, buf: Uint8Array) {
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buf.length);
}

export function canRecordAudio() {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  return Boolean(navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined");
}

/** Record until a real pause after speech, then return an audio clip. */
export function recordUtterance(opts?: {
  silenceMs?: number;
  minListenMs?: number;
  timeoutMs?: number;
  onLevel?: (level: number) => void;
  onReady?: () => void;
}): RecordSession {
  const silenceMs = opts?.silenceMs ?? 2000;
  const minListenMs = opts?.minListenMs ?? 1200;
  const timeoutMs = opts?.timeoutMs ?? 25000;
  let cancelled = false;
  let stopRecorder = () => undefined;

  const done = (async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
    });
    if (cancelled) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error("NO_SPEECH");
    }

    const mime = pickMime();
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const parts: Blob[] = [];
    rec.ondataavailable = (event) => {
      if (event.data && event.data.size) parts.push(event.data);
    };

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") await ctx.resume();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const levelBuf = new Uint8Array(analyser.fftSize);

    rec.start(120);
    opts?.onReady?.();
    const startedAt = Date.now();
    let spoken = false;
    let lastLoud = Date.now();

    const clip = await new Promise<{ base64: string; mime: string }>((resolve, reject) => {
      const finish = () => {
        clearInterval(tick);
        if (rec.state !== "inactive") {
          try {
            rec.requestData();
          } catch {
            /* ignore */
          }
          rec.stop();
        }
      };

      rec.onerror = () => {
        clearInterval(tick);
        reject(new Error("LISTEN_FAILED"));
      };
      rec.onstop = () => {
        clearInterval(tick);
        const type = rec.mimeType || mime || "audio/webm";
        const blob = new Blob(parts, { type });
        void (async () => {
          try {
            stream.getTracks().forEach((t) => t.stop());
            source.disconnect();
            analyser.disconnect();
            await ctx.close();
          } catch {
            /* ignore */
          }
          if (blob.size < 600) {
            reject(new Error("NO_SPEECH"));
            return;
          }
          try {
            resolve({ base64: await blobToBase64(blob), mime: type });
          } catch (err) {
            reject(err);
          }
        })();
      };

      const tick = setInterval(() => {
        const level = rmsFromAnalyser(analyser, levelBuf);
        opts?.onLevel?.(level);
        if (level > 0.012) {
          spoken = true;
          lastLoud = Date.now();
        }
        const elapsed = Date.now() - startedAt;
        if (elapsed > timeoutMs) {
          finish();
          return;
        }
        if (spoken && elapsed >= minListenMs && Date.now() - lastLoud >= silenceMs) finish();
      }, 80);

      stopRecorder = finish;
      if (cancelled) finish();
    });

    return clip;
  })();

  return {
    stop: () => {
      cancelled = true;
      stopRecorder();
    },
    done,
  };
}

export async function transcribeClip(base64: string, mime: string, hint: string) {
  const res = await fetch(`${API_URL}/speech/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio: base64, mime, hint }),
  });
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string; code?: string };
  if (!res.ok || !data.text) throw new Error(data.code || data.error || "TRANSCRIBE_FAILED");
  return data.text.trim();
}
