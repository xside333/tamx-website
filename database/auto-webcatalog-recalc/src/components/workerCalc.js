/**
 * Worker thread для пересчёта батчей
 * Получает sourceType, offset, limit, references через workerData
 */
import { parentPort, workerData } from 'worker_threads';
import { fetchEncarByOffset } from './fetchEncarData.js';
import { fetchChe168ByOffset } from './fetchChe168Data.js';
import { calculateBatch } from './calculateBatch.js';
import { updateData } from './updateData.js';
import { findAndSetHp } from './hpSearchService.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import os from 'os';

(async () => {
  try {
    const { offset, limit, references, sourceType } = workerData;
    const fetchBatchSize = config.fetchBatchSize || 200;
    const insertBatchSize = config.insertBatchSize || 50;

    let processed = 0;
    let totalRowsProcessed = 0;

    // Динамический throttling
    let throttle = 1000;
    const throttleMin = 500;
    const throttleMax = 6000;
    const highLoad = 0.32;
    const lowLoad = 0.30;
    let logCounter = 0;

    const getRelativeLoad = () => os.loadavg()[0] / os.cpus().length;

    const fetchByOffset = sourceType === 'encar' ? fetchEncarByOffset : fetchChe168ByOffset;

    while (processed < limit) {
      const batchSize = Math.min(fetchBatchSize, limit - processed);
      const batchRows = await fetchByOffset(offset + processed, batchSize);
      if (!batchRows.length) break;

      // HP поиск для encar авто с hp=null/0
      if (sourceType === 'encar') {
        const nullHpRows = batchRows.filter(r => !r.hp || r.hp === 0);
        if (nullHpRows.length > 0) {
          for (const row of nullHpRows) {
            const result = await findAndSetHp(row);
            row.hp = result.hp;
          }
        }
      }

      await new Promise(res => setTimeout(res, throttle));

      for (let i = 0; i < batchRows.length; i += insertBatchSize) {
        const chunk = batchRows.slice(i, i + insertBatchSize);
        const calculated = await calculateBatch(chunk, references, sourceType);
        await updateData(calculated);

        totalRowsProcessed += chunk.length;
        logCounter++;

        if (logCounter % 5 === 0) {
          logger(`🧵 Воркер [${sourceType}]: ${totalRowsProcessed}/${limit} строк`);
        }

        const load = getRelativeLoad();
        if (load > highLoad) {
          throttle = Math.min(throttle + 100, throttleMax);
        } else if (load < lowLoad) {
          throttle = Math.max(throttle - 50, throttleMin);
        } else {
          throttle = Math.max(throttle - 20, throttleMin);
        }

        await new Promise(res => setTimeout(res, throttle));
      }

      processed += batchRows.length;
    }

    parentPort.postMessage({ status: 'done', rowsProcessed: totalRowsProcessed, sourceType });
  } catch (e) {
    parentPort.postMessage({ status: 'error', error: e.message });
  }
})();
