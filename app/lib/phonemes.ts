export const SOUND_FILE: Record<string, string> = {
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

export const PHONEME_ASSETS: Record<string, number> = {
  "short-a": require("../assets/phonemes/short-a.mp3"),
  "short-e": require("../assets/phonemes/short-e.mp3"),
  "short-i": require("../assets/phonemes/short-i.mp3"),
  "short-o": require("../assets/phonemes/short-o.mp3"),
  "short-u": require("../assets/phonemes/short-u.mp3"),
  "long-a": require("../assets/phonemes/long-a.mp3"),
  "long-e": require("../assets/phonemes/long-e.mp3"),
  "long-i": require("../assets/phonemes/long-i.mp3"),
  "long-o": require("../assets/phonemes/long-o.mp3"),
  "long-u": require("../assets/phonemes/long-u.mp3"),
  p: require("../assets/phonemes/p.mp3"),
  t: require("../assets/phonemes/t.mp3"),
  k: require("../assets/phonemes/k.mp3"),
  f: require("../assets/phonemes/f.mp3"),
  s: require("../assets/phonemes/s.mp3"),
  sh: require("../assets/phonemes/sh.mp3"),
  ch: require("../assets/phonemes/ch.mp3"),
  "th-unvoiced": require("../assets/phonemes/th-unvoiced.mp3"),
  b: require("../assets/phonemes/b.mp3"),
  d: require("../assets/phonemes/d.mp3"),
  g: require("../assets/phonemes/g.mp3"),
  v: require("../assets/phonemes/v.mp3"),
  z: require("../assets/phonemes/z.mp3"),
  j: require("../assets/phonemes/j.mp3"),
  "th-voiced": require("../assets/phonemes/th-voiced.mp3"),
  m: require("../assets/phonemes/m.mp3"),
  n: require("../assets/phonemes/n.mp3"),
  l: require("../assets/phonemes/l.mp3"),
  r: require("../assets/phonemes/r.mp3"),
};

export function parseSoundLine(text: string) {
  const m = text.replace(/\s+/g, " ").replace(/[.]+$/g, "").trim().match(/^(.*?),\s*as in\s+(.+)$/i);
  if (!m) return null;
  const label = m[1].trim().toLowerCase();
  const word = m[2].trim();
  const file = SOUND_FILE[label];
  if (!file || !PHONEME_ASSETS[file]) return null;
  return { file, word, asset: PHONEME_ASSETS[file] };
}
