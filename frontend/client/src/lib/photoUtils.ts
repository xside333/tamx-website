/**
 * Утилиты для обработки фотографий автомобилей
 */

export interface PhotoPath {
  code?: string;
  cod?: string; // возможна вариация в API
  path: string;
}

/**
 * Приоритетные суффиксы для отображения в каталоге
 */
const CATALOG_PRIORITY_SUFFIXES = ['001', '002', '003', '007'];

/**
 * Регулярное выражение для извлечения числового суффикса из пути фото
 */
const PHOTO_SUFFIX_REGEX = /_(\d{3})\.jpg$/i;

/**
 * Построить полный URL изображения с обработкой для ci.encar.com
 */
export function buildImageUrl(photoPath: string): string {
  // Базовый URL для изображений с параметрами обработки
  const baseUrl = 'https://ci.encar.com';
  const imageParams = 'impolicy=heightRate&rh=320&cw=480&ch=320&cg=Center&wtmk=https://ci.encar.com/wt_mark/w_mark_04.png';
  
  // Убираем ведущий slash если есть, так как он уже включен в baseUrl
  const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  
  return `${baseUrl}${cleanPath}?${imageParams}`;
}

/**
 * Извлечь числовой суффикс из пути фотографии
 */
export function extractPhotoSuffix(photoPath: string): string | null {
  const match = photoPath.match(PHOTO_SUFFIX_REGEX);
  return match ? match[1] : null;
}

/**
 * Проверить, является ли суффикс приоритетным для каталога
 */
export function isPrioritySuffix(suffix: string): boolean {
  return CATALOG_PRIORITY_SUFFIXES.includes(suffix);
}

/**
 * Отфильтровать и отсортировать фотографии для каталога
 */
export function filterAndSortCatalogPhotos(photoPaths: PhotoPath[]): string[] {
  if (!photoPaths || photoPaths.length === 0) {
    return ['/placeholder.svg'];
  }

  // Извлекаем пути и суффиксы
  const photoData = photoPaths
    .map(photo => {
      const path = photo.path;
      const suffix = extractPhotoSuffix(path);
      return { path, suffix };
    })
    .filter(photo => photo.path); // убираем пустые пути

  // Убираем дубликаты по суффиксу
  const uniquePhotos = new Map<string, string>();
  
  photoData.forEach(photo => {
    const key = photo.suffix || photo.path; // используем суффикс или весь путь как ключ
    if (!uniquePhotos.has(key)) {
      uniquePhotos.set(key, photo.path);
    }
  });

  const uniquePhotoData = Array.from(uniquePhotos.entries()).map(([suffix, path]) => ({
    path,
    suffix: suffix === path ? null : suffix // если ключ = путь, значит суффикса нет
  }));

  // Сначала ищем приоритетные суффиксы
  const priorityPhotos = uniquePhotoData
    .filter(photo => photo.suffix && isPrioritySuffix(photo.suffix))
    .sort((a, b) => {
      const indexA = CATALOG_PRIORITY_SUFFIXES.indexOf(a.suffix!);
      const indexB = CATALOG_PRIORITY_SUFFIXES.indexOf(b.suffix!);
      return indexA - indexB;
    });

  // Если есть приоритетные фото, используем их
  if (priorityPhotos.length > 0) {
    return priorityPhotos.map(photo => buildImageUrl(photo.path));
  }

  // Если нет приоритетных, берем первые 4 доступных, сортируя по суффиксу
  const allSortedPhotos = uniquePhotoData
    .sort((a, b) => {
      // Фото с суффиксами идут первыми, сортируем по возрастанию
      if (a.suffix && b.suffix) {
        return a.suffix.localeCompare(b.suffix);
      }
      if (a.suffix && !b.suffix) return -1;
      if (!a.suffix && b.suffix) return 1;
      // Если у обоих нет суффиксов, сортируем по пути
      return a.path.localeCompare(b.path);
    })
    .slice(0, 4); // берем максимум 4 фото

  if (allSortedPhotos.length === 0) {
    return ['/placeholder.svg'];
  }

  return allSortedPhotos.map(photo => buildImageUrl(photo.path));
}

/**
 * Отфильтровать и отсортировать все фотографии для детальной страницы
 */
export function filterAndSortDetailPhotos(photoPaths: PhotoPath[]): string[] {
  if (!photoPaths || photoPaths.length === 0) {
    return ['/placeholder.svg'];
  }

  // Извлекаем пути и суффиксы
  const photoData = photoPaths
    .map(photo => {
      const path = photo.path;
      const suffix = extractPhotoSuffix(path);
      return { path, suffix };
    })
    .filter(photo => photo.path);

  // Убираем дубликаты по суффиксу
  const uniquePhotos = new Map<string, string>();
  
  photoData.forEach(photo => {
    const key = photo.suffix || photo.path;
    if (!uniquePhotos.has(key)) {
      uniquePhotos.set(key, photo.path);
    }
  });

  const uniquePhotoData = Array.from(uniquePhotos.entries()).map(([suffix, path]) => ({
    path,
    suffix: suffix === path ? null : suffix
  }));

  // Сортируем все фото по суффиксу для детальной страницы
  const sortedPhotos = uniquePhotoData.sort((a, b) => {
    if (a.suffix && b.suffix) {
      return a.suffix.localeCompare(b.suffix);
    }
    if (a.suffix && !b.suffix) return -1;
    if (!a.suffix && b.suffix) return 1;
    return a.path.localeCompare(b.path);
  });

  if (sortedPhotos.length === 0) {
    return ['/placeholder.svg'];
  }

  return sortedPhotos.map(photo => buildImageUrl(photo.path));
}

/**
 * Получить основное фото для карточки (первое из каталожных фото)
 */
export function getPrimaryPhoto(photoPaths: PhotoPath[]): string {
  const catalogPhotos = filterAndSortCatalogPhotos(photoPaths);
  return catalogPhotos[0] || '/placeholder.svg';
}
