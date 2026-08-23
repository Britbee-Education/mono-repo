import type { ImageSourcePropType } from "react-native";
import type { QuestId } from "./quests";

const WORDS: Record<string, ImageSourcePropType> = {
  ape: require("../assets/words/ape.png"),
  apple: require("../assets/words/apple.png"),
  bag: require("../assets/words/bag.png"),
  ball: require("../assets/words/ball.png"),
  bat: require("../assets/words/bat.png"),
  bath: require("../assets/words/bath.png"),
  bathe: require("../assets/words/bathe.png"),
  bathroom: require("../assets/words/bathroom.png"),
  bed: require("../assets/words/bed.png"),
  bee: require("../assets/words/bee.png"),
  boat: require("../assets/words/boat.png"),
  bridge: require("../assets/words/bridge.png"),
  brother: require("../assets/words/brother.png"),
  bus: require("../assets/words/bus.png"),
  buzz: require("../assets/words/buzz.png"),
  cake: require("../assets/words/cake.png"),
  car: require("../assets/words/car.png"),
  carrot: require("../assets/words/carrot.png"),
  cat: require("../assets/words/cat.png"),
  catch: require("../assets/words/catch.png"),
  chip: require("../assets/words/chip.png"),
  cob: require("../assets/words/cob.png"),
  cup: require("../assets/words/cup.png"),
  cute: require("../assets/words/cute.png"),
  day: require("../assets/words/day.png"),
  dog: require("../assets/words/dog.png"),
  duck: require("../assets/words/duck.png"),
  eat: require("../assets/words/eat.png"),
  egg: require("../assets/words/egg.png"),
  fan: require("../assets/words/fan.png"),
  few: require("../assets/words/few.png"),
  fish: require("../assets/words/fish.png"),
  five: require("../assets/words/five.png"),
  fly: require("../assets/words/fly.png"),
  go: require("../assets/words/go.png"),
  goat: require("../assets/words/goat.png"),
  ham: require("../assets/words/ham.png"),
  honey: require("../assets/words/honey.png"),
  hot: require("../assets/words/hot.png"),
  ice: require("../assets/words/ice.png"),
  igloo: require("../assets/words/igloo.png"),
  jam: require("../assets/words/jam.png"),
  kite: require("../assets/words/kite.png"),
  ladder: require("../assets/words/ladder.png"),
  lamp: require("../assets/words/lamp.png"),
  lazy: require("../assets/words/lazy.png"),
  leaf: require("../assets/words/leaf.png"),
  lemon: require("../assets/words/lemon.png"),
  lid: require("../assets/words/lid.png"),
  lucky: require("../assets/words/lucky.png"),
  magic: require("../assets/words/magic.png"),
  man: require("../assets/words/man.png"),
  map: require("../assets/words/map.png"),
  muffin: require("../assets/words/muffin.png"),
  net: require("../assets/words/net.png"),
  oat: require("../assets/words/oat.png"),
  octopus: require("../assets/words/octopus.png"),
  pen: require("../assets/words/pen.png"),
  rabbit: require("../assets/words/rabbit.png"),
  red: require("../assets/words/red.png"),
  river: require("../assets/words/river.png"),
  ship: require("../assets/words/ship.png"),
  sister: require("../assets/words/sister.png"),
  sit: require("../assets/words/sit.png"),
  sun: require("../assets/words/sun.png"),
  tap: require("../assets/words/tap.png"),
  teacher: require("../assets/words/teacher.png"),
  this: require("../assets/words/this.png"),
  thumb: require("../assets/words/thumb.png"),
  tiger: require("../assets/words/tiger.png"),
  top: require("../assets/words/top.png"),
  tree: require("../assets/words/tree.png"),
  umbrella: require("../assets/words/umbrella.png"),
  unicorn: require("../assets/words/unicorn.png"),
  van: require("../assets/words/van.png"),
  washing: require("../assets/words/washing.png"),
  water: require("../assets/words/water.png"),
  yellow: require("../assets/words/yellow.png"),
  zoo: require("../assets/words/zoo.png"),
};

const STORY: ImageSourcePropType[] = [
  require("../assets/story/story-1.png"),
  require("../assets/story/story-2.png"),
  require("../assets/story/story-3.png"),
  require("../assets/story/story-4.png"),
  require("../assets/story/story-5.png"),
  require("../assets/story/story-6.png"),
  require("../assets/story/story-7.png"),
];

const VERBS: Record<string, ImageSourcePropType> = {
  clap: require("../assets/verbs/clap.png"),
  drink: require("../assets/verbs/drink.png"),
  eat: require("../assets/verbs/eat.png"),
  jump: require("../assets/verbs/jump.png"),
  kick: require("../assets/verbs/kick.png"),
  play: require("../assets/verbs/play.png"),
  read: require("../assets/verbs/read.png"),
  run: require("../assets/verbs/run.png"),
  sit: require("../assets/verbs/sit.png"),
  sleep: require("../assets/verbs/sleep.png"),
  stand: require("../assets/verbs/stand.png"),
  swim: require("../assets/verbs/swim.png"),
  throw: require("../assets/verbs/throw.png"),
  walk: require("../assets/verbs/walk.png"),
  wave: require("../assets/verbs/wave.png"),
  write: require("../assets/verbs/write.png"),
};

const SPEAK: Record<string, ImageSourcePropType> = {
  "short-a": require("../assets/speak/speak-short-a.png"),
  "short-e": require("../assets/speak/speak-short-e.png"),
  "short-i": require("../assets/speak/speak-short-i.png"),
  "short-o": require("../assets/speak/speak-short-o.png"),
  "short-u": require("../assets/speak/speak-short-u.png"),
  "long-a": require("../assets/speak/speak-long-a.png"),
  "long-e": require("../assets/speak/speak-long-e.png"),
  "long-i": require("../assets/speak/speak-long-i.png"),
  "long-o": require("../assets/speak/speak-long-o.png"),
  "long-u": require("../assets/speak/speak-long-u.png"),
};

const COVERS: Record<QuestId, ImageSourcePropType> = {
  phonics: require("../assets/covers/cover-sounds.png"),
  sentence: require("../assets/covers/cover-speak.png"),
  story: require("../assets/covers/cover-story.png"),
  verbs: require("../assets/covers/cover-act.png"),
  prepositions: require("../assets/covers/cover-maps.png"),
};

export function wordArt(word?: string | null) {
  if (!word) return null;
  return WORDS[word.toLowerCase().trim()] || null;
}

export function storyArt(index: number) {
  return STORY[index] || null;
}

export function verbArt(id: string) {
  return VERBS[id] || null;
}

export function speakArt(id: string) {
  return SPEAK[id] || null;
}

export function coverArt(id: QuestId) {
  return COVERS[id];
}

export function learnArt(key?: string | null) {
  if (!key) return null;
  const id = key.toLowerCase().trim();
  if (id.startsWith("story-")) {
    const n = Number(id.slice(6)) - 1;
    return Number.isFinite(n) ? storyArt(n) : null;
  }
  return wordArt(id) || verbArt(id) || speakArt(id) || null;
}

