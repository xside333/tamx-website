/**
 * Маппинг марок и моделей che168 → unified (формат encar_db_prod)
 * Использует mapping-brands-models.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mappingPath = path.resolve(__dirname, '../data/mapping-brands-models.json');
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));

// Быстрый Set для O(1) проверки che168-only марок
const che168OnlyBrands = new Set(mapping.brands_che168_only);

/**
 * Нормализация марки и модели che168 к единому формату
 * @param {string} che168Mark — mark из che168_autoparser
 * @param {string} che168Model — model из che168_autoparser
 * @returns {{ brand: string, model: string }}
 */
export function normalizeBrandModel(che168Mark, che168Model) {
  // Шаг 1: Если марка только в che168 — оставляем как есть
  if (che168OnlyBrands.has(che168Mark)) {
    return { brand: che168Mark, model: che168Model };
  }

  // Шаг 2: Нормализация марки
  let unifiedBrand = che168Mark;
  if (mapping.brands[che168Mark] !== undefined) {
    unifiedBrand = mapping.brands[che168Mark] ?? che168Mark;
  }

  // Шаг 3: Удаляем суффикс "(Import)" из модели
  let cleanModel = che168Model.replace(/\s*\(Import\)\s*$/i, '').trim();

  // Шаг 4: Нормализация модели через маппинг
  let unifiedModel = cleanModel;
  const brandModels = mapping.models[che168Mark];
  if (brandModels && brandModels[cleanModel] !== undefined) {
    unifiedModel = brandModels[cleanModel] ?? cleanModel;
  }

  return { brand: unifiedBrand, model: unifiedModel };
}
