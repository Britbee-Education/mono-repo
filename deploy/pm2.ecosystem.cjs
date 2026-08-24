/**
 * PM2 — API + Office on AIC Cloud VPS.
 * Website + Expo web: Nginx static (see nginx-ip.conf.template).
 *
 *   pm2 start deploy/pm2.ecosystem.cjs
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
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "britbee-office",
      cwd: path.join(root, "office"),
      script: "pnpm",
      args: "start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        NEXT_DIST_DIR: ".next-build",
      },
    },
  ],
};

// PM2 7 startOrReload expects deploy key present
module.exports.deploy = module.exports.deploy || {};
