import { useCallback, useEffect, useState } from 'react';
import { getFromStorage, setToStorage } from '../lib/utils';
import { Car } from '../types';

const FAVORITES_STORAGE_KEY = 'tarasov-auto-favorites-ids';
const OLD_FAVORITES_KEY = 'tarasov-auto-favorites';
const FAVORITES_CHANGE_EVENT = 'favorites-changed';

/**
 * Извлекает ID из различных форматов данных избранного
 */
function extractFavoriteIds(): string[] {
  try {
    // Сначала проверяем новый формат
    const newFormat = getFromStorage<unknown>(FAVORITES_STORAGE_KEY, null);
    if (newFormat && Array.isArray(newFormat)) {
      // Фильтруем и валидируем - оставляем только строки (ID)
      const validIds = newFormat
        .map(item => {
          // Если это объект с полем id (старый формат попал в новый ключ)
          if (typeof item === 'object' && item !== null && 'id' in item) {
            return String((item as any).id);
          }
          // Если это строка - ID напрямую
          if (typeof item === 'string') {
            return item;
          }
          // Если это число - конвертируем в строку
          if (typeof item === 'number') {
            return String(item);
          }
          return null;
        })
        .filter((id): id is string => id !== null && id !== '');
      
      if (validIds.length > 0) {
        // Сохраняем очищенный формат
        setToStorage(FAVORITES_STORAGE_KEY, validIds);
        return validIds;
      }
    }

    // Проверяем старый формат (массив объектов Car)
    const oldFormat = getFromStorage<unknown>(OLD_FAVORITES_KEY, null);
    if (oldFormat && Array.isArray(oldFormat)) {
      const ids = oldFormat
        .map(car => {
          if (typeof car === 'object' && car !== null && 'id' in car) {
            return String((car as any).id);
          }
          return null;
        })
        .filter((id): id is string => id !== null && id !== '');
      
      if (ids.length > 0) {
        // Мигрируем в новый формат
        setToStorage(FAVORITES_STORAGE_KEY, ids);
        localStorage.removeItem(OLD_FAVORITES_KEY);
        return ids;
      }
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Диспатчит кастомное событие для синхронизации между компонентами
 */
function dispatchFavoritesChange() {
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT));
}

export const useFavorites = () => {
  // Храним только ID автомобилей в localStorage
  const [favoriteCarIds, setFavoriteCarIds] = useState<string[]>(() => extractFavoriteIds());

  // Подписываемся на изменения из других компонентов и вкладок
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FAVORITES_STORAGE_KEY) {
        setFavoriteCarIds(extractFavoriteIds());
      }
    };

    const handleFavoritesChange = () => {
      setFavoriteCarIds(extractFavoriteIds());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(FAVORITES_CHANGE_EVENT, handleFavoritesChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(FAVORITES_CHANGE_EVENT, handleFavoritesChange);
    };
  }, []);

  const addToFavorites = useCallback((car: Car) => {
    setFavoriteCarIds(prev => {
      if (prev.includes(car.id)) return prev;
      const next = [...prev, car.id];
      setToStorage(FAVORITES_STORAGE_KEY, next);
      dispatchFavoritesChange();
      return next;
    });
  }, []);

  const removeFromFavorites = useCallback((carId: string) => {
    setFavoriteCarIds(prev => {
      const next = prev.filter(id => id !== carId);
      setToStorage(FAVORITES_STORAGE_KEY, next);
      dispatchFavoritesChange();
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((car: Car) => {
    setFavoriteCarIds(prev => {
      const exists = prev.includes(car.id);
      const next = exists
        ? prev.filter(id => id !== car.id)
        : [...prev, car.id];
      setToStorage(FAVORITES_STORAGE_KEY, next);
      dispatchFavoritesChange();
      return next;
    });
  }, []);

  const isFavorite = useCallback((carId: string) => {
    return favoriteCarIds.includes(carId);
  }, [favoriteCarIds]);

  const clearFavorites = useCallback(() => {
    setFavoriteCarIds([]);
    setToStorage(FAVORITES_STORAGE_KEY, []);
    dispatchFavoritesChange();
  }, []);

  return {
    favoriteCarIds,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    hasFavorites: favoriteCarIds.length > 0,
    favoritesCount: favoriteCarIds.length,
  };
};
