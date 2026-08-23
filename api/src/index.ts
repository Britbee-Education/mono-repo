import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { connectDb } from "./db";
import { authRouter } from "./routes/auth";
import { speechRouter } from "./routes/speech";
import { guideRouter } from "./routes/guide";
import { progressRouter } from "./routes/progress";
import { notifyRouter } from "./routes/notify";
import { billingRouter } from "./routes/billing";
import { startNotifyTick } from "./notifyTick";
import { memoryDb } from "./memory";
import { ttsProvider } from "./utils/tts";
import { sttReady } from "./utils/stt";
import { apiIndexHtml } from "@britbee/config";

const PORT = Number(process.env.API_PORT || 3001);
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/britbee";

async function main() {
  if (memoryDb.enabled) {
    const passwordHash = await bcrypt.hash("password123", 10);
    await memoryDb.seedDefaults(passwordHash);
    console.log("[api] MEMORY_DB mode — file-backed store (survives API restarts)");
    console.log(`[api] users file: ${memoryDb.filePath} (${memoryDb.count()} accounts)`);
  } else {
    await connectDb(MONGODB_URI);
  }

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "12mb" }));
  app.use("/assets", express.static(path.resolve(process.cwd(), "../app/assets")));
  app.use((_req, res, next) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    next();
  });

  app.get("/", (_req, res) => {
    res.type("html").send(apiIndexHtml());
  });
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send("User-agent: *\nDisallow: /\n");
  });

  app.get("/health", (_req, res) =>
    res.json({
      ok: true,
      service: "britbee-api",
      memory: memoryDb.enabled,
      persist: memoryDb.enabled ? memoryDb.filePath : "mongodb",
      accounts: memoryDb.enabled ? memoryDb.count() : undefined,
    })
  );
  app.use("/auth", authRouter);
  app.use("/speech", speechRouter);
  app.use("/guide", guideRouter);
  app.use("/progress", progressRouter);
  app.use("/notifications", notifyRouter);
  app.use("/billing", billingRouter);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[api] listening on http://localhost:${PORT}`);
    console.log(`[api] on your LAN use http://<your-mac-ip>:${PORT}`);
    const hanuReady = Boolean(process.env.HANU_OTP_API_KEY && process.env.HANU_OTP_TEMPLATE_SID);
    console.log(`[api] Natural TTS: ${ttsProvider() === "edge" ? "Microsoft Sonia (free, no API key)" : "OpenAI"}`);
    console.log(
      `[api] Listen: ${sttReady() ? "Groq Whisper" : "browser (add GROQ_API_KEY for better phonics scoring)"}`
    );
    console.log(
      `[api] Hanu OTP: ${hanuReady ? "configured" : "devOtp mode"}` +
        (!process.env.HANU_OTP_API_KEY ? " (missing HANU_OTP_API_KEY)" : "") +
        (process.env.HANU_OTP_API_KEY && !process.env.HANU_OTP_TEMPLATE_SID
          ? " (missing HANU_OTP_TEMPLATE_SID)"
          : "")
    );
    startNotifyTick();
    console.log("[api] Notifications: in-app inbox (FCM-free), daily tick every 30s IST");
  });
}

main().catch((err) => {
  console.error("[api] failed to start", err);
  process.exit(1);
});
