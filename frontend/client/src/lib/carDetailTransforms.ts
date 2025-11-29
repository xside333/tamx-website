/**
 * Утилиты для трансформации данных специфично для детальной страницы автомобиля
 * Не используется на странице каталога
 */

import { formatPrice, formatMileage } from './utils';

export interface CarDetailData {
  car_id?: string;
  // Таможенный статус
  rate?: 'rate_3_5' | 'rate_5_plus' | 'rate_0_3' | string;
  monthsToPath?: number | null;
  meta?: {
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
  };
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
    exchange_rates?: {
      krw_rub?: number;
      eur_rub?: number;
      usdt_krw?: number;
      usdt_rub?: number;
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
  calculatedPrice?: number;
  // Добавляем поля для совместимости с существующим API
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
 * Получить заголовок автомобиля
 */
export function getCarTitle(data: CarDetailData): string {
  const manufacturer = data.meta?.manufacturerenglishname || data.manufacturerenglishname || '';
  const model = data.meta?.modelgroupenglishname || data.modelgroupenglishname || '';
  const grade = data.meta?.gradeenglishname || data.gradeenglishname || '';

  return [manufacturer, model, grade].filter(Boolean).join(' ');
}

/**
 * Получить локацию автомобиля
 */
export function getCarLocation(data: CarDetailData): string {
  return data.meta?.address || data.address || 'Южная Корея';
}

/**
 * Получить дату выпуска в формате YYYY/MM
 */
export function getCarProductionDate(data: CarDetailData): string {
  const yearmonth = (data.meta?.yearmonth || data.yearmonth)?.toString();
  if (!yearmonth || yearmonth.length !== 6) return 'Не указана';

  const year = yearmonth.substring(0, 4);
  const month = yearmonth.substring(4, 6);

  return `${year}/${month}`;
}

/**
 * Получить статус ДТП
 */
export function getAccidentStatus(data: CarDetailData): string {
  const accidentCount = data.meta?.myaccidentcnt ?? data.myaccidentcnt;
  return (accidentCount === 0 || accidentCount === null || accidentCount === undefined)
    ? 'Без ДТП'
    : 'Были ДТП';
}

/**
 * Получить итоговую цену с приоритетной цепочкой
 */
export function getFinalPrice(data: CarDetailData): number {
  return data.calculatedPrice || data.current?.usdt?.total || data.meta?.price || 0;
}

/**
 * Получить цену выкупа с Encar в вонах
 */
export function getEncarPrice(data: CarDetailData): string {
  const price = data.meta?.price || data.price || 0;
  const priceInWon = price * 10000;
  return priceInWon.toLocaleString('ru-RU') + ' ₩';
}

/**
 * Получить ссылку на Encar
 */
export function getEncarLink(data: CarDetailData): string {
  const carId = data.car_id;
  return `https://fem.encar.com/cars/detail/${carId}`;
}

/**
 * Получить объем двигателя
 */
export function getEngineDisplacement(data: CarDetailData): string {
  const displacement = data.meta?.displacement || data.displacement;
  return displacement ? `${displacement} см³` : 'Не указан';
}

/**
 * Получить стоимость ущерба в вонах
 */
export function getAccidentCostKRW(data: CarDetailData): string {
  const cost = data.meta?.myaccidentcost || 0;
  return cost.toLocaleString('ru-RU') + ' ₩';
}

/**
 * Получить стоимость ущерба в рублях
 */
export function getAccidentCostRUB(data: CarDetailData): string {
  const cost = data.current?.usdt?.insurance?.totalAccidentCostRUB || 0;
  return cost.toLocaleString('ru-RU') + ' ₽';
}

/**
 * Получить стоимость авто в Корее (с пересчетом по USDT/RUB в USDT режиме)
 */
export function getKoreaPriceRUB(data: CarDetailData): string {
  const price = data.current?.usdt?.koreaExpenses?.priceRUB
    ?? data.currentData?.koreaExpenses?.priceRUB
    ?? 0;
  return price.toLocaleString('ru-RU') + ' ₽';
}

/**
 * Получить фрахт + расходы в Корее
 */
export function getKoreaExpensesRUB(data: CarDetailData): string {
  const expenses = data.current?.usdt?.koreaExpenses?.KCLfeeRUB
    ?? data.currentData?.koreaExpenses?.KCLfeeRUB
    ?? 0;
  return expenses.toLocaleString('ru-RU') + ' ₽';
}

/**
 * Получить таможенную ставку
 */
export function getCustomsDuty(data: CarDetailData): string {
  const duty = data.current?.usdt?.customs?.duty
    ?? data.currentData?.customs?.duty
    ?? 0;
  return duty.toLocaleString('ru-RU') + ' ₽';
}

/**
 * Получить утилизационный сбор
 */
export function getUtilFee(data: CarDetailData): string {
  const fee = data.current?.usdt?.customs?.utilFee
    ?? data.currentData?.customs?.utilFee
    ?? 0;
  return fee.toLocaleString('ru-RU') + ' ₽';
}

/**
 * Получить услуги во Владивостоке
 */
export function getBrokerFee(data: CarDetailData): string {
  const fee = data.current?.usdt?.customs?.brokerFee
    ?? data.currentData?.customs?.brokerFee
    ?? 0;
  return fee.toLocaleString('ru-RU') + ' ₽';
}

/**
 * Получить таможенное оформление
 */
export function getCustomsClearance(data: CarDetailData): string {
  const clearance = data.current?.usdt?.customs?.customsClearance
    ?? data.currentData?.customs?.customsClearance
    ?? 0;
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
  const total = data.currentData?.total || getFinalPrice(data);
  return total.toLocaleString('ru-RU') + ' ₽';
}

/**
 * Получить курсы валют
 */
export function getExchangeRates(data: CarDetailData) {
  const rates = data.current?.exchange_rates;
  if (!rates) return null;
  
  return {
    rubKrw: (1 / rates.krw_rub).toFixed(2),
    eurRub: rates.eur_rub.toFixed(2),
    usdtKrw: rates.usdt_krw.toFixed(2),
    usdtRub: rates.usdt_rub.toFixed(2)
  };
}

/**
 * Фильтровать и отсортировать фотографии для детальной страницы
 * Удаление дублей по path, сортировка по code, URL преобразование
 */
export function processDetailPhotos(data: CarDetailData): string[] {
  const photoPaths = data.meta?.photo_paths || data.photo_paths || [];

  if (!photoPaths || photoPaths.length === 0) {
    return ['/placeholder.svg'];
  }

  // Создаем Map для удаления дубликатов по path
  const uniquePhotos = new Map<string, { code?: string; path: string }>();
  
  photoPaths.forEach(photo => {
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
    // Если путь уже полный URL, возвращаем как есть
    if (photo.path.startsWith('http')) {
      return photo.path;
    }
    
    // Иначе строим URL для ci.encar.com
    const baseUrl = 'https://ci.encar.com';
    const imageParams = 'impolicy=heightRate&rh=696&cw=1160&ch=696&cg=Center&wtmk=https://ci.encar.com/wt_mark/w_mark_04.png';
    const cleanPath = photo.path.startsWith('/') ? photo.path : `/${photo.path}`;
    
    return `${baseUrl}${cleanPath}?${imageParams}`;
  });
}
