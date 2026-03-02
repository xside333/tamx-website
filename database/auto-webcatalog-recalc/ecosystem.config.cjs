module.exports = {
  apps: [
    {
      name: 'auto-recalc',
      script: 'src/index.js',
      cwd: __dirname,
      node_args: '--expose-gc',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
