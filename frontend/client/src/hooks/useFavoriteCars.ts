import { useQueries } from '@tanstack/react-query';
import { getCar } from '../lib/api';
import { transformApiCarToCar } from '../lib/apiTransforms';
import { Car } from '../types';

/**
 * Хук для загрузки данных избранных автомобилей по их ID
 * Делает параллельные запросы на бекенд для каждого ID
 */
export const useFavoriteCars = (favoriteIds: string[]) => {
  // Фильтруем пустые/невалидные ID
  const validIds = favoriteIds.filter(id => id && typeof id === 'string' && id.trim() !== '');

  const queries = useQueries({
    queries: validIds.map(id => ({
      // Используем отдельный ключ чтобы избежать конфликта с кэшем детальной страницы
      // (детальная страница кэширует сырые API данные, а нам нужны трансформированные)
      queryKey: ['favorite-car', id],
      queryFn: async (): Promise<Car> => {
        try {
          const apiCar = await getCar(id);
          const car = transformApiCarToCar(apiCar);
          // Валидируем, что получили корректные данные
          if (!car || !car.id) {
            throw new Error('Invalid car data');
          }
          return car;
        } catch (error) {
          // Если автомобиль не найден (404) или ошибка, возвращаем минимальный объект
          return {
            id,
            name: 'Автомобиль',
            brand: '',
            model: '',
            price: 0,
            year: 0,
            mileage: 0,
            fuel: '',
            engine: '',
            location: '',
            photos: ['/placeholder.svg'],
            unavailable: true,
          } as Car;
        }
      },
      staleTime: 1 * 60 * 1000, // 1 минута
      gcTime: 5 * 60 * 1000, // 5 минут
      retry: 1,
    })),
  });

  // Извлекаем данные из всех запросов
  const favoriteCars = queries
    .map(query => query.data)
    .filter((car): car is Car => car !== undefined && car !== null && !!car.id);

  // Проверяем состояние загрузки - показываем загрузку пока хотя бы один запрос загружается
  const isLoading = queries.length > 0 && queries.some(query => query.isLoading);
  const isError = queries.some(query => query.isError);

  // Фильтруем только доступные автомобили
  const availableCars = favoriteCars.filter(car => !car.unavailable);

  return {
    favoriteCars,
    availableCars,
    isLoading,
    isError,
  };
};

