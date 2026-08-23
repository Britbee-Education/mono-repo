import type { ImageSourcePropType } from "react-native";

export type PrepKind = "place" | "movement";

export type PrepQuestion = {
  id: string;
  kind: PrepKind;
  prompt: string;
  cloze: string;
  image: ImageSourcePropType;
  moving?: boolean;
  options: [string, string];
  answer: string;
};

export const PREPOSITIONS: PrepQuestion[] = [
  {
    id: "on",
    kind: "place",
    prompt: "Where is the bee?",
    cloze: "The bee is ___ the box.",
    image: require("../assets/prepositions/prep-on.jpg"),
    options: ["on", "under"],
    answer: "on",
  },
  {
    id: "under",
    kind: "place",
    prompt: "Where is the bee?",
    cloze: "The bee is ___ the box.",
    image: require("../assets/prepositions/prep-under.jpg"),
    options: ["on", "under"],
    answer: "under",
  },
  {
    id: "in",
    kind: "place",
    prompt: "Where is the bee?",
    cloze: "The bee is ___ the house.",
    image: require("../assets/prepositions/prep-in.jpg"),
    options: ["in", "behind"],
    answer: "in",
  },
  {
    id: "behind",
    kind: "place",
    prompt: "Where is the bee?",
    cloze: "The bee is ___ the tree.",
    image: require("../assets/prepositions/prep-behind.jpg"),
    options: ["behind", "in front of"],
    answer: "behind",
  },
  {
    id: "in-front",
    kind: "place",
    prompt: "Where is the bee?",
    cloze: "The bee is ___ the tree.",
    image: require("../assets/prepositions/prep-in-front.jpg"),
    options: ["behind", "in front of"],
    answer: "in front of",
  },
  {
    id: "next-to",
    kind: "place",
    prompt: "Where is the bee?",
    cloze: "The bee is ___ the box.",
    image: require("../assets/prepositions/prep-next-to.jpg"),
    options: ["next to", "in"],
    answer: "next to",
  },
  {
    id: "between",
    kind: "place",
    prompt: "Where is the bee?",
    cloze: "The bee is ___ the trees.",
    image: require("../assets/prepositions/prep-between.jpg"),
    options: ["between", "behind"],
    answer: "between",
  },
  {
    id: "into",
    kind: "movement",
    prompt: "Where is the bee going?",
    cloze: "The bee is flying ___ the house.",
    image: require("../assets/prepositions/prep-into.jpg"),
    moving: true,
    options: ["into", "out of"],
    answer: "into",
  },
  {
    id: "out-of",
    kind: "movement",
    prompt: "Where is the bee going?",
    cloze: "The bee is flying ___ the house.",
    image: require("../assets/prepositions/prep-out-of.jpg"),
    moving: true,
    options: ["into", "out of"],
    answer: "out of",
  },
  {
    id: "up",
    kind: "movement",
    prompt: "Where is the bee going?",
    cloze: "The bee is flying ___ the tree.",
    image: require("../assets/prepositions/prep-up.jpg"),
    moving: true,
    options: ["up", "down"],
    answer: "up",
  },
  {
    id: "down",
    kind: "movement",
    prompt: "Where is the bee going?",
    cloze: "The bee is flying ___ from the tree.",
    image: require("../assets/prepositions/prep-down.jpg"),
    moving: true,
    options: ["up", "down"],
    answer: "down",
  },
  {
    id: "across",
    kind: "movement",
    prompt: "Where is the bee going?",
    cloze: "The bee is flying ___ the stream.",
    image: require("../assets/prepositions/prep-across.jpg"),
    moving: true,
    options: ["across", "through"],
    answer: "across",
  },
  {
    id: "through",
    kind: "movement",
    prompt: "Where is the bee going?",
    cloze: "The bee is flying ___ the gate.",
    image: require("../assets/prepositions/prep-through.jpg"),
    moving: true,
    options: ["through", "across"],
    answer: "through",
  },
  {
    id: "towards",
    kind: "movement",
    prompt: "Where is the bee going?",
    cloze: "The bee is flying ___ the flower.",
    image: require("../assets/prepositions/prep-towards.jpg"),
    moving: true,
    options: ["towards", "under"],
    answer: "towards",
  },
];

export function completeCloze(cloze: string, word: string) {
  return cloze.replace("___", word);
}
