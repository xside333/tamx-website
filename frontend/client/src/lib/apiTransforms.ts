/**
 * Утилиты для преобразования данных между API и UI форматами
 */
import { ApiCar, Car, Filters, CatalogParams } from '../types';
import { StatusType } from '../types';
import { ApiCarWrapper, ApiCarMeta } from './api';
import { filterAndSortCatalogPhotos, PhotoPath } from './photoUtils';

/**
 * Преобразует автомобиль из нового API формата в UI формат
 */
export function transformApiCarToCar(apiCarWrapper: ApiCarWrapper | ApiCar): Car {
  // Извлекаем данные из обертки meta или используем напрямую для совместимости
  const apiCar: ApiCarMeta = 'meta' in apiCarWrapper ? apiCarWrapper.meta : apiCarWrapper as ApiCarMeta;

  // Попробуем различные варианты ID из API
  const possibleIdFields = [
    'car_id', 'id', 'carid', 'carId', 'Id', 'ID', 'car_num', 'carnum', 'auto_id', 'autoId',
    'num', 'number', 'car_number', 'carNumber', 'vehicle_id', 'vehicleId', 'pk', 'key'
  ];

  let id: string | number | undefined;

  // Ищем ID в основном объекте apiCar
  for (const field of possibleIdFields) {
    if (apiCar && apiCar[field as keyof typeof apiCar]) {
      id = apiCar[field as keyof typeof apiCar] as string | number;
      break;
    }
  }

  // Если не найден, ищем в обертке apiCarWrapper
  if (!id) {
    for (const field of possibleIdFields) {
      if (apiCarWrapper && (apiCarWrapper as any)[field]) {
        id = (apiCarWrapper as any)[field];
        break;
      }
    }
  }

  // Конвертируем в строку
  const finalId = id ? String(id) : undefined;

  // Если ID все еще не найден, логируем проблему и выбрасываем ошибку
  if (!finalId) {
    throw new Error('ID автомобиля не найден в ответе API');
  }
  
  // Формируем название автомобиля
  // Новое API использует modelname, получаем со старого для совместимости
  const manufacturerName = apiCar.manufacturerenglishname || '';
  const modelName = apiCar.modelgroupenglishname || apiCar.modelname || '';
  const gradeName = apiCar.gradeenglishname || '';
  const name = [manufacturerName, modelName, gradeName].filter(Boolean).join(' ') || apiCar.modelname || 'Неизвестный автомобиль';
  
  // Обрабатываем фото с использованием новой логики фильтрации и ci.encar.com
  let photos: string[] = [];

  // Поддерживаем оба варианта: photos и photo_paths
  const photoSource = (apiCar as any).photos || apiCar.photo_paths;
  
  if (photoSource && photoSource.length > 0) {
    // Преобразуем в нужный формат (поддерживаем разные варианты API)
    const photoPaths: PhotoPath[] = photoSource.map((photo: any) => ({
      code: photo.code || photo.cod,
      path: photo.path
    }));

    // Используем новую логику фильтрации для каталога (001, 002, 003, 007)
    photos = filterAndSortCatalogPhotos(photoPaths);
  } else if (apiCar.photo_outer) {
    // Поддержка старого формата API
    photos = [apiCar.photo_outer];
  } else {
    // Placeholder если нет фото
    photos = ['/placeholder.svg'];
  }
  
  // Определяем статус на основе monthsToPass и category
  let status: Car['status'];
  const category = apiCarWrapper.current?.usdt?.customs?.category;
  const monthsToPass = apiCarWrapper.simulated?.monthsToPass;

  if (category) {
    // Преобразуем формат из API (с подчеркиваниями) в наш формат (с дефисами)
    const normalizedCategory = category.replace(/_/g, '-') as StatusType;

    let statusType: StatusType;
    let statusLabel: string;

    // Если есть monthsToPass, то всегда показываем сумму из simulated и срок
    if (monthsToPass && monthsToPass > 0) {
      statusType = 'rate-0-3';
      const simTotal = (apiCarWrapper as any)?.simulated?.usdt?.total || 0;
      statusLabel = `${new Intl.NumberFormat('ru-RU').format(Math.round(simTotal))} ₽ через ${monthsToPass} мес.`;
    }
    // Если нет monthsToPass, но статус rate_0_3, то "Высокая ставка"
    else if (normalizedCategory === 'rate-0-3') {
      statusType = 'rate-5-plus';
      statusLabel = 'Высокая ставка';
    }
    // Остальные статусы как обычно
    else {
      statusType = normalizedCategory;
      const statusLabels: Record<StatusType, string> = {
        'rate-5-plus': 'Высокая ставка',
        'rate-3-5': 'Авто проходное',
        'rate-0-3': 'Высокая ставка', // fallback, но не должно сюда попасть
      };
      statusLabel = statusLabels[normalizedCategory] || category;
    }

    status = {
      type: statusType,
      label: statusLabel,
      monthsUntilPassable: monthsToPass,
    };
  }
  
  // Определяем топливо (новое API использует fuel)
  const fuel = apiCar.fuel || apiCar.fuel_type || apiCar.fuelname || '';
  
  // Определяем цвет (новое API использует color)
  const color = apiCar.color || apiCar.colorname || '';
  
  // Проверяем статус ДТП
  const accidentFree = (apiCar.myaccidentcnt === 0) && (apiCar.myaccidentcost === 0);
  
  // Определяем год и месяц (новое API используем yearmonth)
  let year = apiCar.year || new Date().getFullYear();
  let month = apiCar.month;

  if (apiCar.yearmonth) {
    const yearMonthStr = apiCar.yearmonth.toString();
    if (yearMonthStr.length === 6) {
      year = parseInt(yearMonthStr.substring(0, 4));
      month = parseInt(yearMonthStr.substring(4, 6));
    }
  }

  // Формируем двигатель
  const engine = apiCar.displacement ? `${apiCar.displacement / 1000} л` : '';
  
  // Получаем HP из meta
  const hp = apiCar.hp || 0;

  return {
    id: finalId,
    name,
    brand: manufacturerName,
    model: modelName,
    generation: '', // TODO: получать из API если будет доступно
    trim: gradeName,
    price: apiCarWrapper.current?.usdt?.total || 0,
    year,
    month,
    mileage: apiCar.mileage || 0,
    fuel,
    engine,
    displacement: apiCar.displacement,
    hp,
    location: apiCar.address || 'Не указано',
    photos,
    totalPhotos: photos.length,
    status,
    accidentFree,
    color,
    firstadvertiseddatetime: apiCar.firstadvertiseddatetime,
    myaccidentcnt: apiCar.myaccidentcnt,
    myaccidentcost: apiCar.myaccidentcost,
  };
}

