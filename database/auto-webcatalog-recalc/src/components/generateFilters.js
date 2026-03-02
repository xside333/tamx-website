/**
 * Генерация auto_filters.json из auto_webcatalog
 * Структура: { brand: { model: { generation: [grades] } } }
 * Для Korean (source='K') — brand/model/generation/grade_en
 * Для Chinese (source='C') — brand/model (generation и grade = null)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../utils/dbClient.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь: backend/cacheFiles/auto_filters.json
const OUTPUT_FILE = path.resolve(__dirname, '../../../../backend/cacheFiles/auto_filters.json');

const sortKeys = (obj) =>
  Object.keys(obj).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

export async function generateFilters() {
  const client = await pool.connect();
  try {
    logger('📋 Генерация auto_filters.json...');

    const { rows } = await client.query(`
      SELECT DISTINCT
        brand,
        model,
        generation,
        grade_en
      FROM auto_webcatalog
      WHERE brand IS NOT NULL AND model IS NOT NULL
      ORDER BY brand, model, generation, grade_en
    `);

    const filters = {};

    for (const { brand, model, generation, grade_en } of rows) {
      if (!filters[brand]) filters[brand] = {};
      if (!filters[brand][model]) filters[brand][model] = {};

      // Korean cars: generation + grade
      if (generation) {
        if (!filters[brand][model][generation]) {
          filters[brand][model][generation] = [];
        }
        if (grade_en && !filters[brand][model][generation].includes(grade_en)) {
          filters[brand][model][generation].push(grade_en);
        }
      }
      // Chinese cars: no generation/grade — brand+model only (already added above)
    }

    // Сортировка
    const sorted = {};
    sortKeys(filters).forEach((brand) => {
      sorted[brand] = {};
      sortKeys(filters[brand]).forEach((model) => {
        sorted[brand][model] = {};
        sortKeys(filters[brand][model]).forEach((gen) => {
          sorted[brand][model][gen] = filters[brand][model][gen].sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true })
          );
        });
      });
    });

    // Создаём директорию если нет
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sorted, null, 2));

    const brandCount = Object.keys(sorted).length;
    const totalModels = Object.values(sorted).reduce((s, m) => s + Object.keys(m).length, 0);
    logger(`✅ auto_filters.json: ${brandCount} марок, ${totalModels} моделей → ${OUTPUT_FILE}`);
  } catch (error) {
    logger(`❌ Ошибка генерации фильтров: ${error.message}`);
  } finally {
    client.release();
  }
}
