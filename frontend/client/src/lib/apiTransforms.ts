/**
 * Утилиты для преобразования данных между API и UI форматами
 */
import { ApiCar, Car, Filters } from '../types';
import { StatusType } from '../types';
import { ApiCarWrapper, ApiCarMeta, CatalogParams } from './api';
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

  // Сначала ищем car_id в обертке (там ID с суффиксом _en / _ch)
  if (apiCarWrapper && (apiCarWrapper as any).car_id) {
    id = (apiCarWrapper as any).car_id;
  }

  // Если не найден, ищем в основном объекте apiCar
  if (!id) {
    for (const field of possibleIdFields) {
      if (apiCar && apiCar[field as keyof typeof apiCar]) {
        id = apiCar[field as keyof typeof apiCar] as string | number;
        break;
      }
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
  // Корейские: manufacturerenglishname + modelgroupenglishname + gradeenglishname
  // Китайские: brand + model (из meta)
  const manufacturerName = apiCar.manufacturerenglishname || (apiCar as any).brand || '';
  const modelName = apiCar.modelgroupenglishname || (apiCar as any).model || apiCar.modelname || '';
  const gradeName = apiCar.gradeenglishname || '';
  const name = [manufacturerName, modelName, gradeName].filter(Boolean).join(' ') || apiCar.modelname || 'Неизвестный автомобиль';
  
  // Обрабатываем фото с использованием новой логики фильтрации
  let photos: string[] = [];

  // Поддерживаем оба варианта: photos (строки/объекты) и photo_paths (объекты)
  const photoSource = (apiCar as any).photos || apiCar.photo_paths;
  
  if (photoSource && photoSource.length > 0) {
    // Если элементы — строки (URL), значит китайские авто
    if (typeof photoSource[0] === 'string') {
      photos = photoSource.slice(0, 4); // Берём первые 4 для каталога
    } else {
      // Корейские авто — массив объектов { code, path }
      const photoPaths: PhotoPath[] = photoSource.map((photo: any) => ({
        code: photo.code || photo.cod,
        path: photo.path
      }));
      photos = filterAndSortCatalogPhotos(photoPaths);
    }
  } else if (apiCar.photo_outer) {
    photos = [apiCar.photo_outer];
  } else {
    photos = ['/placeholder.svg'];
  }
  
  // Определяем источник: K = Корея, C = Китай
  const carSource = (apiCarWrapper as any).source || (apiCarWrapper as any).meta?.source || '';

  // Определяем статус на основе monthsToPass и category
  // Для корейских авто: current.usdt.customs.category
  // Для китайских авто: current.customs.category
  let status: Car['status'];
  const category = carSource === 'C'
    ? (apiCarWrapper as any).current?.customs?.category
    : apiCarWrapper.current?.usdt?.customs?.category;
  const monthsToPass = apiCarWrapper.simulated?.monthsToPass;

  if (category) {
    // Преобразуем формат из API (с подчеркиваниями) в наш формат (с дефисами)
    const normalizedCategory = category.replace(/_/g, '-') as StatusType;

    let statusType: StatusType;
    let statusLabel: string;

    // Если есть monthsToPass, то всегда показываем сумму из simulated и срок
    if (monthsToPass && monthsToPass > 0) {
      statusType = 'rate-0-3';
      // Для китайских авто simulated.total на верхнем уровне, для корейских simulated.usdt.total
      const simTotal = carSource === 'C'
        ? ((apiCarWrapper as any)?.simulated?.total || 0)
        : ((apiCarWrapper as any)?.simulated?.usdt?.total || 0);
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
  
  // Определяем год и месяц
  // yearmonth_raw и year приходят из колонок таблицы (на верхнем уровне wrapper)
  const ymRaw = (apiCarWrapper as any).yearmonth_raw ?? apiCar.yearmonth;
  let year = (apiCarWrapper as any).year ?? apiCar.year ?? 0;
  let month = apiCar.month;

  if (ymRaw) {
    const yearMonthStr = ymRaw.toString();
    if (yearMonthStr.length === 6) {
      year = parseInt(yearMonthStr.substring(0, 4));
      month = parseInt(yearMonthStr.substring(4, 6));
    }
  }

  if (!year) {
    year = new Date().getFullYear();
  }

  // Формируем двигатель
  const engine = apiCar.displacement ? `${apiCar.displacement / 1000} л` : '';
  
  // Получаем HP из root level (от backend) или из meta
  const hp = (apiCarWrapper as any).hp ?? apiCar.hp ?? 0;

  return {
    id: finalId,
    name,
    brand: manufacturerName,
    model: modelName,
    generation: '', // TODO: получать из API если будет доступно
    trim: gradeName,
    price: carSource === 'C'
      ? ((apiCarWrapper as any).current?.total || 0)
      : (apiCarWrapper.current?.usdt?.total || 0),
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
    source: carSource || undefined,
    driveType: (apiCarWrapper as any).drive_type || (apiCar as any).drive_type || undefined,
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

  // Источник (Корея/Китай/Все)
  if (filters.source) {
    params.source = filters.source;
  }

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

  // Привод
  if (filters.driveType) {
    params.driveType = filters.driveType;
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

  // Источник
  const source = searchParams.get('source');
  if (source) filters.source = source;

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
  
  // Привод
  const driveType = searchParams.get('driveType');
  if (driveType) filters.driveType = driveType;

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

  // Источник
  if (filters.source) params.set('source', filters.source);

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

  // Привод
  if (filters.driveType) params.set('driveType', filters.driveType);

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
    case 'source':
      // При изменении источника сбрасываем всю иерархию и привод
      newFilters.brand = undefined;
      newFilters.model = undefined;
      newFilters.generation = undefined;
      newFilters.types = [];
      newFilters.driveType = undefined;
      break;

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