/**
 * Преобразует фильтры из UI формата в параметры API
 */
export function transformFiltersToApiParams(filters: Filters, page: number = 1, sortBy: string = 'date_desc'): CatalogParams {
  const params: CatalogParams = {
    page,
    sortBy: sortBy as any,
  };

  // Иерархия
  if (filters.brand) {
    params.brand = filters.brand;
  }

  if (filters.model) {
    params.model = filters.model;
  }

  if (filters.generation) {
    params.generation = filters.generation;
  }

  if (filters.types.length > 0) {
    params.type = filters.types.join(',');
  }

  // Диапазоны
  if (filters.yearFrom) params.yearFrom = filters.yearFrom;
  if (filters.yearTo) params.yearTo = filters.yearTo;
  if (filters.monthFrom) params.monthFrom = filters.monthFrom;
  if (filters.monthTo) params.monthTo = filters.monthTo;
  if (filters.priceFrom) params.priceFrom = filters.priceFrom;
  if (filters.priceTo) params.priceTo = filters.priceTo;
  if (filters.mileageFrom) params.mileageFrom = filters.mileageFrom;
  if (filters.mileageTo) params.mileageTo = filters.mileageTo;
  if (filters.hpTo) params.hpTo = filters.hpTo;

  // Мультиселекты
  if (filters.fuels.length > 0) {
    params.fuelType = filters.fuels.join(',');
  }

  if (filters.colors.length > 0) {
    params.bodyColor = filters.colors.join(',');
  }

  // Категории растаможки
  if (filters.categories && filters.categories.length > 0) {
    params.category = filters.categories.join(',');
  }

  // Состояние
  if (filters.noDamage) {
    params.noDamage = true;
  }

  return params;
}

/**
 * Преобразует URL параметры в фильтры
 */
