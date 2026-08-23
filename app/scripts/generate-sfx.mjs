import { writeFileSync, mkdirSync, unlinkSync } from "fs";
import { execFileSync } from "child_process";
import { join } from "path";

const SR = 22050;
const dir = join(new URL("..", import.meta.url).pathname, "assets/sfx");
mkdirSync(dir, { recursive: true });

function env(i, n, attack = 0.008, release = 0.06) {
  const t = i / SR;
  const dur = n / SR;
  const a = Math.min(attack, dur / 4);
  const r = Math.min(release, dur / 2);
  if (t < a) return t / a;
  if (t > dur - r) return Math.max(0, (dur - t) / r);
  return 1;
}

function tone(freq, dur, vol = 0.28, type = "sine") {
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = Math.sin(2 * Math.PI * freq * t);
    if (type === "tri") s = 2 * Math.abs(2 * ((t * freq) % 1) - 1) - 1;
    if (type === "sq") s = s > 0 ? 1 : -1;
    out[i] = s * vol * env(i, n);
  }
  return out;
}

function silence(dur) {
  return new Float32Array(Math.floor(SR * dur));
}

function concat(parts) {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Float32Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function mix(parts) {
  const n = Math.max(...parts.map((p) => p.length));
  const out = new Float32Array(n);
  for (const p of parts) {
    for (let i = 0; i < p.length; i++) out[i] += p[i];
  }
  let peak = 0.001;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0.9) {
    const g = 0.9 / peak;
    for (let i = 0; i < n; i++) out[i] *= g;
  }
  return out;
}

function sweep(from, to, dur, vol = 0.22) {
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const f = from + (to - from) * (i / n);
    phase += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(phase) * vol * env(i, n, 0.01, 0.08);
  }
  return out;
}

function writeWav(name, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((v * 32767) | 0, 44 + i * 2);
  }
  const wav = join(dir, `${name}.wav`);
  writeFileSync(wav, buf);
  execFileSync("ffmpeg", ["-y", "-i", wav, "-q:a", "6", join(dir, `${name}.mp3`)], { stdio: "ignore" });
  unlinkSync(wav);
}

const clips = {
  tap: tone(1320, 0.045, 0.16, "tri"),
  record: concat([tone(880, 0.07, 0.2), tone(1320, 0.08, 0.22)]),
  ok: concat([tone(523.25, 0.09, 0.24), tone(659.25, 0.09, 0.24), tone(783.99, 0.14, 0.26)]),
  miss: mix([tone(196, 0.18, 0.2), tone(147, 0.18, 0.12)]),
  star: concat([tone(1568, 0.07, 0.2), tone(2093, 0.1, 0.22)]),
  combo: concat([
    tone(392, 0.08, 0.2),
    tone(523.25, 0.08, 0.22),
    tone(659.25, 0.08, 0.22),
    tone(783.99, 0.16, 0.26),
  ]),
  fanfare: concat([
    tone(523.25, 0.1, 0.24),
    tone(659.25, 0.1, 0.24),
    tone(783.99, 0.1, 0.24),
    mix([tone(1046.5, 0.28, 0.22), tone(1318.5, 0.28, 0.12)]),
  ]),
  coin: concat([tone(988, 0.07, 0.2), tone(1318.5, 0.12, 0.24)]),
  buzz: mix([sweep(220, 310, 0.22, 0.16), sweep(440, 520, 0.22, 0.08)]),
  unlock: concat([tone(659.25, 0.1, 0.2), tone(783.99, 0.1, 0.22), tone(1046.5, 0.18, 0.26)]),
};

for (const [name, samples] of Object.entries(clips)) writeWav(name, samples);
console.log("sfx", Object.keys(clips).join(", "));
