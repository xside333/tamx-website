/**
 * Утилиты для трансформации данных специфично для детальной страницы автомобиля
 * Поддержка двух источников: Корея (K) и Китай (C)
 */

import { formatPrice, formatMileage } from './utils';

export interface CarDetailData {
  car_id?: string;
  source?: string; // 'K' = Корея, 'C' = Китай
  /** Ссылка на оригинальное объявление из auto_webcatalog.url (Китай/Корея) */
  original_url?: string | null;
  // Таможенный статус
  rate?: 'rate_3_5' | 'rate_5_plus' | 'rate_0_3' | string;
  monthsToPath?: number | null;
  hp?: number;
  meta?: {
    // Общие поля
    car_id?: string;
    source?: string;
    address?: string;
    mileage?: number;
    price?: number;
    hp?: number;
    photos?: string[]; // Китайские авто
    photo_paths?: Array<{ code?: string; cod?: string; path: string }>; // Корейские авто
    // Корейские поля
    manufacturerenglishname?: string;
    modelgroupenglishname?: string;
    gradeenglishname?: string;
    modelname?: string;
    yearmonth?: string;
    fuel?: string;
    fuelname?: string;
    color?: string;
    colorname?: string;
    displacement?: number;
    myaccidentcnt?: number;
    myaccidentcost?: number;
    photo_outer?: string;
    viewcount?: number;
    // Китайские поля
    brand?: string;
    model?: string;
    colorfilter?: string;
    fuelfilter?: string;
    transmission?: string;
    body_type?: string;
    displacement_cc?: number;
    seller_type?: string;
  };
  // Корейский формат current
  current?: {
    usdt?: {
      total?: number;
      insurance?: {
        totalAccidentCostRUB?: number;
      };
      koreaExpenses?: {
        priceRUB?: number;
        KCLfeeRUB?: number;
      };
      customs?: {
        category?: string;
        duty?: number;
        utilFee?: number;
        brokerFee?: number;
        customsClearance?: number;
      };
    };
    // Китайский формат (current напрямую, без обёртки usdt)
    customs?: {
      category?: string;
      duty?: number;
      utilFee?: number;
      brokerFee?: number;
      customsClearance?: number;
    };
    chinaExpenses?: {
      priceCNY?: number;
      priceRUB?: number;
      internalExpensesCNY?: number;
      internalExpensesRUB?: number;
      totalAuto?: number;
    };
    total?: number; // для китайских авто
    delivery?: number;
    exchange_rates?: {
      krw_rub?: number;
      eur_rub?: number;
      usdt_krw?: number;
      usdt_rub?: number;
      cny_rub_vtb?: number;
      usd_rub?: number;
    };
  };
  currentData?: {
    koreaExpenses?: {
      priceRUB?: number;
      KCLfeeRUB?: number;
    };
    customs?: {
      duty?: number;
      utilFee?: number;
      brokerFee?: number;
      customsClearance?: number;
    };
    delivery?: number;
    total?: number;
  };
  simulated?: {
    usdt?: {
      total?: number;
    };
    total?: number; // для китайских авто
    monthsToPass?: number;
  };
  calculatedPrice?: number;
  // Поля для совместимости с существующим API
  photo_paths?: Array<{ code?: string; cod?: string; path: string }>;
  manufacturerenglishname?: string;
  modelgroupenglishname?: string;
  gradeenglishname?: string;
  modelname?: string;
  address?: string;
  yearmonth?: string;
  mileage?: number;
  myaccidentcnt?: number;
  price?: number;
  fuel?: string;
  color?: string;
  displacement?: number;
  myaccidentcost?: number;
}

/**
 * Определить источник данных (K = Корея, C = Китай)
 */
export function getSource(data: CarDetailData): string {
  return data.source || data.meta?.source || 'K';
}

/** Источник — Китай? */
export function isChina(data: CarDetailData): boolean {
  return getSource(data) === 'C';
}

/**
 * Получить заголовок автомобиля
 */
