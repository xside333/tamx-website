import { pool } from './utils/dbClient.js';
import { logger } from './utils/logger.js';

async function cleanUpObsoleteCars() {
  const client = await pool.connect();
  try {
    logger('🧹 Начинаем очистку неактуальных записей...');

    const res = await client.query(`
      DELETE FROM encar_webcatalog
      WHERE id NOT IN (SELECT id FROM encar_db_prod);
    `);

    logger(`✅ Очистка завершена. Удалено строк: ${res.rowCount}`);
  } catch (error) {
    logger(`❌ Ошибка очистки: ${error.message}`);
  } finally {
    client.release();
  }
}

cleanUpObsoleteCars();
