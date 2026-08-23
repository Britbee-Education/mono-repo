import type { Metadata } from "next";
import localFont from "next/font/local";
import { HTML_LANG, nextMetadata } from "@britbee/config";
import "./globals.css";

const satoshi = localFont({
  src: [
    { path: "../fonts/Satoshi-Light.otf", weight: "300", style: "normal" },
    { path: "../fonts/Satoshi-Regular.otf", weight: "400", style: "normal" },
    { path: "../fonts/Satoshi-Medium.otf", weight: "500", style: "normal" },
    { path: "../fonts/Satoshi-Bold.otf", weight: "700", style: "normal" },
    { path: "../fonts/Satoshi-Black.otf", weight: "900", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  ...nextMetadata("office"),
  icons: { icon: "/icon.png", apple: "/icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={HTML_LANG}>
      <body className={`${satoshi.variable} ${satoshi.className}`}>{children}</body>
    </html>
  );
}
