import fs from 'fs';
import path from 'path';

export function getFilters(req, res) {
  const filtersPath = path.resolve(process.cwd(), 'cacheFiles', 'filters.json');
  try {
    const filters = JSON.parse(fs.readFileSync(filtersPath, 'utf8'));
    res.json(filters);
  } catch (error) {
    console.error('❌ Ошибка при отправке фильтров:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении фильтров.' });
  }
}