export function getCarTitle(data: CarDetailData): string {
  if (isChina(data)) {
    const brand = data.meta?.brand || '';
    const model = data.meta?.model || '';
    return [brand, model].filter(Boolean).join(' ') || 'Неизвестный автомобиль';
  }
  const manufacturer = data.meta?.manufacturerenglishname || data.manufacturerenglishname || '';
  const model = data.meta?.modelgroupenglishname || data.modelgroupenglishname || '';
  const grade = data.meta?.gradeenglishname || data.gradeenglishname || '';
  return [manufacturer, model, grade].filter(Boolean).join(' ');
}

/**
 * Получить локацию автомобиля
 */
export function getCarLocation(data: CarDetailData): string {
  if (isChina(data)) {
    return data.meta?.address || data.address || 'Китай';
  }
  return data.meta?.address || data.address || 'Южная Корея';
}

/**
 * Получить дату выпуска в формате YYYY/MM
 */
export function getCarProductionDate(data: CarDetailData): string {
  const yearmonth = (data.meta?.yearmonth || data.yearmonth || (data as any).yearmonth_raw)?.toString();
  if (!yearmonth || yearmonth.length !== 6) {
    // Если есть хотя бы год (для китайских авто)
    const year = (data as any).year || data.meta?.year;
    if (year) return `${year}`;
    return 'Не указана';
  }
  const year = yearmonth.substring(0, 4);
  const month = yearmonth.substring(4, 6);
  return `${year}/${month}`;
}

/**
 * Получить статус ДТП (только для Кореи)
 */
export function getAccidentStatus(data: CarDetailData): string {
  if (isChina(data)) return 'Нет данных';
  const accidentCount = data.meta?.myaccidentcnt ?? data.myaccidentcnt;
  return (accidentCount === 0 || accidentCount === null || accidentCount === undefined)
    ? 'Без ДТП'
    : 'Были ДТП';
}

/**
 * Получить итоговую цену с приоритетной цепочкой
 */
export function getFinalPrice(data: CarDetailData): number {
  if (isChina(data)) {
    return data.calculatedPrice || data.current?.total || data.meta?.price || 0;
  }
  return data.calculatedPrice || data.current?.usdt?.total || data.meta?.price || 0;
}

/**
 * Получить цену выкупа в оригинальной валюте
 */
export function getOriginalPrice(data: CarDetailData): string {
  if (isChina(data)) {
    const price = data.meta?.price || data.price || 0;
    return price.toLocaleString('ru-RU') + ' ¥';
  }
  // Корея — цена в 10 000 ₩
  const price = data.meta?.price || data.price || 0;
  const priceInWon = price * 10000;
  return priceInWon.toLocaleString('ru-RU') + ' ₩';
}

/** Обратная совместимость: цена в вонах */
export function getEncarPrice(data: CarDetailData): string {
  return getOriginalPrice(data);
}

/**
 * Получить ссылку на оригинальное объявление.
 * Использует original_url из API (auto_webcatalog.url), иначе fallback по источнику.
 */
export function getOriginalLink(data: CarDetailData): string {
  if (data.original_url) {
    return data.original_url;
  }
  const carId = data.car_id;
  if (isChina(data)) {
    return `https://www.che168.com/dealer/qarv/${carId}.html`;
  }
  return `https://fem.encar.com/cars/detail/${carId}`;
}

/** Обратная совместимость */
export function getEncarLink(data: CarDetailData): string {
  return getOriginalLink(data);
}

/**
 * Получить объем двигателя
 */
export function getEngineDisplacement(data: CarDetailData): string {
  if (isChina(data)) {
    const cc = data.meta?.displacement_cc || data.meta?.displacement || data.displacement;
    return cc ? `${cc} см³` : 'Не указан';
  }
  const displacement = data.meta?.displacement || data.displacement;
  return displacement ? `${displacement} см³` : 'Не указан';
}

/**
 * Получить стоимость ущерба в вонах (только Корея)
 */
