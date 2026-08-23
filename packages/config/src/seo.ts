export const BRAND = "BritBee";
export const HTML_LANG = "en-IN";
export const OG_LOCALE = "en_IN";
export const OG_IMAGE_PATH = "/og-image.png";
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export type SiteId = "website" | "office" | "api";

export type SiteMeta = {
  origin: string;
  title: string;
  description: string;
  robots?: "noindex, nofollow";
  social: boolean;
};

export const SITES: Record<SiteId, SiteMeta> = {
  website: {
    origin: "https://britbee.app",
    title: "BritBee — Practical English Learning for Kids",
    description:
      "BritBee helps children from K3 to K8 build practical English communication skills through pronunciation, speaking, reading, vocabulary, grammar and daily practice.",
    social: true,
  },
  office: {
    origin: "https://office.britbee.app",
    title: "BritBee Office — Learner Management",
    description: "BritBee's mentor workspace for managing learners and monitoring their English learning progress.",
    robots: "noindex, nofollow",
    social: true,
  },
  api: {
    origin: "https://api.britbee.app",
    title: "BritBee API",
    description: "API services powering the BritBee learning platform.",
    robots: "noindex, nofollow",
    social: false,
  },
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function ogImageUrl(origin: string) {
  return `${origin}${OG_IMAGE_PATH}`;
}

/** Next.js Metadata-compatible object. No private learner fields. */
export function nextMetadata(id: Exclude<SiteId, "api">) {
  const site = SITES[id];
  const image = ogImageUrl(site.origin);
  return {
    metadataBase: new URL(site.origin),
    title: site.title,
    description: site.description,
    alternates: { canonical: site.origin },
    robots: site.robots
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: "website" as const,
      locale: OG_LOCALE,
      url: site.origin,
      siteName: BRAND,
      title: site.title,
      description: site.description,
      images: [{ url: image, width: OG_IMAGE_SIZE.width, height: OG_IMAGE_SIZE.height, alt: BRAND }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: site.title,
      description: site.description,
      images: [image],
    },
  };
}

export function seoHeadHtml(id: SiteId) {
  const site = SITES[id];
  const parts = [
    `<title>${escapeHtml(site.title)}</title>`,
    `<meta name="description" content="${escapeHtml(site.description)}" />`,
  ];
  if (id !== "api") {
    parts.push(`<link rel="canonical" href="${site.origin}" />`);
  }
  if (site.robots) {
    parts.push(`<meta name="robots" content="${site.robots}" />`);
  }
  if (site.social) {
    const image = ogImageUrl(site.origin);
    parts.push(
      `<meta property="og:type" content="website" />`,
      `<meta property="og:locale" content="${OG_LOCALE}" />`,
      `<meta property="og:site_name" content="${BRAND}" />`,
      `<meta property="og:title" content="${escapeHtml(site.title)}" />`,
      `<meta property="og:description" content="${escapeHtml(site.description)}" />`,
      `<meta property="og:url" content="${site.origin}" />`,
      `<meta property="og:image" content="${image}" />`,
      `<meta property="og:image:width" content="${OG_IMAGE_SIZE.width}" />`,
      `<meta property="og:image:height" content="${OG_IMAGE_SIZE.height}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${escapeHtml(site.title)}" />`,
      `<meta name="twitter:description" content="${escapeHtml(site.description)}" />`,
      `<meta name="twitter:image" content="${image}" />`
    );
  }
  return parts.join("\n");
}

export function apiIndexHtml() {
  const site = SITES.api;
  return `<!DOCTYPE html>
<html lang="${HTML_LANG}">
<head>
<meta charset="utf-8" />
${seoHeadHtml("api")}
</head>
<body>
<h1>${escapeHtml(site.title)}</h1>
<p>${escapeHtml(site.description)}</p>
</body>
</html>`;
}
