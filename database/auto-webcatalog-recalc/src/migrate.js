/**
 * Миграция: создание таблицы auto_webcatalog
 * Запуск: node src/migrate.js
 */
import { pool } from './utils/dbClient.js';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS auto_webcatalog (
  id TEXT PRIMARY KEY,
  source CHAR(1) NOT NULL,
  url TEXT,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  generation TEXT,
  generation_filter TEXT,
  grade TEXT,
  grade_en TEXT,
  year INTEGER NOT NULL,
  month INTEGER,
  yearmonth_raw TEXT,
  mileage INTEGER,
  color TEXT,
  color_filter TEXT,
  fuel_type TEXT,
  fuel_filter TEXT,
  transmission TEXT,
  body_type TEXT,
  displacement NUMERIC,
  hp INTEGER,
  price_original NUMERIC NOT NULL,
  price_currency TEXT NOT NULL,
  address TEXT,
  seller_type TEXT,
  photos JSONB,
  offer_date TIMESTAMP,
  category TEXT NOT NULL,
  totalprice_rub NUMERIC,
  totalprice_usd NUMERIC,
  json JSONB NOT NULL,
  accident_count INTEGER,
  accident_cost NUMERIC,
  inspection_outers JSONB,
  seat_count INTEGER,
  trust TEXT,
  vehicle_no TEXT,
  view_count INTEGER,
  drive_type TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_wc_source ON auto_webcatalog(source);
CREATE INDEX IF NOT EXISTS idx_auto_wc_brand ON auto_webcatalog(brand);
CREATE INDEX IF NOT EXISTS idx_auto_wc_drive_type ON auto_webcatalog(drive_type);
CREATE INDEX IF NOT EXISTS idx_auto_wc_model ON auto_webcatalog(model);
CREATE INDEX IF NOT EXISTS idx_auto_wc_category ON auto_webcatalog(category);
CREATE INDEX IF NOT EXISTS idx_auto_wc_totalprice ON auto_webcatalog(totalprice_rub);
CREATE INDEX IF NOT EXISTS idx_auto_wc_offer_date ON auto_webcatalog(offer_date DESC);
CREATE INDEX IF NOT EXISTS idx_auto_wc_year ON auto_webcatalog(year);
CREATE INDEX IF NOT EXISTS idx_auto_wc_fuel ON auto_webcatalog(fuel_filter);
CREATE INDEX IF NOT EXISTS idx_auto_wc_color ON auto_webcatalog(color_filter);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔧 Создание таблицы auto_webcatalog...');
    await client.query(MIGRATION_SQL);
    console.log('✅ Таблица auto_webcatalog и индексы созданы успешно');
  } catch (error) {
    console.error('❌ Ошибка миграции:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
