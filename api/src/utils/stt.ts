export function sttProvider() {
  if (process.env.GROQ_API_KEY) return "groq-whisper";
  if (process.env.OPENAI_API_KEY) return "openai-whisper";
  return "none";
}

export function sttReady() {
  return Boolean(process.env.GROQ_API_KEY);
}

function hintPrompt(_hint: string) {
  return "British English. A child speaking slowly, word by word. Transcribe exactly the words that were spoken. Do not correct or replace them.";
}

async function transcribeOpenAICompat(url: string, apiKey: string, model: string, buf: Buffer, mime: string, hint: string) {
  const form = new FormData();
  const name = mime.includes("wav") ? "speech.wav" : mime.includes("mp4") ? "speech.m4a" : "speech.webm";
  const file = new File([new Uint8Array(buf)], name, { type: mime || "audio/wav" });
  form.append("file", file);
  form.append("model", model);
  form.append("language", "en");
  form.append("prompt", hintPrompt(hint));
  form.append("response_format", "json");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: { message?: string } };
  if (!res.ok || !data.text) {
    const err = new Error(data.error?.message || "Whisper failed") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data.text.trim();
}

export async function transcribeSpeech(buf: Buffer, mime = "audio/wav", hint = "") {
  if (!buf.length) {
    const err = new Error("Empty recording") as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  const groq = process.env.GROQ_API_KEY;
  if (groq) {
    return transcribeOpenAICompat(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      groq,
      process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo",
      buf,
      mime,
      hint
    );
  }

  const openai = process.env.OPENAI_API_KEY;
  if (openai) {
    return transcribeOpenAICompat(
      "https://api.openai.com/v1/audio/transcriptions",
      openai,
      "whisper-1",
      buf,
      mime,
      hint
    );
  }

  const err = new Error("No Whisper key. Add a free GROQ_API_KEY from console.groq.com") as Error & { status?: number };
  err.status = 503;
  throw err;
}
