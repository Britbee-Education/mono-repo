import { weekKey } from "./phonics";

export type ActionVerb = {
  id: string;
  word: string;
  emoji: string;
  spoken: string;
  sentence: string;
};

export const VERB_POOL: ActionVerb[] = [
  { id: "run", word: "run", emoji: "🏃", spoken: "run", sentence: "I run around the park." },
  { id: "jump", word: "jump", emoji: "🦘", spoken: "jump", sentence: "I jump on the bed." },
  { id: "eat", word: "eat", emoji: "🍽️", spoken: "eat", sentence: "I eat an apple." },
  { id: "drink", word: "drink", emoji: "🥤", spoken: "drink", sentence: "I drink some cold water." },
  { id: "sleep", word: "sleep", emoji: "😴", spoken: "sleep", sentence: "I sleep in my bed." },
  { id: "read", word: "read", emoji: "📖", spoken: "reed", sentence: "I read a book." },
  { id: "write", word: "write", emoji: "✍️", spoken: "write", sentence: "I write my name." },
  { id: "play", word: "play", emoji: "⚽", spoken: "play", sentence: "I play with my ball." },
  { id: "clap", word: "clap", emoji: "👏", spoken: "clap", sentence: "I clap my hands." },
  { id: "wave", word: "wave", emoji: "👋", spoken: "wave", sentence: "I wave to my friend." },
  { id: "kick", word: "kick", emoji: "🦵", spoken: "kick", sentence: "I kick the ball." },
  { id: "throw", word: "throw", emoji: "🤾", spoken: "throw", sentence: "I throw the ball to my friend." },
  { id: "sit", word: "sit", emoji: "🪑", spoken: "sit", sentence: "I sit on the chair." },
  { id: "stand", word: "stand", emoji: "🧍", spoken: "stand", sentence: "I stand by the door." },
  { id: "walk", word: "walk", emoji: "🚶", spoken: "walk", sentence: "I walk to school." },
  { id: "swim", word: "swim", emoji: "🏊", spoken: "swim", sentence: "I swim in the pool." },
];

export function weeklyVerbs() {
  const week = Number(weekKey());
  const start = (week * 8) % VERB_POOL.length;
  const set: ActionVerb[] = [];
  for (let i = 0; i < 8; i++) set.push(VERB_POOL[(start + i) % VERB_POOL.length]);
  return set;
}
