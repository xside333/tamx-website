/**
 * Единая точка входа для всех API запросов с улучшенной обработкой ошибок
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Константы для кэширования
const CACHE_KEY = 'car_filters_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа

// Типы для API запросов
export interface CatalogParams {
  // Пагинация/сортировка
  page?: number;
  sortBy?: 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc' | 'mileage_asc';

  // Иерархия автомобилей
  brand?: string;
  model?: string; // CSV для мультиселекта
  generation?: string; // CSV для мультиселекта
  type?: string; // CSV для мультиселекта (Coupe,Sportback)

  // Диапазоны
  yearFrom?: number;
  yearTo?: number;
  monthFrom?: number; // 1-12
  monthTo?: number; // 1-12
  priceFrom?: number;
  priceTo?: number;
  mileageFrom?: number;
  mileageTo?: number;

  // Мультиселекты
  fuelType?: string; // CSV
  bodyColor?: string; // CSV

  // Состояние
  noDamage?: boolean; // myaccidentcnt=0 и myaccidentcost=0

  // Категории растаможки (CSV: rate_3_5,rate_0_3,rate_5_plus)
  category?: string;
}

export interface CatalogResponse {
  page?: number;
  totalcars: number;
  cars: ApiCarWrapper[];
}

export interface ApiCarWrapper {
  meta: ApiCarMeta;
  current?: {
    usdt?: {
      total?: number;
      customs?: {
        category?: 'rate_5_plus' | 'rate_0_3' | 'rate_3_5';
      };
    };
  };
  simulated?: {
    usdt?: {
      total?: number;
    };
    monthsToPass?: number;
  };
}

export interface ApiCarMeta {
  fuel?: string;
  color?: string;
  price?: number;
  address?: string;
  mileage?: number;
  modelname?: string;
  viewcount?: number;
  yearmonth?: string;
  firstadvertiseddatetime?: string;
  fuelfilter?: string;
  colorfilter?: string;
  modelfilter?: string;
  photo_paths?: Array<{
    code?: string;
    cod?: string; // вариация в API
    path: string;
  }>;
  car_id?: string;
  id?: string;
  manufacturerenglishname?: string;
  modelgroupenglishname?: string;
  gradeenglishname?: string;
  fuel_type?: string;
  fuelname?: string;
  displacement?: number;
  year?: number;
  month?: number;
  colorname?: string;
  myaccidentcnt?: number;
  myaccidentcost?: number;
  photo_outer?: string;
  current?: {
    usdt?: {
      total?: number;
      customs?: {
        category?: 'rate_5_plus' | 'rate_0_3' | 'rate_3_5';
      };
    };
  };
  simulated?: {
    usdt?: {
      total?: number;
    };
    monthsToPass?: number;
  };
}

export interface ApiCar {
  // Основные поля
  car_id?: string;
  id?: string;
  manufacturerenglishname?: string;
  modelgroupenglishname?: string;
  gradeenglishname?: string;
  price?: number;
  
  // Техданные
  fuel_type?: string;
  fuelname?: string;
  displacement?: number; // см³
  
  // Дата/цвет/пробег
  year?: number;
  month?: number;
  yearmonth?: string;
  firstadvertiseddatetime?: string;
  color?: string;
  colorname?: string;
  mileage?: number;
  
  // Повреждения
  myaccidentcnt?: number;
  myaccidentcost?: number;
  
  // Фото
  photo_paths?: Array<{
    code: '001' | '003' | '004' | '007';
    path: string;
  }>;
  photo_outer?: string; // альтернативное фото
  
  // Бейджи (опционально)
  current?: {
    usdt?: {
      customs?: {
        category?: 'rate_5_plus' | 'rate_0_3' | 'rate_3_5';
      };
    };
  };
  simulated?: {
    usdt?: {
      total?: number;
    };
    monthsToPass?: number;
  };
}

export interface FilterOption {
  value: string;
  label: string;
}

// Интерфейс для вложенной структуры фильтров от нового API
export interface NestedFiltersResponse {
  [brand: string]: {
    [model: string]: {
      [generation: string]: string[]; // массив комплектаций/типов
    };
  };
}

// Интерфейс для иерархических данных фильтров (для кэширования)
export interface RawFiltersData {
  [brand: string]: {
    [model: string]: {
      [generation: string]: string[]; // массив типов/комплектаций
    };
  };
}

// Интерфейс для кэшированных данных
interface CachedFilters {
  data: RawFiltersData;
  timestamp: number;
}

// Интерфейс для преобразованных плоских фильтров (для UI)
export interface FiltersResponse {
  brands?: FilterOption[];
  models?: FilterOption[];
  generations?: FilterOption[];
  types?: FilterOption[];
  yearRange?: {
    min: number;
    max: number;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  mileageRange?: {
    min: number;
    max: number;
  };
}

/**
 * Получить кэшированные фильтры из localStorage
 */
