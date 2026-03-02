/**
 * Единый calculateBatch для обоих источников (Korea + China)
 * Определяет source по переданному sourceType, вызывает соответствующий расчёт
 */
import { logger } from '../utils/logger.js';
import { calcCarKorea } from '../utils/calcCarKorea.js';
import { calcCarChina } from '../utils/calcCarChina.js';
import { colorMap, fuelMap, regionMap, modelnameMap } from '../utils/koreanMapping.js';
import { normalizeBrandModel } from '../utils/brandModelMapping.js';
import {
  che168ColorToEnglish, che168FuelToEnglish,
  che168TransmissionToUnified, encarTransmissionToUnified,
  che168BodyTypeToUnified, che168DriveTypeToUnified,
} from '../utils/columnMapping.js';
import { getHorsepowerBatch } from '../utils/getHorsepower.js';

// --- Хелперы ---

function getCategory(ageInMonths) {
  if (ageInMonths < 36) return 'rate_0_3';
  if (ageInMonths < 60) return 'rate_3_5';
  return 'rate_5_plus';
}

function mapValue(map, value, field = 'ru') {
  return map[value]?.[field] || value || 'Неизвестно';
}

/** Генерация путей фото по ID encar */
function genPhotoArtifactsFromId(idInput) {
  const idStr = String(idInput || '').trim();
  if (idStr.length < 4) return { outer: null, inner: null, photoObjs: [] };
  const first4 = idStr.slice(0, 4);
  const fourthDigit = idStr[3] || '0';
  const xx = String(fourthDigit).padStart(2, '0');
  const base = `/carpicture${xx}/pic${first4}/${idStr}_`;
  const codes = Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(3, '0'));
  const photoObjs = codes.map(code => ({ code, path: `${base}${code}.jpg` }));
  return { outer: `${base}001.jpg`, inner: `${base}007.jpg`, photoObjs };
}

// =============================================================================
//  ENCAR (Korea) batch
// =============================================================================

