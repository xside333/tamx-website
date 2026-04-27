import { pool } from '../utils/dbClient.js';

export async function heroCard(req, res) {
  const client = await pool.connect();
  try {
    // Основной запрос с условием по дате и trust
    const query = `
      SELECT json, hp FROM encar_webcatalog
      WHERE trust != '1'
        AND firstadvertiseddatetime >= NOW() - INTERVAL '1 day'
      ORDER BY (yearmonth::int >= 202201) DESC, firstadvertiseddatetime DESC
      LIMIT 1;
    `;

    let { rows } = await client.query(query);

    // Если нет подходящих объявлений, fallback-запрос без даты
    if (rows.length === 0) {
      const fallbackQuery = `
        SELECT json, hp FROM encar_webcatalog
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

    if (rows.length > 0) {
      const carData = {
        ...rows[0].json,
        hp: rows[0].hp ?? 0
      };
      res.json({ totalcars, json: carData });
    } else {
      res.status(404).json({ error: 'Нет подходящих объявлений.', totalcars });
    }

  } catch (error) {
    console.error('Ошибка при получении heroCard:', error);
    res.status(500).json({ error: 'Ошибка сервера.' });
  } finally {
    client.release();
  }
}
