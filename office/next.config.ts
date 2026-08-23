import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@britbee/config"],
  distDir: process.env.NEXT_DIST_DIR || ".next-dev",
};

export default nextConfig;
