// components/horsePower.js
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const horsePower = async (req, res) => {
  // Поддержка GET (query) и POST (body)
  const id = req.query.id || req.body.id;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Некорректный ID автомобиля' });
  }

  try {
    // Запрос HP для конкретного автомобиля
    const hpResult = await pool.query(
      'SELECT hp FROM encar_db_prod WHERE id = $1',
      [id]
    );

    if (hpResult.rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    const hp = hpResult.rows[0].hp || 0;

    // Запрос всей таблицы util_december_2025
    const utilResult = await pool.query(
      'SELECT * FROM util_december_2025 ORDER BY id'
    );

    res.json({
      id: Number(id),
      hp,
      util_december_2025: utilResult.rows
    });
  } catch (error) {
    console.error('Ошибка при запросе HP к БД:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

