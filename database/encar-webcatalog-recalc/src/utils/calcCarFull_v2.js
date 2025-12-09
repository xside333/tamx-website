export function calcCarFull(car, customsRates, utilRates, utilDecember2025, exchange, customsFee, customsRate03, swiftRates, prodDate, category, hp = 0, currentYear = null, simulatedDate = null) {
  const res = {};
  
  // Определяем год для расчёта утиль-сбора
  const utilYear = currentYear || new Date().getFullYear();
  const utilColumnName = utilYear.toString(); // "2025", "2026" или "2027"
  
  ['usdt', 'swift'].forEach((currencyMode) => {
    const usdtRub = exchange.usdt_rub ?? 0;
    const usdtKrw = exchange.usdt_krw ?? 0;
    const eurRub = exchange.eur_rub ?? 0;
    const krwRub = exchange.krw_rub ?? 0;
    const swiftKrwRub = swiftRates.hana_rub ?? 0;

    const priceKRW = (car.price ?? 0) * 10000;
    const KCLfeeKRW = 1500000;

    let priceRUB = 0, KCLfeeRUB = 0;

    if (currencyMode === "usdt") {
      priceRUB = usdtKrw > 0 ? Math.round(priceKRW / usdtKrw * usdtRub) : 0;
      KCLfeeRUB = usdtKrw > 0 ? Math.round(KCLfeeKRW / usdtKrw * usdtRub) : 0;
    } else {
      priceRUB = swiftKrwRub > 0 ? Math.round(priceKRW / swiftKrwRub) : 0;
      KCLfeeRUB = swiftKrwRub > 0 ? Math.round(KCLfeeKRW / swiftKrwRub) : 0;
    }

    const totalAuto = priceRUB + KCLfeeRUB;

    const volume = Number(car.displacement);
    const year = Number(prodDate?.substring(0, 4));
    const month = Number(prodDate?.substring(4, 6)) - 1;
    const baseDate = new Date(year, month, 1);
    // ВАЖНО: При симуляции используем симулированную дату для расчёта возраста
    // Это нужно, чтобы авто rate_0_3 при симуляции считалось как проходное (3+ года)
    const now = simulatedDate || new Date();
    const ageInMonths = baseDate ? (now.getFullYear() - baseDate.getFullYear()) * 12 + (now.getMonth() - baseDate.getMonth()) : 0;

    let customsRate = { mode: "eur", value: 0 };
    const match = customsRates.find(r => volume > r.engine_volume_min && volume <= r.engine_volume_max && r[category] === true);
    if (category === "rate_0_3") {
      customsRate = { mode: "percent", value: match?.rate_percent ?? 0 };
    } else {
      customsRate = { mode: "eur", value: match?.rate_eur ?? 0 };
    }

    const fuel = car.fuelname;
    const ageInYears = Math.floor(ageInMonths / 12);
    
    // Новый расчёт утилизационного сбора с учётом hp
    const BASE_UTIL_FEE = 20000; // Базовая ставка утилизационного сбора
    let utilFee = 0;
    
    // Конвертируем displacement из см³ в литры для сравнения
    // Например: 1999 см³ -> 1.999 л, 2394 см³ -> 2.394 л
    const volumeInLiters = volume / 1000;
    
    // Определяем тип двигателя напрямую по корейским значениям fuelname
    // ICE (ДВС) - корейские значения
    const iceFuelsKorean = [
      "가솔린",              // Бензин
      "디젤",                // Дизель
      "LPG",                 // Газ
      "LPG(일반인 구입)",    // Газ (общая продажа)
      "가솔린+LPG",          // Бензин + Газ
      "수소"                 // Водород
    ];
    
    let engineType = null;
    
    if (fuel === "기타") {
      // Если топливо "Не указан", утильсбор = 0
      utilFee = 0;
    } else if (iceFuelsKorean.includes(fuel)) {
      engineType = 'ice';
    } else {
      // Все остальные топлива (электро, гибрид и т.д.) = ev_hybrid
      engineType = 'ev_hybrid';
    }
    
    if (hp > 0 && utilDecember2025 && utilDecember2025.length > 0 && engineType) {
      // Ищем в новой таблице util_december_2025
      const utilMatch = utilDecember2025.find(r => {
        // Сравниваем возраст авто с диапазоном из таблицы
        // Для year_from = 0: >= 0 AND < year_to (НЕ включая верхнюю границу, т.к. 3 года = проходное)
        // Для year_from > 0: >= year_from AND <= year_to (включая обе границы)
        const ageMatch = r.year_from === 0 
          ? (ageInYears >= r.year_from && ageInYears < r.year_to)
          : (ageInYears >= r.year_from && ageInYears <= r.year_to);
        
        // Для гибридов (ev_hybrid) в таблице l_from и l_to всегда 0, поэтому не проверяем объем
        // Для ДВС (ice) проверяем объём в литрах (правило: > от AND <= до)
        const volumeMatch = engineType === 'ev_hybrid' 
          ? true  // Для гибридов объем не проверяем
          : (volumeInLiters > r.l_from && volumeInLiters <= r.l_to);
        
        // Сравниваем тип двигателя
        const engineMatch = r.engine_type === engineType;
        // Сравниваем лошадиные силы с диапазоном из таблицы (правило: > от AND <= до)
        const powerMatch = hp > r.power_from && hp <= r.power_to;
        
        return ageMatch && volumeMatch && engineMatch && powerMatch;
      });
      
      if (utilMatch) {
        // Берём коэффициент из колонки соответствующего года (2025, 2026 или 2027)
        const coefficient = utilMatch[utilColumnName] ?? utilMatch["2025"] ?? 0;
        utilFee = coefficient * BASE_UTIL_FEE;
      }
    } else if (hp === 0) {
      // Если hp = 0, утильсбор = 0
      utilFee = 0;
    } else {
      // Fallback на старую логику, если новая таблица не загружена
      const isNew = category === "rate_0_3";
      const actualYear = now.getFullYear();
      const isCombustion = engineType === 'ice';
      const utilMatch = utilRates?.find(r =>
        r.year === actualYear && volume > r.engine_volume_min &&
        volume <= r.engine_volume_max && r.is_new === isNew &&
        r.is_personal === true && r.is_combustion === isCombustion
      );
      utilFee = utilMatch?.rate ?? 0;
    }

    const priceRUBforFee = priceKRW * krwRub;
    const customsClearance = customsFee.find(fee =>
      priceRUBforFee > fee.price_min && priceRUBforFee <= fee.price_max
    )?.rate_rub ?? 10000;

    let duty = 0;
    if (customsRate.mode === "eur") {
      duty = customsRate.value * volume * eurRub;
    } else if (customsRate.mode === "percent") {
      if (category === "rate_0_3") {
        const priceEUR = priceRUBforFee / eurRub;
        const rate03Match = customsRate03.find(r => priceEUR > r.min_price_eur && priceEUR <= r.max_price_eur);
        if (rate03Match) {
          const percentDuty = rate03Match.percent / 100 * priceRUBforFee;
          const minDuty = rate03Match.min_rate_per_cm3_eur * volume * eurRub;
          duty = Math.max(percentDuty, minDuty);
        }
      } else {
        duty = priceKRW * customsRate.value * krwRub;
      }
    }

    const brokerFee = 110000;
    const totalCustom = customsClearance + duty + utilFee + brokerFee;

    const customs = {
      carAge: ageInMonths / 12,
      category,
      customsRate,
      utilFee: Math.round(utilFee),
      customsClearance: Math.round(customsClearance),
      duty: Math.round(duty),
      brokerFee,
      totalCustom: Math.round(totalCustom)
    };

    const myAccidentCostKRW = car.myaccidentcost || 0;
    const currentRate = currencyMode === "usdt"
      ? (usdtKrw > 0 ? usdtRub / usdtKrw : 0)
      : (swiftKrwRub > 0 ? 1 / swiftKrwRub : 0);

    const totalAccidentCostRUB = Math.round(myAccidentCostKRW * currentRate);
    const insPercent = priceKRW ? Math.round(myAccidentCostKRW / priceKRW * 100) : 0;

    const insurance = {
      accidentCount: car.myaccidentcnt || 0,
      myAccidentCostKRW,
      totalAccidentCostRUB,
      insPercent
    };

    res[currencyMode] = {
      customs,
      koreaExpenses: {
        priceKRW, priceRUB, KCLfeeKRW, KCLfeeRUB, totalAuto, currencyMode
      },
      insurance,
      delivery: 0,
      total: Math.round(totalAuto + totalCustom)
    };
  });

  return res;
}