export function getAccidentCostKRW(data: CarDetailData): string {
  if (isChina(data)) return '—';
  const cost = data.meta?.myaccidentcost || 0;
  return cost.toLocaleString('ru-RU') + ' ₩';
}

/**
 * Получить стоимость ущерба в рублях (только Корея)
 */
export function getAccidentCostRUB(data: CarDetailData): string {
  if (isChina(data)) return '—';
  const cost = data.current?.usdt?.insurance?.totalAccidentCostRUB || 0;
  return cost.toLocaleString('ru-RU') + ' ₽';
}

// ===== Расчёт стоимости для попапа =====

/**
 * Стоимость авто в стране-оригинале (в рублях)
 */
export function getCountryPriceRUB(data: CarDetailData): string {
  if (isChina(data)) {
    const price = data.current?.chinaExpenses?.priceRUB ?? 0;
    return price.toLocaleString('ru-RU') + ' ₽';
  }
  const price = data.current?.usdt?.koreaExpenses?.priceRUB
    ?? data.currentData?.koreaExpenses?.priceRUB
    ?? 0;
  return price.toLocaleString('ru-RU') + ' ₽';
}

/** Обратная совместимость */
export function getKoreaPriceRUB(data: CarDetailData): string {
  return getCountryPriceRUB(data);
}

/**
 * Расходы в стране-оригинале (в рублях)
 */
export function getCountryExpensesRUB(data: CarDetailData): string {
  if (isChina(data)) {
    const expenses = data.current?.chinaExpenses?.internalExpensesRUB ?? 0;
    return expenses.toLocaleString('ru-RU') + ' ₽';
  }
  const expenses = data.current?.usdt?.koreaExpenses?.KCLfeeRUB
    ?? data.currentData?.koreaExpenses?.KCLfeeRUB
    ?? 0;
  return expenses.toLocaleString('ru-RU') + ' ₽';
}

/** Обратная совместимость */
export function getKoreaExpensesRUB(data: CarDetailData): string {
  return getCountryExpensesRUB(data);
}

/**
 * Получить таможенную ставку
 */
export function getCustomsDuty(data: CarDetailData): string {
  const customs = isChina(data) ? data.current?.customs : data.current?.usdt?.customs;
  const duty = customs?.duty ?? data.currentData?.customs?.duty ?? 0;
  return duty.toLocaleString('ru-RU') + ' ₽';
}

/**
 * Получить HP из данных
 */
export function getHp(data: CarDetailData): number {
  return data.hp ?? data.meta?.hp ?? 0;
}

/**
 * Получить утилизационный сбор
 */
export function getUtilFee(data: CarDetailData): string {
  const hp = getHp(data);
  if (!hp || hp === 0) {
    return 'нет л.с.';
  }
  const customs = isChina(data) ? data.current?.customs : data.current?.usdt?.customs;
  const fee = customs?.utilFee ?? data.currentData?.customs?.utilFee ?? 0;
  return fee.toLocaleString('ru-RU') + ' ₽';
}

/**
 * Получить услуги брокера
 */
export function getBrokerFee(data: CarDetailData): string {
  const customs = isChina(data) ? data.current?.customs : data.current?.usdt?.customs;
  const fee = customs?.brokerFee ?? data.currentData?.customs?.brokerFee ?? 0;
  return fee.toLocaleString('ru-RU') + ' ₽';
}

/**
 * Получить таможенное оформление
 */
export function getCustomsClearance(data: CarDetailData): string {
  const customs = isChina(data) ? data.current?.customs : data.current?.usdt?.customs;
  const clearance = customs?.customsClearance ?? data.currentData?.customs?.customsClearance ?? 0;
  return clearance.toLocaleString('ru-RU') + ' ₽';
}

/**
 * Получить стоимость доставки
 */
export function getDeliveryFee(data: CarDetailData, includeDelivery: boolean = false): string {
  const delivery = includeDelivery ? (data.currentData?.delivery || 200000) : 0;
  return delivery.toLocaleString('ru-RU') + ' ₽';
}

