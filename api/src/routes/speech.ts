import { Router, type Response } from "express";
import { transcribeSpeech, sttProvider, sttReady } from "../utils/stt";
import { synthesizeSpeech, ttsConfigured, ttsReady } from "../utils/tts";

export const speechRouter = Router();

speechRouter.get("/status", (_req, res) => {
  res.json({
    ready: ttsReady(),
    configured: ttsConfigured(),
    stt: sttProvider(),
    sttReady: sttReady(),
  });
});

speechRouter.post("/transcribe", async (req, res) => {
  const audio = typeof req.body?.audio === "string" ? req.body.audio : "";
  const mime = typeof req.body?.mime === "string" ? req.body.mime : "audio/wav";
  const hint = typeof req.body?.hint === "string" ? req.body.hint : "";
  if (!audio) return res.status(400).json({ error: "Missing audio", code: "NO_AUDIO" });
  const buf = Buffer.from(audio, "base64");
  if (buf.length > 8_000_000) return res.status(413).json({ error: "Recording too long", code: "TOO_LONG" });
  try {
    const text = await transcribeSpeech(buf, mime, hint);
    if (!text) return res.status(422).json({ error: "I did not catch any words", code: "NO_SPEECH" });
    return res.json({ text, provider: sttProvider() });
  } catch (e: any) {
    console.error("[stt]", e.message || e);
    const status = e.status === 400 || e.status === 503 || e.status === 429 ? e.status : 502;
    return res.status(status).json({ error: e.message || "Could not transcribe speech", code: "TRANSCRIBE_FAILED" });
  }
});

async function sendMp3(text: string, style: string, res: Response) {
  if (!ttsReady()) {
    return res.status(503).json({ error: "Natural voice is not available right now", code: "TTS_UNAVAILABLE" });
  }
  try {
    const mp3 = await synthesizeSpeech(text, style);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Accept-Ranges", "bytes");
    return res.send(mp3);
  } catch (e: any) {
    console.error("[tts]", e.message || e);
    const status = e.status === 503 ? 503 : 502;
    return res.status(status).json({ error: e.message || "Could not make speech" });
  }
}

speechRouter.get("/", async (req, res) => {
  const text = typeof req.query.text === "string" ? req.query.text : "";
  const style = typeof req.query.style === "string" ? req.query.style : "sentence";
  return sendMp3(text, style, res);
});

speechRouter.post("/", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  const style = typeof req.body?.style === "string" ? req.body.style : "sentence";
  return sendMp3(text, style, res);
});
