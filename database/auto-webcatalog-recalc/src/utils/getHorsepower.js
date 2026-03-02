/**
 * Утилита получения HP для батча авто
 * Для encar: hp из encar_db_prod (уже загружен в объект car)
 * Для che168: power из che168_autoparser (уже загружен)
 */
import { pool } from './dbClient.js';

/**
 * Получает hp для массива encar авто (из encar_db_prod)
 * @param {Array} cars — массив объектов из encar_db_prod
 * @returns {Promise<Map<number, number>>} — Map: car.id → hp
 */
export async function getHorsepowerBatch(cars) {
  if (!cars || cars.length === 0) return new Map();
  const hpMap = new Map();
  for (const car of cars) {
    hpMap.set(car.id, car.hp || 0);
  }
  return hpMap;
}