export function transformUrlParamsToFilters(searchParams: URLSearchParams): Filters {
  const filters: Filters = {
    models: [],
    types: [],
    fuels: [],
    colors: [],
    categories: [],
  };

  // Иерархия
  const brand = searchParams.get('brand');
  if (brand) filters.brand = brand;

  const model = searchParams.get('model');
  if (model) filters.model = model;
  
  const generation = searchParams.get('generation');
  if (generation) filters.generation = generation;
  
  const type = searchParams.get('type');
  if (type) filters.types = type.split(',').filter(Boolean);
  
  // Диапазоны
  const yearFrom = searchParams.get('yearFrom');
  if (yearFrom) filters.yearFrom = parseInt(yearFrom);
  
  const yearTo = searchParams.get('yearTo');
  if (yearTo) filters.yearTo = parseInt(yearTo);
  
  const monthFrom = searchParams.get('monthFrom');
  if (monthFrom) filters.monthFrom = parseInt(monthFrom);
  
  const monthTo = searchParams.get('monthTo');
  if (monthTo) filters.monthTo = parseInt(monthTo);
  
  const priceFrom = searchParams.get('priceFrom');
  if (priceFrom) filters.priceFrom = parseInt(priceFrom);
  
  const priceTo = searchParams.get('priceTo');
  if (priceTo) filters.priceTo = parseInt(priceTo);
  
  const mileageFrom = searchParams.get('mileageFrom');
  if (mileageFrom) filters.mileageFrom = parseInt(mileageFrom);
  
  const mileageTo = searchParams.get('mileageTo');
  if (mileageTo) filters.mileageTo = parseInt(mileageTo);
  
  // Мультиселекты
  const fuelType = searchParams.get('fuelType');
  if (fuelType) filters.fuels = fuelType.split(',').filter(Boolean);
  
  const bodyColor = searchParams.get('bodyColor');
  if (bodyColor) filters.colors = bodyColor.split(',').filter(Boolean);
  
  // Состояние
  const noDamage = searchParams.get('noDamage');
  if (noDamage === 'true') filters.noDamage = true;

  // Категории растаможки
  const category = searchParams.get('category');
  if (category) filters.categories = category.split(',').filter(Boolean);

  return filters;
}

/**
 * Преобразует фильтры в URL параметры
 */
export function transformFiltersToUrlParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();

  // Иерархия
  if (filters.brand) params.set('brand', filters.brand);
  if (filters.model) params.set('model', filters.model);
  if (filters.generation) params.set('generation', filters.generation);
  if (filters.types.length > 0) params.set('type', filters.types.join(','));

  // Диапазоны
  if (filters.yearFrom) params.set('yearFrom', filters.yearFrom.toString());
  if (filters.yearTo) params.set('yearTo', filters.yearTo.toString());
  if (filters.monthFrom) params.set('monthFrom', filters.monthFrom.toString());
  if (filters.monthTo) params.set('monthTo', filters.monthTo.toString());
  if (filters.priceFrom) params.set('priceFrom', filters.priceFrom.toString());
  if (filters.priceTo) params.set('priceTo', filters.priceTo.toString());
  if (filters.mileageFrom) params.set('mileageFrom', filters.mileageFrom.toString());
  if (filters.mileageTo) params.set('mileageTo', filters.mileageTo.toString());

  // Мультиселекты
  if (filters.fuels.length > 0) params.set('fuelType', filters.fuels.join(','));
  if (filters.colors.length > 0) params.set('bodyColor', filters.colors.join(','));

  // Категории растаможки
  if (filters.categories && filters.categories.length > 0) params.set('category', filters.categories.join(','));

  // Состояние
  if (filters.noDamage) params.set('noDamage', 'true');

  return params;
}

/**
 * Сброс дочерних фильтров при изменении родительских
 */
export function resetDependentFilters(filters: Filters, changedField: keyof Filters): Filters {
  const newFilters = { ...filters };

  switch (changedField) {
    case 'brand':
      // При изменении бренда сбрасываем модель, поколение, тип
      newFilters.model = undefined;
      newFilters.generation = undefined;
      newFilters.types = [];
      break;

    case 'model':
      // При изменении модели сбрасываем поколение
      newFilters.generation = undefined;
      newFilters.types = [];
      break;

    case 'generation':
      // При изменении поколения сбрасываем тип
      newFilters.types = [];
      break;

    case 'yearFrom':
    case 'yearTo':
      // При сбросе года сбрасываем месяцы
      if (!newFilters.yearFrom && !newFilters.yearTo) {
        newFilters.monthFrom = undefined;
        newFilters.monthTo = undefined;
      }
      break;
  }

  return newFilters;
}
