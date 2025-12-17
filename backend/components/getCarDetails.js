// components/getCarDetails.js
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const getCarDetails = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'Некорректный ID автомобиля' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT json, hp FROM encar_webcatalog WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    // Добавляем hp из колонки в ответ (для проверки "нет л.с.")
    const result = {
      ...rows[0].json,
      hp: rows[0].hp ?? 0
    };

    res.json(result);
  } catch (error) {
    console.error('Ошибка при запросе к БД:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
