export const config = {
  testMode: false,
  fetchBatchSize: 200,
  insertBatchSize: 50,
  recalculationIntervalMinutes: 300,
  syncIntervalMinutes: 2,
  maxLogRecords: 350,
  vacuumAnalyzeInterval: 24,
  // Фильтр типов топлива для che168 (только бензин и дизель для расчёта таможни)
  che168FuelFilter: ['Бензиновый', 'Дизельный'],
};