function getCachedFilters(): RawFiltersData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return null;
    }

    const { data, timestamp } = JSON.parse(cached) as CachedFilters;
    const age = Date.now() - timestamp;
    const ageHours = Math.round(age / (60 * 60 * 1000) * 10) / 10;

    // Проверяем, не истек ли срок кэша
    if (age > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch (error) {
    // Удаляем поврежденный кэш
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

/**
 * Сохранить фильтры в localStorage
 */
function setCachedFilters(data: RawFiltersData): void {
  try {
    const cacheData: CachedFilters = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    const brandsCount = Object.keys(data).length;
  } catch (error) {
    // Игнорируем ошибки кэширования - приложение должно работать без кэша
  }
}

/**
 * Выполнить HTTP запрос с улучшенной обработкой ошибок и retry логикой
 */
async function fetchWithErrorHandling(url: string, options?: RequestInit, retryCount = 0): Promise<Response> {
  const maxRetries = 3;
  let controller: AbortController | null = null;
  let timeoutId: NodeJS.Timeout | null = null;
  let isTimedOut = false;
  
  try {

    // Добавляем случайную задержку при retry чтобы избежать race conditions
    if (retryCount > 0) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
    }

    controller = new AbortController();
    
    // Устанавливаем таймаут с флагом, чтобы отличить timeout от других abort причин
    timeoutId = setTimeout(() => {
      isTimedOut = true;
      controller?.abort();
    }, 15000);

    // Дополнительные заголовки для совместимости и обхода блокировок
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit', // Не отправляем cookies для избежания CORS проблем
      cache: 'no-cache', // Принудительно запрашиваем свежие данные
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; CarCatalog/1.0)',
        'X-Requested-With': 'XMLHttpRequest',
        ...options?.headers,
      },
    });

    // Очищаем таймаут сразу после успешного получения ответа
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      // Retry на server errors (5xx) но не на client errors (4xx)
      if (response.status >= 500 && retryCount < maxRetries) {
        return fetchWithErrorHandling(url, options, retryCount + 1);
      }
      
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    return response;

  } catch (error) {
    // Очищаем таймаут в случае ошибки
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    // Улучшенное логирование ошибок - исправляем [object Object]
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'), // Первые 3 строки стека
    } : String(error);


    // Обработка AbortError - различаем timeout от принудительного abort
    if (error instanceof Error && error.name === 'AbortError') {
      if (isTimedOut) {
        // Это был timeout - не стоит retry
        throw new Error('⏱️ Время ожидания истекло. Сервер не отвечает в течение 15 секунд.');
      } else {
        // Это был принудительный abort - можно попробовать retry
        if (retryCount < maxRetries) {
          return fetchWithErrorHandling(url, options, retryCount + 1);
        }
      }
    }

    // Retry логика для network errors (исключаем timeout aborts)
    if (retryCount < maxRetries) {
      const shouldRetry = 
        !isTimedOut && (
          error instanceof TypeError ||
          (error instanceof Error && (
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError') ||
            error.message.includes('fetch')
          ))
        );

      if (shouldRetry) {
        return fetchWithErrorHandling(url, options, retryCount + 1);
      }
    }

    // Детальная диагностика ошибок после всех retry попыток
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error(`🚫 Сервер недоступен после ${retryCount + 1} попыток.

Возможные причины:
• Блокировка расширениями браузера (AdBlock, Privacy Badger)
• Проблемы с сетью или корпоративный firewall
• Проблемы с CORS или SSL сертификатами

Попробуйте:
Отключить блокировщики рекламы
• Перезагрузить страницу
• Проверить подключение к интернету`);
    }

    // Если это не известная нам ошибка, передаем как есть с дополнительной информацией
    if (error instanceof Error) {
      throw new Error(`❌ ${error.message} (после ${retryCount + 1} попыток)`);
    }

    throw error;
  }
}

/**
 * Получить каталог автомобилей
 */
