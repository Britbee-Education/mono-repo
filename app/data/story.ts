export type StorySentence = {
  text: string;
  soundHints: Record<string, string>;
};

export const STORY = {
  id: "ben-at-the-park",
  title: "Ben at the Park",
  bonusPoints: 10,
  sentences: [
    { text: "Ben takes his red ball to the park.", soundHints: { Ben: "b", red: "short-e", ball: "l", park: "p" } },
    { text: "He throws the ball onto the grass.", soundHints: { throws: "th-unvoiced", ball: "l", grass: "g" } },
    { text: "The ball rolls under a tree.", soundHints: { ball: "l", rolls: "r", under: "short-u", tree: "long-e" } },
    { text: "Ben runs to the tree.", soundHints: { runs: "r", tree: "long-e" } },
    { text: "He looks under the tree.", soundHints: { looks: "l", under: "short-u", tree: "long-e" } },
    { text: "He finds his ball in the grass.", soundHints: { finds: "f", ball: "l", grass: "g" } },
    { text: "Ben picks it up and smiles.", soundHints: { picks: "p", smiles: "s" } },
  ] as StorySentence[],
};
