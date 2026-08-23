export const colors = {
  navy: "#1A2B5F",
  navyDeep: "#00174F",
  yellow: "#FFC107",
  yellowBright: "#FFCC00",
  linkBlue: "#1E63D0",
  nameRed: "#E53935",
  bg: "#FFFFFF",
  bgMuted: "#F7F8FA",
  streakBg: "#FFF6D6",
  practiceBg: "#EAF2FF",
  practiceYellow: "#FFE566",
  border: "#E5E7EB",
  muted: "#6B7280",
  listen: "#8C52FF",
  speak: "#4CAF50",
  learn: "#FFCC00",
  mission: "#EF5350",
  levelGreen: "#E8F5E9",
  levelGreenBorder: "#66BB6A",
  successBg: "#E8F5E9",
  successText: "#2E7D32",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const radii = {
  input: 10,
  card: 12,
  pill: 10,
} as const;

export const brand = {
  name: "BritBee",
  tagline: "English for Buzzing Kids",
  headline: "Where Kids Buzz in English!",
} as const;

export {
  BRAND,
  HTML_LANG,
  OG_LOCALE,
  OG_IMAGE_PATH,
  OG_IMAGE_SIZE,
  SITES,
  nextMetadata,
  seoHeadHtml,
  apiIndexHtml,
  ogImageUrl,
} from "./seo";
export type { SiteId, SiteMeta } from "./seo";
