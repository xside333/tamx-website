// Утилита для получения лошадиных сил
import { pool } from './dbClient.js';

/**
 * Получает hp для автомобиля по его характеристикам
 * @param {Object} car - объект с данными авто
 * @returns {Promise<number>} - hp или 0 если не найдено
 */
export async function getHorsepower(car) {
  const client = await pool.connect();
  try {
    // Используем английские названия для поиска
    const manufacturer = car.manufacturerenglishname;
    const modelgroup = car.modelgroupenglishname;
    const model = car.modelname; // это уже может быть переведено, нужно использовать оригинал или modelfilter
    const grade = car.gradeenglishname || car.gradename;
    const fuel = car.fuelname; // корейское название
    const cartype = car.cartype;

    // Сначала пробуем найти по английским названиям
    let result = await client.query(`
      SELECT hp
      FROM cars_horsepower
      WHERE cartype = $1
        AND manufacturerenglishname = $2
        AND modelgroupenglishname = $3
        AND modelname = $4
        AND gradeenglishname = $5
        AND fuelname = $6
        AND hp IS NOT NULL
        AND hp > 0
      LIMIT 1
    `, [cartype, manufacturer, modelgroup, model, grade, fuel]);

    if (result.rows.length > 0 && result.rows[0].hp) {
      return Number(result.rows[0].hp);
    }

    // Если не нашли, возвращаем 0
    return 0;
  } catch (error) {
    console.error(`Ошибка при получении hp для авто ${car.id}: ${error.message}`);
    return 0;
  } finally {
    client.release();
  }
}

/**
 * Получает hp для массива автомобилей (батч)
 * Просто берёт hp из encar_db_prod, который УЖЕ обновлён через syncHpToProd()
 * @param {Array} cars - массив объектов с данными авто (из encar_db_prod)
 * @returns {Promise<Map<number, number>>} - Map где ключ = car.id, значение = hp
 */
export async function getHorsepowerBatch(cars) {
  if (!cars || cars.length === 0) return new Map();

  const hpMap = new Map();
  
  // Просто берём hp из encar_db_prod, который УЖЕ загружен в объект car
  // Вся логика поиска hp выполнена в syncHpToProd() ДО расчётов
  for (const car of cars) {
    hpMap.set(car.id, car.hp || 0);
  }

  return hpMap;
}