function calculateEncarBatch(rows, referenceData, hpMap) {
  const { customs_rates, util_rates, util_december_2025, exchange_rates, customs_fee, customs_rate_0_3, swift } = referenceData;
  const exchange = exchange_rates[0];
  const swiftRates = swift[0];
  const now = new Date();
  const currentYear = now.getFullYear();

  return rows.map(car => {
    const hp = hpMap.get(car.id) || 0;
    const prodDate = car.yearmonth_prod && car.yearmonth_prod !== '1' ? car.yearmonth_prod : car.yearmonth;
    const year = Number(prodDate.substring(0, 4));
    const month = Number(prodDate.substring(4, 6)) - 1;
    const baseDate = new Date(year, month, 1);
    const ageInMonths = (now.getFullYear() - baseDate.getFullYear()) * 12 + now.getMonth() - baseDate.getMonth();
    const monthsToPass = Math.max(36 - ageInMonths, 0);
    const category = getCategory(ageInMonths);

    // Маппинг корейских значений
    const colorRu = mapValue(colorMap, car.colorname, 'ru');
    const colorEn = mapValue(colorMap, car.colorname, 'en');
    const fuelRu = mapValue(fuelMap, car.fuelname, 'ru');
    const fuelEn = mapValue(fuelMap, car.fuelname, 'en');
    const addressRu = mapValue(regionMap, car.address);
    const modelRu = mapValue(modelnameMap, car.modelname, 'ru');
    const modelEn = mapValue(modelnameMap, car.modelname, 'en');
    const transmission = encarTransmissionToUnified[car.transmission_name] || car.transmission_name || null;

    // Расчёт
    const current = calcCarKorea(car, customs_rates, util_rates, util_december_2025, exchange, customs_fee, customs_rate_0_3, swiftRates, prodDate, category, hp, currentYear);

    // Симуляция проходного авто
    let simulated;
    if (category === 'rate_0_3' && monthsToPass <= 12) {
      const simulatedDate = new Date();
      simulatedDate.setMonth(simulatedDate.getMonth() + monthsToPass);
      const simulatedYear = simulatedDate.getFullYear();
      simulated = {
        ...calcCarKorea(car, customs_rates, util_rates, util_december_2025, exchange, customs_fee, customs_rate_0_3, swiftRates, prodDate, 'rate_3_5', hp, simulatedYear, simulatedDate),
        monthsToPass,
        exchange_rates: {
          usdt_rub: exchange.usdt_rub, usdt_krw: exchange.usdt_krw,
          eur_rub: exchange.eur_rub, krw_rub: exchange.krw_rub,
          hana_rub: swiftRates.hana_rub,
        },
      };
    }

    const normalizedGradeEn = car.gradeenglishname?.trim()
      ? car.gradeenglishname
      : car.gradename?.trim() ? car.gradename : car.manufacturerenglishname;

    // Фото
    let parsedPhotoPaths = [];
    if (Array.isArray(car.photo_paths) && car.photo_paths.length > 0) {
      try { parsedPhotoPaths = car.photo_paths.map(p => typeof p === 'string' ? JSON.parse(p) : p); }
      catch { parsedPhotoPaths = []; }
    }
    let finalPhotoOuter = car.photo_outer;
    let finalPhotoInner = car.photo_inner;
    if (!finalPhotoOuter || !finalPhotoInner || parsedPhotoPaths.length === 0) {
      const generated = genPhotoArtifactsFromId(car.id);
      finalPhotoOuter = finalPhotoOuter || generated.outer;
      finalPhotoInner = finalPhotoInner || generated.inner;
      if (parsedPhotoPaths.length === 0) parsedPhotoPaths = generated.photoObjs;
    }

    const yearmonthRaw = car.yearmonth_prod && car.yearmonth_prod !== '1' ? car.yearmonth_prod : car.yearmonth;

    return {
      id: `${car.id}_en`,
      source: 'K',
      url: car.url,
      brand: car.manufacturerenglishname,
      model: car.modelgroupenglishname,
      generation: modelRu,
      generation_filter: modelEn,
      grade: car.gradename,
      grade_en: normalizedGradeEn,
      year: Number(yearmonthRaw.substring(0, 4)),
      month: Number(yearmonthRaw.substring(4, 6)),
      yearmonth_raw: yearmonthRaw,
      mileage: car.mileage,
      color: colorRu,
      color_filter: colorEn,
      fuel_type: fuelRu,
      fuel_filter: fuelEn,
      transmission,
      body_type: null,
      displacement: car.displacement,
      hp,
      price_original: car.price,
      price_currency: 'KRW',
      address: addressRu,
      seller_type: null,
      photos: parsedPhotoPaths,
      offer_date: car.firstadvertiseddatetime,
      category,
      totalprice_rub: current.usdt.total,
      totalprice_usd: exchange.usdt_rub > 0 ? Math.round(current.usdt.total / exchange.usdt_rub) : 0,
      json: {
        car_id: String(car.id),
        source: 'K',
        category,
        current: {
          ...current,
          exchange_rates: {
            usdt_rub: exchange.usdt_rub, usdt_krw: exchange.usdt_krw,
            eur_rub: exchange.eur_rub, krw_rub: exchange.krw_rub,
            hana_rub: swiftRates.hana_rub,
          },
        },
        ...(simulated ? { simulated } : {}),
        meta: {
          car_id: String(car.id),
          manufacturerenglishname: car.manufacturerenglishname,
          modelgroupenglishname: car.modelgroupenglishname,
          modelname: modelRu, modelfilter: modelEn,
          gradeenglishname: normalizedGradeEn,
          yearmonth_prod: car.yearmonth_prod, yearmonth: car.yearmonth,
          color: colorRu, colorfilter: colorEn,
          fuel: fuelRu, fuelfilter: fuelEn,
          address: addressRu, price: car.price, mileage: car.mileage,
          myaccidentcnt: car.myaccidentcnt, myaccidentcost: car.myaccidentcost,
          displacement: car.displacement,
          photo_outer: finalPhotoOuter, photo_inner: finalPhotoInner,
          photos: parsedPhotoPaths, viewcount: car.viewcount,
          inspection_outers: car.inspection_outers, hp,
        },
      },
      accident_count: car.myaccidentcnt ?? null,
      accident_cost: car.myaccidentcost ?? null,
      inspection_outers: car.inspection_outers ?? [],
      seat_count: car.seat_count ?? null,
      trust: car.trust ?? null,
      vehicle_no: car.vehicleno ?? null,
      view_count: car.viewcount ?? null,
      drive_type: null, // Нет данных о приводе в encar
    };
  });
}

// =============================================================================
//  CHE168 (China) batch
// =============================================================================

