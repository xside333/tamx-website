import fs from 'fs';
import path from 'path';

export function getFilters(req, res) {
  // Сначала пробуем auto_filters.json (новая объединённая таблица)
  const autoFiltersPath = path.resolve(process.cwd(), 'cacheFiles', 'auto_filters.json');
  const legacyFiltersPath = path.resolve(process.cwd(), 'cacheFiles', 'filters.json');

  const filtersPath = fs.existsSync(autoFiltersPath) ? autoFiltersPath : legacyFiltersPath;

  try {
    const filters = JSON.parse(fs.readFileSync(filtersPath, 'utf8'));
    res.json(filters);
  } catch (error) {
    console.error('❌ Ошибка при отправке фильтров:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении фильтров.' });
  }
}
