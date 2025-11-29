import { logger } from '../utils/logger.js';
import { calcCarFull } from '../utils/calcCarFull.js';
import { colorMap, fuelMap, regionMap, modelnameMap } from '../utils/koreanMapping.js';

function getCategory(ageInMonths) {
  if (ageInMonths < 36) return 'rate_0_3';
  if (ageInMonths < 60) return 'rate_3_5';
  return 'rate_5_plus';
}

function mapValue(map, value, field = 'ru') {
  return map[value]?.[field] || value || 'Неизвестно';
}

export async function calculateBatch(rows, referenceData) {
  const {
    customs_rates,
    util_rates,
    exchange_rates,
    customs_fee,
    customs_rate_0_3,
    swift
  } = referenceData;

  const exchange = exchange_rates[0];
  const swiftRates = swift[0];

  logger(`🧮 Calculating batch of ${rows.length} rows`);

  const now = new Date();

  const results = rows.map(car => {
    const prodDate = car.yearmonth_prod && car.yearmonth_prod !== '1'
      ? car.yearmonth_prod
      : car.yearmonth;
    const year = Number(prodDate.substring(0, 4));
    const month = Number(prodDate.substring(4, 6)) - 1;
    const baseDate = new Date(year, month, 1);
    const ageInMonths = (now.getFullYear() - baseDate.getFullYear()) * 12
                      + now.getMonth() - baseDate.getMonth();
    const monthsToPass = Math.max(36 - ageInMonths, 0);
    const category = getCategory(ageInMonths);

    // Переводы через универсальную функцию
    const colorRu = mapValue(colorMap, car.colorname, 'ru');
    const colorEn = mapValue(colorMap, car.colorname, 'en');
    const fuelRu  = mapValue(fuelMap, car.fuelname, 'ru');
    const fuelEn  = mapValue(fuelMap, car.fuelname, 'en');
    const addressRu = mapValue(regionMap, car.address);
    const modelRu = mapValue(modelnameMap, car.modelname, 'ru');
    const modelEn = mapValue(modelnameMap, car.modelname, 'en');

    // Основной расчёт
    const current = calcCarFull(
      car,
      customs_rates,
      util_rates,
      exchange,
      customs_fee,
      customs_rate_0_3,
      swiftRates,
      prodDate,
      category
    );

    // Симуляция проходного авто
    let simulated;
    if (category === 'rate_0_3' && monthsToPass <= 12) {
      const simulatedDate = new Date();
      simulatedDate.setMonth(simulatedDate.getMonth() - (36 - monthsToPass));
      const simulatedProd = `${simulatedDate.getFullYear()}${(simulatedDate.getMonth() + 1)
        .toString().padStart(2, '0')}`;
      simulated = {
        ...calcCarFull(
          car,
          customs_rates,
          util_rates,
          exchange,
          customs_fee,
          customs_rate_0_3,
          swiftRates,
          simulatedProd,
          'rate_3_5'
        ),
        monthsToPass
      };
    }

    return {
      id: car.id,
      url: car.url,
      cartype: car.cartype,
      firstadvertiseddatetime: car.firstadvertiseddatetime,
      viewcount: car.viewcount,
      manufacturername: car.manufacturername,
      manufacturerenglishname: car.manufacturerenglishname,
      modelgroupname: car.modelgroupname,
      modelgroupenglishname: car.modelgroupenglishname,
      modelname: modelRu,
      modelfilter: modelEn,
      gradename: car.gradename,
      gradeenglishname: car.gradeenglishname,
      yearmonth: car.yearmonth,
      yearmonth_prod: car.yearmonth_prod,
      mileage: car.mileage,
      colorname: colorRu,
      colorfilter: colorEn,
      fuelname: fuelRu,
      fuelfilter: fuelEn,
      price: car.price,
      vehicleno: car.vehicleno,
      myaccidentcnt: car.myaccidentcnt,
      myaccidentcost: car.myaccidentcost,
      address: addressRu,
      photo_paths: car.photo_paths,
      seat_count: car.seat_count,
      transmission_name: car.transmission_name,
      trust: car.trust,
      displacement: car.displacement,
      category: category,
      totalprice_rub: current.usdt.total,
      totalprice_usd: Math.round(current.usdt.total / exchange.usdt_rub),
      json: {
        car_id: car.id,
        firstadvertiseddatetime: car.firstadvertiseddatetime,
        category: category,
        current: {
          ...current,
          exchange_rates: {
            usdt_rub: exchange.usdt_rub,
            usdt_krw: exchange.usdt_krw,
            eur_rub: exchange.eur_rub,
            krw_rub: exchange.krw_rub,
            hana_rub: swiftRates.hana_rub,
          }
        },
        ...(simulated ? { simulated } : {}),
        meta: {
          manufacturerenglishname: car.manufacturerenglishname,
          modelgroupenglishname: car.modelgroupenglishname,
          modelname: modelRu,
          modelfilter: modelEn,
          gradeenglishname: car.gradeenglishname,
          yearmonth_prod: car.yearmonth_prod,
          yearmonth: car.yearmonth,
          color: colorRu,
          colorfilter: colorEn,
          fuel: fuelRu,
          fuelfilter: fuelEn,
          address: addressRu,
          price: car.price,
          mileage: car.mileage,
          myaccidentcnt: car.myaccidentcnt,
          myaccidentcost: car.myaccidentcost,
          displacement: car.displacement,
          photo_paths: car.photo_paths,
          viewcount: car.viewcount
        }
      }
    };
  });

  logger('✅ Batch calculation completed');
  return results;
}
