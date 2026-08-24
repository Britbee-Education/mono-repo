export type PrepKind = "place" | "movement";

export type PrepQuestion = {
  id: string;
  kind: PrepKind;
  prompt: string;
  cloze: string;
  scene: string;
  moving?: boolean;
  options: [string, string];
  answer: string;
};

export const PREPOSITIONS: PrepQuestion[] = [
  { id: "on", kind: "place", prompt: "Where is the bee?", cloze: "The bee is ___ the box.", scene: "📦\n◎", options: ["on", "under"], answer: "on" },
  { id: "under", kind: "place", prompt: "Where is the bee?", cloze: "The bee is ___ the box.", scene: "◎\n📦", options: ["on", "under"], answer: "under" },
  { id: "in", kind: "place", prompt: "Where is the bee?", cloze: "The bee is ___ the house.", scene: "🏠◎", options: ["in", "behind"], answer: "in" },
  { id: "behind", kind: "place", prompt: "Where is the bee?", cloze: "The bee is ___ the tree.", scene: "🌳  ◎", options: ["behind", "in front of"], answer: "behind" },
  { id: "in-front", kind: "place", prompt: "Where is the bee?", cloze: "The bee is ___ the tree.", scene: "◎  🌳", options: ["behind", "in front of"], answer: "in front of" },
  { id: "next-to", kind: "place", prompt: "Where is the bee?", cloze: "The bee is ___ the box.", scene: "📦 ◎", options: ["next to", "in"], answer: "next to" },
  { id: "between", kind: "place", prompt: "Where is the bee?", cloze: "The bee is ___ the trees.", scene: "🌳 ◎ 🌳", options: ["between", "behind"], answer: "between" },
  { id: "into", kind: "movement", prompt: "Where is the bee going?", cloze: "The bee is flying ___ the house.", scene: "◎ → 🏠", moving: true, options: ["into", "out of"], answer: "into" },
  { id: "out-of", kind: "movement", prompt: "Where is the bee going?", cloze: "The bee is flying ___ the house.", scene: "🏠 → ◎", moving: true, options: ["into", "out of"], answer: "out of" },
  { id: "up", kind: "movement", prompt: "Where is the bee going?", cloze: "The bee is flying ___ the tree.", scene: "◎\n↑\n🌳", moving: true, options: ["up", "down"], answer: "up" },
  { id: "down", kind: "movement", prompt: "Where is the bee going?", cloze: "The bee is flying ___ from the tree.", scene: "🌳\n↓\n◎", moving: true, options: ["up", "down"], answer: "down" },
  { id: "across", kind: "movement", prompt: "Where is the bee going?", cloze: "The bee is flying ___ the stream.", scene: "◎ → → 🌊", moving: true, options: ["across", "through"], answer: "across" },
  { id: "through", kind: "movement", prompt: "Where is the bee going?", cloze: "The bee is flying ___ the gate.", scene: "◎ → 🚪 →", moving: true, options: ["through", "across"], answer: "through" },
  { id: "towards", kind: "movement", prompt: "Where is the bee going?", cloze: "The bee is flying ___ the flower.", scene: "◎ → 🌸", moving: true, options: ["towards", "under"], answer: "towards" },
];
