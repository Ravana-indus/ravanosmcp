module.exports = {
  apps: [
    {
      name: 'erpnext-mcp-server',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'cluster',

      // Environment
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0'
      },

      // Resources
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=4096',

      // Logs
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_file: './logs/combined.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',

      // Monitoring
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,

      // Advanced
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],

      // Environment variables
      env_file: '.env.production'
    }
  ],

  deploy: {
    production: {
      user: 'erpnext',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/erpnext-mcp-server.git',
      path: '/var/www/erpnext-mcp-server',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:prod && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};