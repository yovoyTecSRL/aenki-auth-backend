module.exports = {
  apps: [
    {
      name: "aenki-back",
      cwd: "/opt/aenki-back",
      script: "server.js",
      env: {
        PORT: 8000,
        HOST: "127.0.0.1",
        NODE_ENV: "production"
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/aenki-back-error.log',
      out_file: '/var/log/pm2/aenki-back-out.log',
      log_file: '/var/log/pm2/aenki-back.log'
    },
    {
      name: "aenki-auth",
      cwd: "/opt/aenki-auth",
      script: "server.js",
      env: {
        PORT: 8005,
        HOST: "127.0.0.1",
        NODE_ENV: "production",
        AE_NKI_MODE: "jwt",
        AE_NKI_JWT_SECRET: "CHANGE_THIS_TO_64_CHAR_HEX_IN_PRODUCTION",
        AE_NKI_JWT_TTL_MIN: "120",
        AE_NKI_ISSUER: "aenki.idotec.online",
        AE_NKI_ADMIN_TOKEN: "CHANGE_THIS_TO_LONG_ADMIN_TOKEN_IN_PRODUCTION"
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/var/log/pm2/aenki-auth-error.log',
      out_file: '/var/log/pm2/aenki-auth-out.log',
      log_file: '/var/log/pm2/aenki-auth.log'
    }
  ]
};
