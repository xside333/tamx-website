/**
 * Удаление неактуальных записей из auto_webcatalog
 * Encar: удаляем записи, которых нет в encar_db_prod
 * Che168: удаляем записи, которых нет в che168_autoparser
 */
import { pool } from './utils/dbClient.js';
import { logger } from './utils/logger.js';

async function cleanUpObsoleteCars() {
  const client = await pool.connect();
  try {
    logger('🧹 Очистка неактуальных записей из auto_webcatalog...');

    // Encar: удаляем _en записи, отсутствующие в encar_db_prod
    const encarRes = await client.query(`
      DELETE FROM auto_webcatalog
      WHERE source = 'K'
        AND REPLACE(id, '_en', '')::bigint NOT IN (SELECT id FROM encar_db_prod)
    `);
    logger(`🗑️ Encar: удалено ${encarRes.rowCount} записей`);

    // Che168: удаляем _ch записи, отсутствующие в che168_autoparser
    const che168Res = await client.query(`
      DELETE FROM auto_webcatalog
      WHERE source = 'C'
        AND REPLACE(id, '_ch', '') NOT IN (SELECT inner_id FROM che168_autoparser)
    `);
    logger(`🗑️ Che168: удалено ${che168Res.rowCount} записей`);

  } catch (error) {
    logger(`❌ Ошибка очистки: ${error.message}`);
  } finally {
    client.release();
  }
}

cleanUpObsoleteCars();
