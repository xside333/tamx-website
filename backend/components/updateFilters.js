import fs from 'fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const outputDir = path.resolve(process.cwd(), 'cacheFiles');
const outputFile = path.join(outputDir, 'filters.json');

// Функция сортировки (цифры перед буквами)
const sortKeys = (obj) => Object.keys(obj).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

// Основная функция обновления фильтров
async function updateFilters() {
  try {
    const { rows } = await pool.query('SELECT * FROM car_filters');

    const transformedFilters = {};

    rows.forEach(({ manufacturerenglishname, modelgroupenglishname, modelname, gradeenglishname }) => {
      if (!transformedFilters[manufacturerenglishname]) {
        transformedFilters[manufacturerenglishname] = {};
      }

      if (!transformedFilters[manufacturerenglishname][modelgroupenglishname]) {
        transformedFilters[manufacturerenglishname][modelgroupenglishname] = {};
      }

      if (!transformedFilters[manufacturerenglishname][modelgroupenglishname][modelname]) {
        transformedFilters[manufacturerenglishname][modelgroupenglishname][modelname] = [];
      }

      if (!transformedFilters[manufacturerenglishname][modelgroupenglishname][modelname].includes(gradeenglishname)) {
        transformedFilters[manufacturerenglishname][modelgroupenglishname][modelname].push(gradeenglishname);
      }
    });

    const sortedFilters = {};
    sortKeys(transformedFilters).forEach((brand) => {
      sortedFilters[brand] = {};
      sortKeys(transformedFilters[brand]).forEach((modelGroup) => {
        sortedFilters[brand][modelGroup] = {};
        sortKeys(transformedFilters[brand][modelGroup]).forEach((model) => {
          sortedFilters[brand][modelGroup][model] = transformedFilters[brand][modelGroup][model].sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true })
          );
        });
      });
    });

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, JSON.stringify(sortedFilters, null, 2));

    console.log('✅ Файл filters.json успешно обновлен:', outputFile);
  } catch (error) {
    console.error('❌ Ошибка обновления filters.json:', error);
  } finally {
    await pool.end();
  }
}

// Интервал явно задан: 1440 минут (24 часа)
const INTERVAL_MINUTES = 1440;

async function startLoop() {
  while (true) {
    const cycleStartTime = Date.now();

    try {
      await updateFilters();
    } catch (error) {
      console.error(`❌ Критическая ошибка: ${error.message}`);
      process.exit(1);
    }

    const elapsed = Date.now() - cycleStartTime;
    const waitInterval = INTERVAL_MINUTES * 60 * 1000;
    const waitTime = waitInterval - elapsed;

    if (waitTime > 0) {
      console.log(`⏳ Ждем ${Math.round(waitTime / 60000)} минут до следующего запуска.`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    } else {
      console.log('⏳ Интервал превышен, запускаем следующий цикл немедленно.');
    }
  }
}

startLoop();
