import { ScrollViewStyleReset } from "expo-router/html";
import { HTML_LANG, OG_IMAGE_SIZE, OG_LOCALE, SITES, ogImageUrl } from "@britbee/config";

const site = SITES.website;
const image = ogImageUrl(site.origin);

export default function Html({ children }: { children: React.ReactNode }) {
  return (
    <html lang={HTML_LANG}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, interactive-widget=resizes-content" />
        <title>{site.title}</title>
        <meta name="description" content={site.description} />
        <link rel="canonical" href={site.origin} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content={OG_LOCALE} />
        <meta property="og:site_name" content="BritBee" />
        <meta property="og:title" content={site.title} />
        <meta property="og:description" content={site.description} />
        <meta property="og:url" content={site.origin} />
        <meta property="og:image" content={image} />
        <meta property="og:image:width" content={String(OG_IMAGE_SIZE.width)} />
        <meta property="og:image:height" content={String(OG_IMAGE_SIZE.height)} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={site.title} />
        <meta name="twitter:description" content={site.description} />
        <meta name="twitter:image" content={image} />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `html, body, #root { height: 100%; }
body { margin: 0; background: #FFFFFF; }
#root { display: flex; flex-direction: column; min-height: 100%; }
* { box-sizing: border-box; }
img { max-width: 100%; height: auto; }
input, textarea, select, button { outline: none !important; box-shadow: none !important; }
input:focus, textarea:focus, select:focus, button:focus,
input:focus-visible, textarea:focus-visible, select:focus-visible, button:focus-visible {
  outline: none !important;
  box-shadow: none !important;
  border-color: transparent !important;
}
button, [role="button"], a { cursor: pointer; }
@media (min-width: 720px) {
  body { background: #E4E9F2; }
}
@media (max-width: 719px) {
  body { background: #FFFFFF; }
}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
