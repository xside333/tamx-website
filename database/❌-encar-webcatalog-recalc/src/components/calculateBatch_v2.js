import { logger } from '../utils/logger.js';
import { calcCarFull } from '../utils/calcCarFull_v2.js';
import { colorMap, fuelMap, regionMap, modelnameMap } from '../utils/koreanMapping.js';
import { getHorsepowerBatch } from '../utils/getHorsepower.js';

// Генерация путей фото по ID (если фото отсутствуют)
function genPhotoArtifactsFromId(idInput) {
  const idStr = String(idInput || '').trim();
  if (idStr.length < 4) {
    return { outer: null, inner: null, photoObjs: [] };
  }
  const first4 = idStr.slice(0, 4);
  const fourthDigit = idStr[3] || '0';
  const xx = String(fourthDigit).padStart(2, '0');
  const base = `/carpicture${xx}/pic${first4}/${idStr}_`;

  const codes = Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(3, '0'));
  const photoObjs = codes.map(code => ({ code, path: `${base}${code}.jpg` }));

  return {
    outer: `${base}001.jpg`,
    inner: `${base}007.jpg`,
    photoObjs
  };
}

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
    util_december_2025,
    exchange_rates,
    customs_fee,
    customs_rate_0_3,
    swift
  } = referenceData;

  const exchange = exchange_rates[0];
  const swiftRates = swift[0];

  logger(`🧮 Calculating batch of ${rows.length} rows`);

  // Загружаем hp для всех авто в батче
  // Берём car.hp из encar_db_prod (уже обновлён через syncHpToProd())
  const hpMap = await getHorsepowerBatch(rows);

  const now = new Date();

  const results = rows.map(car => {
    // Получаем hp для текущего авто из encar_db_prod
    const hp = hpMap.get(car.id) || 0;
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
    const currentYear = new Date().getFullYear();
    const current = calcCarFull(
      car,
      customs_rates,
      util_rates,
      util_december_2025,
      exchange,
      customs_fee,
      customs_rate_0_3,
      swiftRates,
      prodDate,
      category,
      hp,
      currentYear  // Передаём текущий год для выбора правильной колонки утиль-сбора
    );

    // Симуляция проходного авто
    let simulated;
    if (category === 'rate_0_3' && monthsToPass <= 12) {
      const simulatedDate = new Date();
      // Симулированная дата = когда авто СТАНЕТ проходным (через monthsToPass месяцев)
      simulatedDate.setMonth(simulatedDate.getMonth() + monthsToPass);
      
      // Определяем год для симулированной даты (может отличаться от текущего)
      const simulatedYear = simulatedDate.getFullYear();
      
      // ВАЖНО: Передаём simulatedDate для правильного расчёта возраста авто
      // При симуляции возраст авто должен быть 3+ года (проходное)
      // simulatedYear используется для выбора правильного коэффициента утиль-сбора (2025/2026/2027)
      simulated = {
        ...calcCarFull(
          car,
          customs_rates,
          util_rates,
          util_december_2025,
          exchange,
          customs_fee,
          customs_rate_0_3,
          swiftRates,
          prodDate,        // Оригинальная дата производства
          'rate_3_5',      // Категория проходного авто
          hp,
          simulatedYear,   // Год для выбора колонки утиль-сбора
          simulatedDate    // НОВОЕ: Симулированная дата для расчёта возраста (3+ года)
        ),
        monthsToPass,
        // Добавляем exchange_rates для фронтенда
        exchange_rates: {
          usdt_rub: exchange.usdt_rub,
          usdt_krw: exchange.usdt_krw,
          eur_rub: exchange.eur_rub,
          krw_rub: exchange.krw_rub,
          hana_rub: swiftRates.hana_rub,
        }
      };
    }

    const normalizedGradeEnglishName =
      car.gradeenglishname && car.gradeenglishname.trim() !== ''
        ? car.gradeenglishname
        : car.gradename && car.gradename.trim() !== ''
        ? car.gradename
        : car.manufacturerenglishname;

    // Генерация фото если отсутствуют
    let finalPhotoOuter = car.photo_outer;
    let finalPhotoInner = car.photo_inner;
    let finalPhotoPaths = car.photo_paths;

    // Парсим photo_paths если это массив строк JSON (jsonb[])
    let parsedPhotoPaths = [];
    if (Array.isArray(finalPhotoPaths) && finalPhotoPaths.length > 0) {
      try {
        parsedPhotoPaths = finalPhotoPaths.map(p => 
          typeof p === 'string' ? JSON.parse(p) : p
        );
      } catch (e) {
        parsedPhotoPaths = [];
      }
    }

    // Если нет фото - генерируем
    if (!finalPhotoOuter || !finalPhotoInner || parsedPhotoPaths.length === 0) {
      const generated = genPhotoArtifactsFromId(car.id);
      finalPhotoOuter = finalPhotoOuter || generated.outer;
      finalPhotoInner = finalPhotoInner || generated.inner;
      if (parsedPhotoPaths.length === 0) {
        parsedPhotoPaths = generated.photoObjs;
      }
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
      gradeenglishname: normalizedGradeEnglishName,
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
      photo_paths: parsedPhotoPaths,
      seat_count: car.seat_count,
      transmission_name: car.transmission_name,
      trust: car.trust,
      displacement: car.displacement,
      inspection_outers: car.inspection_outers,
      category: category,
      hp: hp,
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
          car_id: String(car.id),
          manufacturerenglishname: car.manufacturerenglishname,
          modelgroupenglishname: car.modelgroupenglishname,
          modelname: modelRu,
          modelfilter: modelEn,
          gradeenglishname: normalizedGradeEnglishName,
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
          photo_outer: finalPhotoOuter || null,
          photo_inner: finalPhotoInner || null,
          photos: parsedPhotoPaths,
          viewcount: car.viewcount,
          inspection_outers: car.inspection_outers,
          hp: hp
        }
      }
    };
  });

  logger('✅ Batch calculation completed');
  return results;
}
