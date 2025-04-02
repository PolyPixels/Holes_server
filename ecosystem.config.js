// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "holes-server",
      script: "./server.js",       // entry point
      watch: false,                // disable in prod
      autorestart: true,           // restart on crash
      max_restarts: 5,             // avoid infinite loops
      restart_delay: 2000,         // wait before restarting
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
