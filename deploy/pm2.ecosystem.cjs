/**
 * PM2 ecosystem for AIC Cloud VPS (API + Office).
 * Website + Expo web are static files served by Nginx.
 *
 *   pm2 start deploy/pm2.ecosystem.cjs
 *   pm2 reload deploy/pm2.ecosystem.cjs --update-env
 */
module.exports = {
  apps: [
    {
      name: "britbee-api",
      cwd: __dirname + "/../api",
      script: "pnpm",
      args: "start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "britbee-office",
      cwd: __dirname + "/../office",
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
