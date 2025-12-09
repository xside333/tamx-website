import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function heroCard(req, res) {
  try {
    const client = await pool.connect();

    // Основной запрос с условием по дате и trust
    const query = `
      SELECT json FROM encar_webcatalog
      WHERE trust != '1'
        AND firstadvertiseddatetime >= NOW() - INTERVAL '1 day'
      ORDER BY (yearmonth::int >= 202201) DESC, firstadvertiseddatetime DESC
      LIMIT 1;
    `;

    let { rows } = await client.query(query);

    // Если нет подходящих объявлений, fallback-запрос без даты
    if (rows.length === 0) {
      const fallbackQuery = `
        SELECT json FROM encar_webcatalog
        WHERE trust != '1'
        ORDER BY (yearmonth::int >= 202201) DESC, firstadvertiseddatetime DESC
        LIMIT 1;
      `;
      const fallbackResult = await client.query(fallbackQuery);
      rows = fallbackResult.rows;
    }

    // Получаем общее количество авто
    const totalCarsQuery = `SELECT COUNT(*) FROM encar_webcatalog;`;
    const totalCarsResult = await client.query(totalCarsQuery);
    const totalcars = parseInt(totalCarsResult.rows[0].count, 10);

    client.release();

    if (rows.length > 0) {
      res.json({ totalcars, json: rows[0].json });
    } else {
      res.status(404).json({ error: 'Нет подходящих объявлений.', totalcars });
    }

  } catch (error) {
    console.error('Ошибка при получении heroCard:', error);
    res.status(500).json({ error: 'Ошибка сервера.' });
  }
}