export async function getCatalog(params: CatalogParams = {}): Promise<CatalogResponse> {
  const searchParams = new URLSearchParams();

  // Добавляем параметры в URL
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const url = `${API_BASE_URL}/catalog${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const response = await fetchWithErrorHandling(url);

  return response.json();
}

/**
 * Преобразовать вложенную структуру фильтров в плоскую для UI
 */
export function transformNestedFilters(
  nestedFilters: NestedFiltersResponse,
  selectedBrand?: string,
  selectedModels?: string[],
  selectedGenerations?: string[]
): FiltersResponse {
  // Извлекаем все бренды
  const brands = Object.keys(nestedFilters).map(brand => ({
    value: brand,
    label: brand
  }));

  // Извлекаем модели для выбранного бренда
  const models: FilterOption[] = [];
  if (selectedBrand && nestedFilters[selectedBrand]) {
    Object.keys(nestedFilters[selectedBrand]).forEach(model => {
      models.push({ value: model, label: model });
    });
  }

  // Извлекаем поколения для выбранных моделей
  const generations: FilterOption[] = [];
  if (selectedBrand && selectedModels && selectedModels.length > 0) {
    selectedModels.forEach(model => {
      if (nestedFilters[selectedBrand]?.[model]) {
        Object.keys(nestedFilters[selectedBrand][model]).forEach(generation => {
          if (!generations.find(g => g.value === generation)) {
            generations.push({ value: generation, label: generation });
          }
        });
      }
    });
  }

  // Извлекаем типы/комплектации для выбранных поколений
  const types: FilterOption[] = [];
  if (selectedBrand && selectedModels && selectedGenerations && selectedGenerations.length > 0) {
    selectedModels.forEach(model => {
      selectedGenerations.forEach(generation => {
        if (nestedFilters[selectedBrand]?.[model]?.[generation]) {
          nestedFilters[selectedBrand][model][generation].forEach(type => {
            if (!types.find(t => t.value === type)) {
              types.push({ value: type, label: type });
            }
          });
        }
      });
    });
  }

  return {
    brands,
    models,
    generations,
    types,
    // Диапазоны пока не возвращает новое API, можно добавить позже
    yearRange: { min: 2000, max: new Date().getFullYear() },
    priceRange: { min: 100000, max: 50000000 },
    mileageRange: { min: 0, max: 500000 }
  };
}

/**
 * Получить опции фильтров (иерархические)
 */
export async function getFilters(params: Partial<CatalogParams> = {}): Promise<FiltersResponse> {
  const url = `${API_BASE_URL}/filters`;
  const response = await fetchWithErrorHandling(url);

  const nestedFilters: NestedFiltersResponse = await response.json();

  // Преобразуем вложенную структуру в плоскую с учетом выбранных параметров
  const transformedFilters = transformNestedFilters(
    nestedFilters,
    params.brand,
    params.model ? params.model.split(',') : undefined,
    params.generation ? params.generation.split(',') : undefined
  );

  return transformedFilters;
}

/**
 * Получить полную структуру фильтров (для кэширования)
 */
export async function getFullFiltersStructure(): Promise<NestedFiltersResponse> {
  try {
    const url = `${API_BASE_URL}/filters`;
    const response = await fetchWithErrorHandling(url);
    return response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Получить иерархические фильтры с кэшированием
 */
export async function getHierarchicalFilters(): Promise<RawFiltersData> {

  // Сначала проверяем кэш
  const cachedData = getCachedFilters();
  if (cachedData) {
    return cachedData;
  }


  try {
    const url = `${API_BASE_URL}/filters`;
    const response = await fetchWithErrorHandling(url);
    const rawData: RawFiltersData = await response.json();

    // Кэшируем полученные данные
    setCachedFilters(rawData);

    return rawData;
  } catch (error) {
    throw error;
  }
}

/**
 * Получить все фильтры (иерархические + плоские списки)
 */
export async function fetchCarFilters(): Promise<{
  rawData: RawFiltersData;
  flatFilters: FiltersResponse;
}> {
  const rawData = await getHierarchicalFilters();
  const flatFilters = transformNestedFilters(rawData);

  return {
    rawData,
    flatFilters,
  };
}

/**
 * Получить детали автомобиля
 */
export async function getCar(carId: string): Promise<ApiCar> {
  try {
    const url = `${API_BASE_URL}/car/${carId}`;
    const response = await fetchWithErrorHandling(url);

    return response.json();

  } catch (error) {
    throw new Error(`Ошибка загрузки автомобиля: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

/**
 * Получить стоимость доставки по городам
 * Prod: https://api.tamx.ru/deliveryCost (через VITE_API_BASE_URL)
 * Dev:  ${API_BASE_URL}/deliveryCost (relative)
 */
export async function getDeliveryCosts(): Promise<Record<string, number>> {
  const url = `${API_BASE_URL}/deliveryCost`;
  const response = await fetchWithErrorHandling(url);
  return response.json();
}
