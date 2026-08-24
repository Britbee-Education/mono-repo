/**
 * PM2 ecosystem (JS). Prefer deploy/pm2.ecosystem.json on the VPS (PM2 7).
 */
const path = require("path");
const root = path.resolve(__dirname, "..");

module.exports = {
  apps: [
    {
      name: "britbee-api",
      cwd: path.join(root, "api"),
      script: "pnpm",
      args: "start",
      interpreter: "none",
      env: { NODE_ENV: "production" },
    },
    {
      name: "britbee-office",
      cwd: path.join(root, "office"),
      script: "pnpm",
      args: "start",
      interpreter: "none",
      env: { NODE_ENV: "production", NEXT_DIST_DIR: ".next-build" },
    },
  ],
};
