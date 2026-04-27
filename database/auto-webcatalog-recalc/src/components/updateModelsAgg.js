/**
 * Пересборка агрегированной таблицы auto_models_agg.
 * Вызывается в конце большого цикла auto-recalc.
 *
 * Таблица хранит агрегаты по уникальным комбинациям (brand, model, source, fuel_type, color_filter).
 * fuel_type нормализуется к 5 значениям: Бензин, Дизель, Электро, Гибрид, Газ.
 * Поле photos_preview хранит до 4 URL превью-фото:
 *   - Корея (source='K'): объявления с фото code='001', строим полный URL через ci.encar.com
 *   - Китай  (source='C'): объявления у которых photos — массив строк-URL, берём первые 4
 * Приоритет: корейские фото > китайские (если модель есть и там, и там).
 */
import { pool } from '../utils/dbClient.js';
import { logger } from '../utils/logger.js';

const ENCAR_IMAGE_PARAMS = 'impolicy=heightRate&rh=320&cw=480&ch=320&cg=Center&wtmk=https://ci.encar.com/wt_mark/w_mark_04.png';

// SQL CASE-выражение для нормализации fuel_type к 5 стандартным значениям.
// NULL означает "не показывать" (Водород, Не указан и прочие неизвестные).
const FUEL_TYPE_NORMALIZE_SQL = `
  CASE fuel_type
    WHEN 'Бензин'            THEN 'Бензин'
    WHEN 'Бензиновый'        THEN 'Бензин'
    WHEN 'Дизель'            THEN 'Дизель'
    WHEN 'Дизельный'         THEN 'Дизель'
    WHEN 'Электро'           THEN 'Электро'
    WHEN 'Бензин + Электро'  THEN 'Гибрид'
    WHEN 'Дизель + Электро'  THEN 'Гибрид'
    WHEN 'Газ + Электро'     THEN 'Гибрид'
    WHEN 'Газ (общая продажа)' THEN 'Газ'
    WHEN 'Бензин + Газ'      THEN 'Газ'
    WHEN 'CNG'               THEN 'Газ'
    WHEN '가솔린+CNG'        THEN 'Газ'
    ELSE NULL
  END
`;

export async function updateModelsAgg() {
  const client = await pool.connect();
  const startTs = Date.now();

  try {
    logger('📊 updateModelsAgg: пересборка агрегированной таблицы...');

    await client.query('BEGIN');

    // Атомарная замена через TRUNCATE + INSERT.
    // fuel_type группируется уже по нормализованному значению.
    await client.query('TRUNCATE TABLE auto_models_agg');

    await client.query(`
      INSERT INTO auto_models_agg (
        brand, model, source, fuel_type, color_filter,
        ads_count,
        year_min, year_max,
        price_min, price_max,
        displacement_min, displacement_max,
        hp_min, hp_max,
        mileage_min, mileage_max,
        updated_at
      )
      SELECT
        brand,
        model,
        source,
        COALESCE(${FUEL_TYPE_NORMALIZE_SQL}, '') AS fuel_type,
        COALESCE(color_filter, '')               AS color_filter,
        COUNT(*)                     AS ads_count,
        MIN(year)                    AS year_min,
        MAX(year)                    AS year_max,
        MIN(totalprice_rub)  FILTER (WHERE totalprice_rub > 0)  AS price_min,
        MAX(totalprice_rub)  FILTER (WHERE totalprice_rub > 0)  AS price_max,
        MIN(displacement)    FILTER (WHERE displacement > 0)    AS displacement_min,
        MAX(displacement)    FILTER (WHERE displacement > 0)    AS displacement_max,
        MIN(hp)              FILTER (WHERE hp > 0)              AS hp_min,
        MAX(hp)              FILTER (WHERE hp > 0)              AS hp_max,
        MIN(mileage)         FILTER (WHERE mileage > 0)         AS mileage_min,
        MAX(mileage)         FILTER (WHERE mileage > 0)         AS mileage_max,
        now()
      FROM auto_webcatalog
      GROUP BY brand, model, source, COALESCE(${FUEL_TYPE_NORMALIZE_SQL}, ''), COALESCE(color_filter, '')
    `);

    // Корейские фото: до 4 URL из объявлений с code='001'
    await client.query(`
      UPDATE auto_models_agg agg
      SET photos_preview = photos.urls
      FROM (
        SELECT brand, model, array_agg(photo_url ORDER BY rn) AS urls
        FROM (
          SELECT
            brand,
            model,
            'https://ci.encar.com' || (
              SELECT p->>'path'
              FROM jsonb_array_elements(photos) AS p
              WHERE p->>'code' = '001'
              LIMIT 1
            ) || $1 AS photo_url,
            ROW_NUMBER() OVER (PARTITION BY brand, model ORDER BY id) AS rn
          FROM auto_webcatalog
          WHERE source = 'K'
            AND photos IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(photos) AS p
              WHERE p->>'code' = '001'
            )
        ) sub
        WHERE photo_url IS NOT NULL AND rn <= 4
        GROUP BY brand, model
      ) photos
      WHERE agg.brand = photos.brand AND agg.model = photos.model
    `, [`?${ENCAR_IMAGE_PARAMS}`]);

    // Китайские фото: для моделей у которых нет корейских фото,
    // берём до 4 URL (строки) из первых попавшихся китайских объявлений.
    await client.query(`
      UPDATE auto_models_agg agg
      SET photos_preview = photos.urls
      FROM (
        SELECT brand, model, array_agg(photo_url ORDER BY rn) AS urls
        FROM (
          SELECT
            brand,
            model,
            photos->>0 AS photo_url,
            ROW_NUMBER() OVER (PARTITION BY brand, model ORDER BY id) AS rn
          FROM auto_webcatalog
          WHERE source = 'C'
            AND photos IS NOT NULL
            AND jsonb_typeof(photos) = 'array'
            AND jsonb_array_length(photos) > 0
            AND (photos->>0) IS NOT NULL
        ) sub
        WHERE photo_url IS NOT NULL AND rn <= 4
        GROUP BY brand, model
      ) photos
      WHERE agg.brand = photos.brand
        AND agg.model = photos.model
        AND (agg.photos_preview IS NULL OR array_length(agg.photos_preview, 1) IS NULL)
    `);

    await client.query('COMMIT');

    const elapsed = Math.round((Date.now() - startTs) / 100) / 10;
    const { rows } = await client.query('SELECT COUNT(*) AS cnt FROM auto_models_agg');
    logger(`✅ updateModelsAgg: ${rows[0].cnt} строк, ${elapsed} с`);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    logger(`❌ updateModelsAgg: ошибка — ${e.message}`);
    throw e;
  } finally {
    client.release();
  }
}

