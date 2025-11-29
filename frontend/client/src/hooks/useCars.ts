import { useQuery } from '@tanstack/react-query';
import { Car, Filters, SortOption, FilterOptionsResponse } from '../types';
import { getCatalog, getFilters } from '../lib/api';
import { transformApiCarToCar, transformFiltersToApiParams } from '../lib/apiTransforms';
import { FUEL_TYPES, BODY_COLORS } from '../lib/constants';

interface UseCarsParams {
  filters: Filters;
  sort: SortOption;
  page: number;
  enabled?: boolean;
}

interface CarsQueryResult {
  cars: Car[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Хук для получения каталога автомобилей
 */
export const useCars = ({ filters, sort, page, enabled = true }: UseCarsParams) => {
  return useQuery({
    queryKey: ['cars', filters, sort, page],
    queryFn: async (): Promise<CarsQueryResult> => {
      const apiParams = transformFiltersToApiParams(filters, page, sort);
      const response = await getCatalog(apiParams);

      // Локальная отладка отключена в продакшен-сборке

      // Преобразуем автомобили из API формата в UI формат
      const cars = response.cars.map((car, index) => {
        try {
          return transformApiCarToCar(car);
        } catch (error) {
          // Пропускаем проблемные автомобили
          return null;
        }
      }).filter(Boolean) as Car[];

      // Если API не сортирует правильно или нужна дополнительная сортировка по firstadvertiseddatetime
      // То сортируем на клиенте от самого молодого к самому старому
      if (sort === 'date_desc' && cars.some(car => car.firstadvertiseddatetime)) {
        cars.sort((a, b) => {
          const dateA = a.firstadvertiseddatetime ? new Date(a.firstadvertiseddatetime).getTime() : 0;
          const dateB = b.firstadvertiseddatetime ? new Date(b.firstadvertiseddatetime).getTime() : 0;
          return dateB - dateA; // От нового к старому (убывающий порядок)
        });
      }

      // Рассчитываем пагинацию (30 авто на страницу по ТЗ)
      const itemsPerPage = 30;
      const totalPages = Math.ceil(response.totalcars / itemsPerPage);

      return {
        cars,
        total: response.totalcars,
        page: response.page || page, // Если API не возвращает page, используем текущий
        totalPages,
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2, // Повторить запрос 2 раза при ошибке
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Хук для получения всех опций фильтров сразу (без зависимостей)
 */
export const useAllFilterOptions = () => {
  return useQuery({
    queryKey: ['allFilterOptions'],
    queryFn: async () => {
      // Загружаем все опции фильтров без параметров
      return await getFilters({});
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
    refetchOnMount: false, // Не перезагружать при монтировании если данные свежие
    refetchOnWindowFocus: false, // Не перезагружать при фокусе окна
    refetchOnReconnect: false, // Не перезагружать при восстановлении соединения
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Хук для получения опций фильтров (только для иерархических фильтров)
 */
export const useFilterOptions = (filters?: Partial<Filters>) => {
  return useQuery({
    queryKey: ['filterOptions', filters?.brand, filters?.model, filters?.generations],
    queryFn: async () => {
      // Формируем параметры для получения зависимых списков
      const params: any = {};
      if (filters?.brand) params.brand = filters.brand;
      if (filters?.model) {
        params.model = filters.model;
      }
      if (filters?.generations && filters.generations.length > 0) {
        params.generation = filters.generations.join(',');
      }

      return await getFilters(params);
    },
    enabled: !!filters, // Выполнять только если переданы фильтры
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
    refetchOnMount: false, // Не перезагружать при монтировании если данные свежие
    refetchOnWindowFocus: false, // Не перезагружать при фокусе окна
    refetchOnReconnect: false, // Не перезагружать при восстановлении соединения
    retry: 2, // Повторить запрос 2 раза при ошибке
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Хук для получения всех опций фильтров (включая константы)
 */
export const useDependentFilterOptions = (currentFilters: Filters) => {
  // Загружаем все опции фильтров сразу и кешируем на 24 часа
  const { data: allOptions, isLoading: allLoading, error } = useAllFilterOptions();

  // Делаем запрос для зависимых опций только если есть выбранные фильтры
  const hasFilters = !!(currentFilters.brand || currentFilters.model || currentFilters.generations.length > 0);
  const { data: dependentOptions, isLoading: dependentLoading } = useFilterOptions(
    hasFilters ? currentFilters : undefined
  );

  // Определяем общее состояние загрузки
  const isLoading = allLoading || (hasFilters && dependentLoading);

  // Используем зависимые опции если они есть, иначе показываем пустые массивы для зависимых фильтров
  const brandOptions = allOptions?.brands || [];

  // Модели показываются только если выбран бренд
  const modelOptions = currentFilters.brand ? (dependentOptions?.models || []) : [];

  // Поколения показываются только если выбрана модель
  const generationOptions = currentFilters.model ? (dependentOptions?.generations || []) : [];

  // Типы показываются только если выбрано поколение
  const typeOptions = currentFilters.generations.length > 0 ? (dependentOptions?.types || []) : [];

  return {
    // Иерархические фильтры
    brandOptions,
    modelOptions,
    generationOptions,
    typeOptions,
    
    // Константы (не из API)
    fuelOptions: FUEL_TYPES,
    colorOptions: BODY_COLORS,
    
    // Диапазоны из API (используем все опции или зависимые)
    priceRange: dependentOptions?.priceRange || allOptions?.priceRange,
    yearRange: dependentOptions?.yearRange || allOptions?.yearRange,
    mileageRange: dependentOptions?.mileageRange || allOptions?.mileageRange,
    
    // Состояние загрузки
    isLoading,
    error,
  };
};

/**
 * Хук для получения деталей автомобиля (для совместимости)
 */
export const useCar = (carId: string) => {
  return useQuery({
    queryKey: ['car', carId],
    queryFn: async () => {
      const { getCar } = await import('../lib/api');
      const apiCar = await getCar(carId);
      return transformApiCarToCar(apiCar);
    },
    enabled: !!carId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });
};
