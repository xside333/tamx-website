import { useCallback, useEffect, useState } from 'react';
import { getFromStorage, setToStorage } from '../lib/utils';
import { Car } from '../types';

const FAVORITES_STORAGE_KEY = 'tarasov-auto-favorites';

export const useFavorites = () => {
  // Ленивая инициализация из localStorage, чтобы не перетирать сохранённые данные пустым массивом
  const [favoriteCars, setFavoriteCars] = useState<Car[]>(() => getFromStorage<Car[]>(FAVORITES_STORAGE_KEY, []));

  // Сохраняем в localStorage при изменении
  useEffect(() => {
    setToStorage(FAVORITES_STORAGE_KEY, favoriteCars);
  }, [favoriteCars]);

  const addToFavorites = useCallback((car: Car) => {
    setFavoriteCars(prev => {
      if (prev.some(favCar => favCar.id === car.id)) return prev;
      return [...prev, { ...car, unavailable: false }];
    });
  }, []);

  const removeFromFavorites = useCallback((carId: string) => {
    setFavoriteCars(prev => prev.filter(car => car.id !== carId));
  }, []);

  const toggleFavorite = useCallback((car: Car) => {
    setFavoriteCars(prev => {
      const exists = prev.some(favCar => favCar.id === car.id);
      if (exists) {
        return prev.filter(favCar => favCar.id !== car.id);
      }
      return [...prev, { ...car, unavailable: false }];
    });
  }, []);

  const isFavorite = useCallback((carId: string) => {
    return favoriteCars.some(car => car.id === carId);
  }, [favoriteCars]);

  // Помечаем конкретный сохранённый автомобиль как недоступный (без отдельного списка)
  const markUnavailable = useCallback((carId: string) => {
    setFavoriteCars(prev => prev.map(c => (c.id === carId ? { ...c, unavailable: true } : c)));
  }, []);

  const markAvailable = useCallback((carId: string) => {
    setFavoriteCars(prev => prev.map(c => (c.id === carId ? { ...c, unavailable: false } : c)));
  }, []);

  const clearFavorites = useCallback(() => {
    setFavoriteCars([]);
  }, []);

  const getFavoriteCar = useCallback((carId: string) => {
    return favoriteCars.find(car => car.id === carId);
  }, [favoriteCars]);

  return {
    favoriteCars,
    favoriteCarIds: favoriteCars.map(car => car.id),
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    markUnavailable,
    markAvailable,
    clearFavorites,
    getFavoriteCar,
    hasFavorites: favoriteCars.length > 0,
    favoritesCount: favoriteCars.length,
  };
};
