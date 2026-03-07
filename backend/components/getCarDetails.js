import { pool } from '../utils/dbClient.js';

export const getCarDetails = async (req, res) => {
  const { id } = req.params;

  // ID теперь текстовый: "12345_en" или "S67890_ch"
  if (!id || typeof id !== 'string' || id.length < 3) {
    return res.status(400).json({ error: 'Некорректный ID автомобиля' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, json, hp, source, yearmonth_raw, year, url FROM auto_webcatalog WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    const row = rows[0];
    // Добавляем hp, source и yearmonth_raw в ответ
    const result = {
      ...row.json,
      car_id: row.id,                    // ID с суффиксом (_en / _ch)
      hp: row.hp ?? 0,
      source: row.source ?? null,
      yearmonth_raw: row.yearmonth_raw ?? null,
      year: row.year ?? null,
      original_url: row.url ?? null,     // Ссылка на оригинальное объявление (Китай/Корея)
    };

    res.json(result);
  } catch (error) {
    console.error('Ошибка при запросе к БД:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};
