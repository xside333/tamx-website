export const config = {
  testMode: false,
  fetchBatchSize: 200,
  insertBatchSize: 50,
  recalculationIntervalMinutes: 50,
  syncIntervalMinutes: 2,
  logFilePath: './logs/run.log',
  maxLogRecords: 350,
  vacuumAnalyzeInterval: 24 // примерно раз в сутки
};

// pm2 reload encar-recalc // Рестарт PM2 при изменении интервала
// pm2 save