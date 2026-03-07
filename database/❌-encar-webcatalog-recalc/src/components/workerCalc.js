import { parentPort, workerData } from 'worker_threads';
import { fetchDataByOffset } from './fetchData.js';
import { calculateBatch } from './calculateBatch.js';
import { updateData } from './updateData.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import os from 'os';

(async () => {
  try {
    const { offset, limit, references } = workerData;
    const fetchBatchSize = config.fetchBatchSize || 100;
    const insertBatchSize = config.insertBatchSize || 50;

    let processed = 0;
    let totalRowsProcessed = 0;

    // Динамический throttling (мс)
    let throttle = 1000;            // стартовое значение паузы
    const throttleMin = 500;        // минимальная пауза
    const throttleMax = 6000;       // максимальная пауза
    const highLoad = 0.32;          // если >32% — увеличиваем throttle
    const lowLoad = 0.30;           // если <30% — уменьшаем throttle

    let logCounter = 0;             // <- счётчик для редких логов

    const getRelativeLoad = () => {
      // os.loadavg()[0] / os.cpus().length — текущая загрузка системы (0.35 = 35%)
      return os.loadavg()[0] / os.cpus().length;
    };

    while (processed < limit) {
      const batchRows = await fetchDataByOffset(offset + processed, Math.min(fetchBatchSize, limit - processed));
      if (!batchRows.length) break;

      // Throttle-пауза после fetch
      await new Promise(res => setTimeout(res, throttle));

      for (let i = 0; i < batchRows.length; i += insertBatchSize) {
        const chunk = batchRows.slice(i, i + insertBatchSize);
        const calculated = await calculateBatch(chunk, references);
        await updateData(calculated);

        totalRowsProcessed += chunk.length;
        logCounter++;

        // Лог прогресса — только раз в 5 вставочных батчей
        if (logCounter % 5 === 0) {
          logger && logger(`🧵 Воркер: загружено ${totalRowsProcessed}/${limit} строк`);
        }

        // Динамическая пауза после insertBatch
        const load = getRelativeLoad();
        if (load > highLoad) {
          throttle = Math.min(throttle + 100, throttleMax); // увеличиваем паузу
        } else if (load < lowLoad) {
          throttle = Math.max(throttle - 50, throttleMin); // уменьшаем паузу
        } else {
          // при средней загрузке медленно уменьшаем паузу (плавное ускорение)
          throttle = Math.max(throttle - 20, throttleMin);
        }

        // Лог throttling — тоже раз в 5 вставочных батчей
        if (logCounter % 5 === 0) {
          logger && logger(`⚡ Throttling: ${throttle}мс (CPU load ${Math.round(load * 100)}%)`);
        }

        await new Promise(res => setTimeout(res, throttle));
      }

      processed += batchRows.length;
    }

    parentPort.postMessage({ status: 'done', rowsProcessed: totalRowsProcessed });
  } catch (e) {
    parentPort.postMessage({ status: 'error', error: e.message });
  }
})();