/**
 * Получить общую сумму
 */
export function getTotalPrice(data: CarDetailData): string {
  const hp = getHp(data);
  if (!hp || hp === 0) {
    return 'нет л.с.';
  }
  if (isChina(data)) {
    const total = data.current?.total || getFinalPrice(data);
    return total.toLocaleString('ru-RU') + ' ₽';
  }
  const total = data.currentData?.total || getFinalPrice(data);
  return total.toLocaleString('ru-RU') + ' ₽';
}

/**
 * Получить курсы валют
 */
export function getExchangeRates(data: CarDetailData) {
  const rates = data.current?.exchange_rates;
  if (!rates) return null;

  if (isChina(data)) {
    return {
      cnyRubVtb: rates.cny_rub_vtb?.toFixed(2) || '—',
      eurRub: rates.eur_rub?.toFixed(2) || '—',
      usdRub: rates.usd_rub?.toFixed(2) || '—',
    };
  }

  return {
    rubKrw: rates.krw_rub ? (1 / rates.krw_rub).toFixed(2) : '—',
    eurRub: rates.eur_rub?.toFixed(2) || '—',
    usdtKrw: rates.usdt_krw?.toFixed(2) || '—',
    usdtRub: rates.usdt_rub?.toFixed(2) || '—',
  };
}

/**
 * Simulated price (проходной через N мес.)
 */
export function getSimulatedTotal(data: CarDetailData): number {
  if (isChina(data)) {
    return data.simulated?.total || 0;
  }
  return data.simulated?.usdt?.total || 0;
}

/**
 * Label для строки «Стоимость авто в ...»
 */
export function getCountryPriceLabel(data: CarDetailData): string {
  return isChina(data) ? 'Стоимость авто в Китае' : 'Стоимость авто в Корее';
}

/**
 * Label для строки «Расходы в ...»
 */
export function getCountryExpensesLabel(data: CarDetailData): string {
  return isChina(data) ? 'Расходы в Китае' : 'Расходы в Корее';
}

/**
 * Фильтровать и отсортировать фотографии для детальной страницы
 */
export function processDetailPhotos(data: CarDetailData): string[] {
  // Для китайских авто — массив URL строк в photos
  if (isChina(data)) {
    const photos = (data.meta as any)?.photos || [];
    if (Array.isArray(photos) && photos.length > 0) {
      // Если это массив строк (URL), возвращаем как есть
      if (typeof photos[0] === 'string') {
        return photos;
      }
    }
    return ['/placeholder.svg'];
  }

  // Для корейских авто — массив объектов photo_paths
  const photoSource = (data.meta as any)?.photos || data.meta?.photo_paths || data.photo_paths || [];

  if (!photoSource || photoSource.length === 0) {
    return ['/placeholder.svg'];
  }

  const photoPaths = photoSource;

  // Создаем Map для удаления дубликатов по path
  const uniquePhotos = new Map<string, { code?: string; path: string }>();

  photoPaths.forEach((photo: any) => {
    const code = photo.code || photo.cod;
    if (!uniquePhotos.has(photo.path)) {
      uniquePhotos.set(photo.path, { code, path: photo.path });
    }
  });

  // Сортируем по code
  const sortedPhotos = Array.from(uniquePhotos.values()).sort((a, b) => {
    const codeA = a.code || '';
    const codeB = b.code || '';
    return codeA.localeCompare(codeB);
  });

  // Преобразуем URL
  return sortedPhotos.map(photo => {
    if (photo.path.startsWith('http')) {
      return photo.path;
    }
    const baseUrl = 'https://ci.encar.com';
    const imageParams = 'impolicy=heightRate&rh=696&cw=1160&ch=696&cg=Center&wtmk=https://ci.encar.com/wt_mark/w_mark_04.png';
    const cleanPath = photo.path.startsWith('/') ? photo.path : `/${photo.path}`;
    return `${baseUrl}${cleanPath}?${imageParams}`;
  });
}
