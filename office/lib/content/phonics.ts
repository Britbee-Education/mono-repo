export type PhonicsGroup = "short-vowel" | "long-vowel" | "unvoiced" | "voiced";

export type PhonicsSound = {
  id: string;
  glyph: string;
  ipa: string;
  spoken: string;
  title: string;
  group: PhonicsGroup;
  voiced?: boolean;
  examples: { position: "beginning" | "middle" | "end"; word: string; hint: string }[];
  sentence: string;
};

export const PHONICS_GROUPS: { id: PhonicsGroup; label: string }[] = [
  { id: "short-vowel", label: "Short vowels" },
  { id: "long-vowel", label: "Long vowels" },
  { id: "unvoiced", label: "Unvoiced consonants" },
  { id: "voiced", label: "Voiced consonants" },
];

export const PHONICS: PhonicsSound[] = [
  {
    id: "short-a",
    glyph: "ă",
    ipa: "/æ/",
    spoken: "short a, as in apple",
    title: "Short A",
    group: "short-vowel",
    examples: [
      { position: "beginning", word: "apple", hint: "a-pple" },
      { position: "middle", word: "cat", hint: "c-a-t" },
      { position: "end", word: "map", hint: "m-a-p" },
    ],
    sentence: "The cat sat on a black hat.",
  },
  {
    id: "short-e",
    glyph: "ĕ",
    ipa: "/e/",
    spoken: "short e, as in egg",
    title: "Short E",
    group: "short-vowel",
    examples: [
      { position: "beginning", word: "egg", hint: "e-gg" },
      { position: "middle", word: "bed", hint: "b-e-d" },
      { position: "end", word: "red", hint: "r-e-d" },
    ],
    sentence: "The red hen sits on the nest.",
  },
  {
    id: "short-i",
    glyph: "ĭ",
    ipa: "/ɪ/",
    spoken: "short i, as in igloo",
    title: "Short I",
    group: "short-vowel",
    examples: [
      { position: "beginning", word: "igloo", hint: "i-gloo" },
      { position: "middle", word: "sit", hint: "s-i-t" },
      { position: "end", word: "lid", hint: "l-i-d" },
    ],
    sentence: "The little kid sits with a big dish.",
  },
  {
    id: "short-o",
    glyph: "ŏ",
    ipa: "/ɒ/",
    spoken: "short o, as in octopus",
    title: "Short O",
    group: "short-vowel",
    examples: [
      { position: "beginning", word: "octopus", hint: "o-ctopus" },
      { position: "middle", word: "hot", hint: "h-o-t" },
      { position: "end", word: "top", hint: "t-o-p" },
    ],
    sentence: "The hot pot is on top of the box.",
  },
  {
    id: "short-u",
    glyph: "ŭ",
    ipa: "/ʌ/",
    spoken: "short u, as in umbrella",
    title: "Short U",
    group: "short-vowel",
    examples: [
      { position: "beginning", word: "umbrella", hint: "u-mbrella" },
      { position: "middle", word: "sun", hint: "s-u-n" },
      { position: "end", word: "cup", hint: "c-u-p" },
    ],
    sentence: "The pup runs in the sun with his cup.",
  },
  {
    id: "long-a",
    glyph: "ā",
    ipa: "/eɪ/",
    spoken: "long a, as in cake",
    title: "Long A",
    group: "long-vowel",
    examples: [
      { position: "beginning", word: "ape", hint: "a-pe" },
      { position: "middle", word: "cake", hint: "c-a-ke" },
      { position: "end", word: "day", hint: "d-ay" },
    ],
    sentence: "Kate bakes a cake on a rainy day.",
  },
  {
    id: "long-e",
    glyph: "ē",
    ipa: "/iː/",
    spoken: "long e, as in bee",
    title: "Long E",
    group: "long-vowel",
    examples: [
      { position: "beginning", word: "eat", hint: "ea-t" },
      { position: "middle", word: "bee", hint: "b-ee" },
      { position: "end", word: "tree", hint: "tr-ee" },
    ],
    sentence: "The bee sees a green tree and eats a peach.",
  },
  {
    id: "long-i",
    glyph: "ī",
    ipa: "/aɪ/",
    spoken: "long i, as in kite",
    title: "Long I",
    group: "long-vowel",
    examples: [
      { position: "beginning", word: "ice", hint: "i-ce" },
      { position: "middle", word: "kite", hint: "k-i-te" },
      { position: "end", word: "fly", hint: "fl-y" },
    ],
    sentence: "I like to fly my kite high in the sky.",
  },
  {
    id: "long-o",
    glyph: "ō",
    ipa: "/əʊ/",
    spoken: "long o, as in boat",
    title: "Long O",
    group: "long-vowel",
    examples: [
      { position: "beginning", word: "oat", hint: "oa-t" },
      { position: "middle", word: "boat", hint: "b-oa-t" },
      { position: "end", word: "go", hint: "g-o" },
    ],
    sentence: "The goat goes home along the slow road.",
  },
  {
    id: "long-u",
    glyph: "ū",
    ipa: "/juː/",
    spoken: "long u, as in unicorn",
    title: "Long U",
    group: "long-vowel",
    examples: [
      { position: "beginning", word: "unicorn", hint: "u-nicorn" },
      { position: "middle", word: "cute", hint: "c-u-te" },
      { position: "end", word: "few", hint: "f-ew" },
    ],
    sentence: "The cute unicorn plays a new tune.",
  },
  {
    id: "p",
    glyph: "p",
    ipa: "/p/",
    spoken: "p, as in pen",
    title: "P",
    group: "unvoiced",
    voiced: false,
    examples: [
      { position: "beginning", word: "pen", hint: "p-en" },
      { position: "middle", word: "apple", hint: "a-pp-le" },
      { position: "end", word: "map", hint: "ma-p" },
    ],
    sentence: "Pat puts a pink pen on the map.",
  },
  {
    id: "t",
    glyph: "t",
    ipa: "/t/",
    spoken: "t, as in tap",
    title: "T",
    group: "unvoiced",
    voiced: false,
    examples: [
      { position: "beginning", word: "tap", hint: "t-ap" },
      { position: "middle", word: "water", hint: "wa-t-er" },
      { position: "end", word: "cat", hint: "ca-t" },
    ],
    sentence: "Tom taps the tin at the tent.",
  },
  {
    id: "k",
    glyph: "k",
    ipa: "/k/",
    spoken: "k, as in cat",
    title: "K / C",
    group: "unvoiced",
    voiced: false,
    examples: [
      { position: "beginning", word: "cat", hint: "c-at" },
      { position: "middle", word: "lucky", hint: "lu-ck-y" },
      { position: "end", word: "duck", hint: "du-ck" },
    ],
    sentence: "The cook keeps a cup in the kitchen.",
  },
  {
    id: "f",
    glyph: "f",
    ipa: "/f/",
    spoken: "f, as in fan",
    title: "F",
    group: "unvoiced",
    voiced: false,
    examples: [
      { position: "beginning", word: "fan", hint: "f-an" },
      { position: "middle", word: "muffin", hint: "mu-ff-in" },
      { position: "end", word: "leaf", hint: "lea-f" },
    ],
    sentence: "A fluffy fox finds a fresh muffin.",
  },
  {
    id: "s",
    glyph: "s",
    ipa: "/s/",
    spoken: "s, as in sun",
    title: "S",
    group: "unvoiced",
    voiced: false,
    examples: [
      { position: "beginning", word: "sun", hint: "s-un" },
      { position: "middle", word: "sister", hint: "si-s-ter" },
      { position: "end", word: "bus", hint: "bu-s" },
    ],
    sentence: "Sam sees six buses in the sun.",
  },
  {
    id: "sh",
    glyph: "sh",
    ipa: "/ʃ/",
    spoken: "sh, as in ship",
    title: "SH",
    group: "unvoiced",
    voiced: false,
    examples: [
      { position: "beginning", word: "ship", hint: "sh-ip" },
      { position: "middle", word: "washing", hint: "wa-sh-ing" },
      { position: "end", word: "fish", hint: "fi-sh" },
    ],
    sentence: "She washes a shiny dish on the ship.",
  },
  {
    id: "ch",
    glyph: "ch",
    ipa: "/tʃ/",
    spoken: "ch, as in chip",
    title: "CH",
    group: "unvoiced",
    voiced: false,
    examples: [
      { position: "beginning", word: "chip", hint: "ch-ip" },
      { position: "middle", word: "teacher", hint: "tea-ch-er" },
      { position: "end", word: "catch", hint: "ca-tch" },
    ],
    sentence: "The cheerful teacher chooses cheese and chips.",
  },
  {
    id: "th-unvoiced",
    glyph: "th",
    ipa: "/θ/",
    spoken: "unvoiced th, as in thumb",
    title: "TH (thin)",
    group: "unvoiced",
    voiced: false,
    examples: [
      { position: "beginning", word: "thumb", hint: "th-umb" },
      { position: "middle", word: "bathroom", hint: "ba-th-room" },
      { position: "end", word: "bath", hint: "ba-th" },
    ],
    sentence: "Theo thinks the thick cloth is on the path.",
  },
  {
    id: "b",
    glyph: "b",
    ipa: "/b/",
    spoken: "b, as in bat",
    title: "B",
    group: "voiced",
    voiced: true,
    examples: [
      { position: "beginning", word: "bat", hint: "b-at" },
      { position: "middle", word: "rabbit", hint: "ra-bb-it" },
      { position: "end", word: "cob", hint: "co-b" },
    ],
    sentence: "A big brown bear bounces a ball.",
  },
  {
    id: "d",
    glyph: "d",
    ipa: "/d/",
    spoken: "d, as in dog",
    title: "D",
    group: "voiced",
    voiced: true,
    examples: [
      { position: "beginning", word: "dog", hint: "d-og" },
      { position: "middle", word: "ladder", hint: "la-dd-er" },
      { position: "end", word: "bed", hint: "be-d" },
    ],
    sentence: "Dad's dog stands on the old red bed.",
  },
  {
    id: "g",
    glyph: "g",
    ipa: "/g/",
    spoken: "g, as in goat",
    title: "G",
    group: "voiced",
    voiced: true,
    examples: [
      { position: "beginning", word: "goat", hint: "g-oat" },
      { position: "middle", word: "tiger", hint: "ti-g-er" },
      { position: "end", word: "bag", hint: "ba-g" },
    ],
    sentence: "The big goat got a green bag of grass.",
  },
  {
    id: "v",
    glyph: "v",
    ipa: "/v/",
    spoken: "v, as in van",
    title: "V",
    group: "voiced",
    voiced: true,
    examples: [
      { position: "beginning", word: "van", hint: "v-an" },
      { position: "middle", word: "river", hint: "ri-v-er" },
      { position: "end", word: "five", hint: "fi-ve" },
    ],
    sentence: "Five vans park by the river in the evening.",
  },
  {
    id: "z",
    glyph: "z",
    ipa: "/z/",
    spoken: "z, as in zoo",
    title: "Z",
    group: "voiced",
    voiced: true,
    examples: [
      { position: "beginning", word: "zoo", hint: "z-oo" },
      { position: "middle", word: "lazy", hint: "la-z-y" },
      { position: "end", word: "buzz", hint: "bu-zz" },
    ],
    sentence: "Busy bees buzz around the zoo.",
  },
  {
    id: "j",
    glyph: "j",
    ipa: "/dʒ/",
    spoken: "j, as in jam",
    title: "J",
    group: "voiced",
    voiced: true,
    examples: [
      { position: "beginning", word: "jam", hint: "j-am" },
      { position: "middle", word: "magic", hint: "ma-g-ic" },
      { position: "end", word: "bridge", hint: "bri-dge" },
    ],
    sentence: "Joe jumps for joy next to the jam jar.",
  },
  {
    id: "th-voiced",
    glyph: "th",
    ipa: "/ð/",
    spoken: "voiced th, as in this",
    title: "TH (this)",
    group: "voiced",
    voiced: true,
    examples: [
      { position: "beginning", word: "this", hint: "th-is" },
      { position: "middle", word: "brother", hint: "bro-th-er" },
      { position: "end", word: "bathe", hint: "ba-the" },
    ],
    sentence: "This is my brother with those three books.",
  },
  {
    id: "m",
    glyph: "m",
    ipa: "/m/",
    spoken: "m, as in man",
    title: "M",
    group: "voiced",
    voiced: true,
    examples: [
      { position: "beginning", word: "man", hint: "m-an" },
      { position: "middle", word: "lemon", hint: "le-m-on" },
      { position: "end", word: "ham", hint: "ha-m" },
    ],
    sentence: "Sam's mum makes lemon jam.",
  },
  {
    id: "n",
    glyph: "n",
    ipa: "/n/",
    spoken: "n, as in net",
    title: "N",
    group: "voiced",
    voiced: true,
    examples: [
      { position: "beginning", word: "net", hint: "n-et" },
      { position: "middle", word: "honey", hint: "ho-n-ey" },
      { position: "end", word: "sun", hint: "su-n" },
    ],
    sentence: "Nan finds nine nuts in the sun.",
  },
  {
    id: "l",
    glyph: "l",
    ipa: "/l/",
    spoken: "l, as in lamp",
    title: "L",
    group: "voiced",
    voiced: true,
    examples: [
      { position: "beginning", word: "lamp", hint: "l-amp" },
      { position: "middle", word: "yellow", hint: "ye-ll-ow" },
      { position: "end", word: "ball", hint: "ba-ll" },
    ],
    sentence: "A little yellow ball rolls down the hill.",
  },
  {
    id: "r",
    glyph: "r",
    ipa: "/r/",
    spoken: "r, as in red",
    title: "R",
    group: "voiced",
    voiced: true,
    examples: [
      { position: "beginning", word: "red", hint: "r-ed" },
      { position: "middle", word: "carrot", hint: "ca-rr-ot" },
      { position: "end", word: "car", hint: "ca-r" },
    ],
    sentence: "Rita rides a red car around the park.",
  },
];

export function getPhonicsById(id: string) {
  return PHONICS.find((s) => s.id === id);
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function dailyPhonics() {
  const day = Math.floor(Date.now() / 86_400_000);
  return PHONICS[day % PHONICS.length];
}

export function weekKey() {
  const day = Math.floor(Date.now() / 86_400_000);
  return String(Math.floor(day / 7));
}

export function phonicsForOffset(offset: number) {
  const day = Math.floor(Date.now() / 86_400_000) + offset;
  const sound = PHONICS[((day % PHONICS.length) + PHONICS.length) % PHONICS.length];
  const date = new Date(day * 86_400_000).toISOString().slice(0, 10);
  return { offset, date, sound };
}
