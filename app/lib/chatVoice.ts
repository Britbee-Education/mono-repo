import { Audio } from "expo-av";
import { Platform } from "react-native";
import { API_URL } from "@/constants/theme";
import { api } from "@/lib/api";
import { listenBlockReason } from "@/lib/speech";

let recording: Audio.Recording | null = null;

export type VoiceCaptureResult = {
  text: string;
  sec: number;
  voiceUrl: string;
  voiceMime?: string;
};

export type VoiceCaptureSession = {
  stop: () => void;
  done: Promise<VoiceCaptureResult>;
};

export function canRecordVoice() {
  if (Platform.OS === "web") {
    return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && !listenBlockReason();
  }
  return true;
}

async function ensureRecordingMode() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

async function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      resolve(raw.includes(",") ? raw.split(",")[1] : raw);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function transcribeBlob(blob: Blob, mime: string) {
  try {
    const audio = await blobToBase64(blob);
    const res = await fetch(`${API_URL}/speech/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio, mime }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return "";
    return String(data.text || "").trim();
  } catch {
    return "";
  }
}

async function transcribeUri(uri: string, mime: string) {
  const resp = await fetch(uri);
  const blob = await resp.blob();
  return transcribeBlob(blob, mime);
}

async function uploadVoiceBlob(blob: Blob, name: string, mime: string) {
  const form = new FormData();
  form.append("file", blob, name);
  return api.chatVoiceUpload(form);
}

async function uploadVoiceUri(uri: string, name: string, mime: string) {
  const form = new FormData();
  if (Platform.OS === "web") {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    form.append("file", blob, name);
  } else {
    form.append("file", {
      uri,
      name,
      type: mime,
    } as unknown as Blob);
  }
  return api.chatVoiceUpload(form);
}

async function finalizeVoice(opts: {
  uri?: string;
  blob?: Blob;
  name: string;
  mime: string;
  sec: number;
}): Promise<VoiceCaptureResult> {
  const uploaded = opts.blob
    ? await uploadVoiceBlob(opts.blob, opts.name, opts.mime)
    : opts.uri
      ? await uploadVoiceUri(opts.uri, opts.name, opts.mime)
      : null;
  if (!uploaded?.voiceUrl) throw new Error("Could not upload voice note.");

  let text = "";
  if (opts.blob) text = await transcribeBlob(opts.blob, opts.mime);
  else if (opts.uri) text = await transcribeUri(opts.uri, opts.mime);

  return {
    text: text || "Voice note",
    sec: opts.sec,
    voiceUrl: uploaded.voiceUrl,
    voiceMime: uploaded.voiceMime || opts.mime,
  };
}

function startWebVoiceCapture(onPartial?: (text: string) => void): VoiceCaptureSession {
  let mediaRecorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  const chunks: BlobPart[] = [];
  const started = Date.now();
  let finished = false;
  let resolveDone!: (value: VoiceCaptureResult) => void;
  let rejectDone!: (reason?: unknown) => void;
  const done = new Promise<VoiceCaptureResult>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });

  void (async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";
      mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      mediaRecorder.start(250);
      onPartial?.("Recording…");
    } catch (e) {
      rejectDone(e);
      finished = true;
    }
  })();

  return {
    stop: () => {
      if (finished) return;
      finished = true;
      void (async () => {
        try {
          if (!mediaRecorder || mediaRecorder.state === "inactive") throw new Error("NO_RECORDING");
          await new Promise<void>((resolve) => {
            mediaRecorder!.onstop = () => resolve();
            mediaRecorder!.stop();
          });
          stream?.getTracks().forEach((track) => track.stop());
          const mime = mediaRecorder.mimeType || "audio/webm";
          const blob = new Blob(chunks, { type: mime });
          if (!blob.size) throw new Error("NO_AUDIO");
          const sec = Math.max(1, Math.round((Date.now() - started) / 1000));
          resolveDone(
            await finalizeVoice({
              blob,
              name: mime.includes("webm") ? "voice.webm" : "voice.m4a",
              mime,
              sec,
            })
          );
        } catch (e) {
          stream?.getTracks().forEach((track) => track.stop());
          rejectDone(e);
        }
      })();
    },
    done,
  };
}

export function startVoiceCapture(onPartial?: (text: string) => void): VoiceCaptureSession {
  if (Platform.OS === "web") return startWebVoiceCapture(onPartial);

  let finished = false;
  let resolveDone!: (value: VoiceCaptureResult) => void;
  let rejectDone!: (reason?: unknown) => void;
  const done = new Promise<VoiceCaptureResult>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });
  const started = Date.now();

  void (async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== "granted") throw new Error("Microphone permission is required.");
      await ensureRecordingMode();
      recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      onPartial?.("Recording…");
    } catch (e) {
      rejectDone(e);
      finished = true;
    }
  })();

  return {
    stop: () => {
      if (finished) return;
      finished = true;
      void (async () => {
        const active = recording;
        recording = null;
        try {
          if (!active) throw new Error("Recording did not start.");
          const status = await active.getStatusAsync();
          await active.stopAndUnloadAsync();
          const uri = active.getURI();
          const sec = Math.max(
            1,
            Math.round(((status.durationMillis || Date.now() - started) as number) / 1000)
          );
          if (!uri) throw new Error("Could not save recording.");
          const mime = Platform.OS === "ios" ? "audio/m4a" : "audio/mp4";
          resolveDone(
            await finalizeVoice({
              uri,
              name: Platform.OS === "ios" ? "voice.m4a" : "voice.mp4",
              mime,
              sec,
            })
          );
        } catch (e) {
          rejectDone(e);
        }
      })();
    },
    done,
  };
}