function calculateChe168Batch(rows, referenceData) {
  const { customs_rates, util_rates, util_december_2025, exchange_rates, customs_fee, customs_rate_0_3 } = referenceData;
  const exchange = exchange_rates[0];
  const now = new Date();
  const currentYear = now.getFullYear();
  const cnyRubVtb = exchange.cny_rub_vtb ?? 0;
  const usdRub    = exchange.usd_rub     ?? 0;  // курс ЦБ для totalprice_usd

  return rows.map(car => {
    // Нормализация марки/модели
    const { brand, model } = normalizeBrandModel(car.mark, car.model);

    // Год и месяц
    const carYear = car.year || now.getFullYear();
    let carMonth = 1;
    if (car.first_registration) {
      const parts = car.first_registration.split('-');
      if (parts.length >= 2) carMonth = parseInt(parts[1], 10) || 1;
    }
    const yearmonthRaw = `${carYear}${String(carMonth).padStart(2, '0')}`;

    const baseDate = new Date(carYear, carMonth - 1, 1);
    const ageInMonths = (now.getFullYear() - baseDate.getFullYear()) * 12 + now.getMonth() - baseDate.getMonth();
    const monthsToPass = Math.max(36 - ageInMonths, 0);
    const category = getCategory(ageInMonths);

    // Конвертация displacement: литры → см³
    const displacement_cc = Math.round((car.displacement || 0) * 1000);
    const hp = car.power || 0;

    // Маппинг значений
    const colorRu = car.color || null;
    const colorEn = che168ColorToEnglish[car.color] || 'other';
    const fuelRu = car.engine_type || null;
    const fuelEn = che168FuelToEnglish[car.engine_type] || car.engine_type || null;
    const transmission = che168TransmissionToUnified[car.transmission_type] || car.transmission_type || null;
    const bodyType = car.body_type || null;
    const driveType = car.drive_type ? (che168DriveTypeToUnified[car.drive_type.trim()] || car.drive_type.trim()) : null;

    // Подготавливаем объект для расчёта (с displacement_cc)
    const calcCar = { ...car, displacement_cc };

    // calcCarChina возвращает плоский объект (только VTB-режим)
    const current = calcCarChina(calcCar, customs_rates, util_rates, util_december_2025, exchange, customs_fee, customs_rate_0_3, yearmonthRaw, category, hp, currentYear);

    // Симуляция проходного авто
    let simulated;
    if (category === 'rate_0_3' && monthsToPass <= 12) {
      const simulatedDate = new Date();
      simulatedDate.setMonth(simulatedDate.getMonth() + monthsToPass);
      const simulatedYear = simulatedDate.getFullYear();
      simulated = {
        ...calcCarChina(calcCar, customs_rates, util_rates, util_december_2025, exchange, customs_fee, customs_rate_0_3, yearmonthRaw, 'rate_3_5', hp, simulatedYear, simulatedDate),
        monthsToPass,
        exchange_rates: {
          eur_rub: exchange.eur_rub, cny_rub_vtb: cnyRubVtb, usd_rub: usdRub,
        },
      };
    }

    // Фото
    let photos = [];
    if (Array.isArray(car.images)) {
      photos = car.images;
    } else if (typeof car.images === 'string') {
      try { photos = JSON.parse(car.images); } catch { photos = []; }
    }

    const sellerType = car.seller_type || (car.is_dealer ? 'dealer' : null);

    return {
      id: `${car.inner_id}_ch`,
      source: 'C',
      url: car.url,
      brand,
      model,
      generation: null,
      generation_filter: null,
      grade: null,
      grade_en: null,
      year: carYear,
      month: carMonth,
      yearmonth_raw: yearmonthRaw,
      mileage: car.km_age ?? null,
      color: colorRu,
      color_filter: colorEn,
      fuel_type: fuelRu,
      fuel_filter: fuelEn,
      transmission,
      body_type: bodyType,
      displacement: displacement_cc,
      hp,
      price_original: car.price,
      price_currency: 'CNY',
      address: car.address ?? null,
      seller_type: sellerType,
      photos,
      offer_date: car.created_at ?? car.offer_created ?? null,
      category,
      totalprice_rub: current.total,
      totalprice_usd: usdRub > 0 ? Math.round(current.total / usdRub) : 0,
      json: {
        car_id: String(car.inner_id),
        source: 'C',
        category,
        current: {
          ...current,
          exchange_rates: {
            eur_rub: exchange.eur_rub, cny_rub_vtb: cnyRubVtb, usd_rub: usdRub,
          },
        },
        ...(simulated ? { simulated } : {}),
        meta: {
          car_id: String(car.inner_id),
          brand, model,
          color: colorRu, colorfilter: colorEn,
          fuel: fuelRu, fuelfilter: fuelEn,
          transmission, body_type: bodyType,
          address: car.address, price: car.price,
          mileage: car.km_age, displacement_cc,
          photos, hp, seller_type: sellerType,
        },
      },
      accident_count: null,
      accident_cost: null,
      inspection_outers: null,
      seat_count: null,
      trust: null,
      vehicle_no: null,
      view_count: null,
      drive_type: driveType,
    };
  });
}

// =============================================================================
//  Экспорт: единая точка входа
// =============================================================================

/**
 * @param {Array} rows — массив записей из БД
 * @param {Object} referenceData — справочники
 * @param {string} sourceType — 'encar' | 'che168'
 * @returns {Array} — массив записей для UPSERT в auto_webcatalog
 */
export async function calculateBatch(rows, referenceData, sourceType) {
  logger(`🧮 calculateBatch: ${rows.length} строк (${sourceType})`);

  if (sourceType === 'encar') {
    const hpMap = await getHorsepowerBatch(rows);
    return calculateEncarBatch(rows, referenceData, hpMap);
  }

  if (sourceType === 'che168') {
    return calculateChe168Batch(rows, referenceData);
  }

  throw new Error(`Unknown sourceType: ${sourceType}`);
}
