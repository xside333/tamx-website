module.exports = {
  apps: [{
    name: 'tarasov-auto-frontend',
    script: 'server.js',
    cwd: __dirname,
    instances: 'max',             // поднимет столько воркеров, сколько CPU-ядер
    exec_mode: 'cluster',

    // Лимиты и стабильность
    max_memory_restart: '1G',     // рестарт воркера при >1GB памяти
    node_args: '--max-old-space-size=1024',
    kill_timeout: 5000,           // даём 5 секунд на graceful shutdown
    restart_delay: 5000,          // пауза 5 секунд между рестартами воркеров
    max_restarts: 10,             // максимум 10 рестартов при фейлах
    min_uptime: '10s',            // воркер считается успешно поднятым, если живёт >10 сек

    // Окружение
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8000
    },

    // Логи
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
