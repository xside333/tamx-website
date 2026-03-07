/**
 * Расчёт итоговой стоимости для корейских авто (KRW → RUB)
 */
export function calcCarKorea(car, customsRates, utilRates, utilDecember2025, exchange, customsFee, customsRate03, swiftRates, prodDate, category, hp = 0, currentYear = null, simulatedDate = null) {
  const res = {};

  const utilYear = currentYear || new Date().getFullYear();
  const utilColumnName = utilYear.toString();

  ['usdt', 'swift'].forEach((currencyMode) => {
    const usdtRub = exchange.usdt_rub ?? 0;
    const usdtKrw = exchange.usdt_krw ?? 0;
    const eurRub = exchange.eur_rub ?? 0;
    const krwRub = exchange.krw_rub ?? 0;
    const swiftKrwRub = swiftRates.hana_rub ?? 0;

    const priceKRW = (car.price ?? 0) * 10000;
    const KCLfeeKRW = 2000000;

    let priceRUB = 0, KCLfeeRUB = 0;

    if (currencyMode === 'usdt') {
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
    const now = simulatedDate || new Date();
    const ageInMonths = baseDate ? (now.getFullYear() - baseDate.getFullYear()) * 12 + (now.getMonth() - baseDate.getMonth()) : 0;

    let customsRate = { mode: 'eur', value: 0 };
    const match = customsRates.find(r => volume > r.engine_volume_min && volume <= r.engine_volume_max && r[category] === true);
    if (category === 'rate_0_3') {
      customsRate = { mode: 'percent', value: match?.rate_percent ?? 0 };
    } else {
      customsRate = { mode: 'eur', value: match?.rate_eur ?? 0 };
    }

    const fuel = car.fuelname;
    const ageInYears = Math.floor(ageInMonths / 12);

    const BASE_UTIL_FEE = 20000;
    let utilFee = 0;

    const volumeInLiters = volume / 1000;

    // ДВС-топлива (корейские значения)
    const iceFuelsKorean = [
      '가솔린', '디젤', 'LPG', 'LPG(일반인 구입)', '가솔린+LPG', '수소'
    ];

    let engineType = null;

    if (fuel === '기타') {
      utilFee = 0;
    } else if (iceFuelsKorean.includes(fuel)) {
      engineType = 'ice';
    } else {
      engineType = 'ev_hybrid';
    }

    if (hp > 0 && utilDecember2025 && utilDecember2025.length > 0 && engineType) {
      const utilMatch = utilDecember2025.find(r => {
        const ageMatch = r.year_from === 0
          ? (ageInYears >= r.year_from && ageInYears < r.year_to)
          : (ageInYears >= r.year_from && ageInYears <= r.year_to);
        const volumeMatch = engineType === 'ev_hybrid'
          ? true
          : (volumeInLiters > r.l_from && volumeInLiters <= r.l_to);
        const engineMatch = r.engine_type === engineType;
        const powerMatch = hp > r.power_from && hp <= r.power_to;
        return ageMatch && volumeMatch && engineMatch && powerMatch;
      });

      if (utilMatch) {
        const coefficient = utilMatch[utilColumnName] ?? utilMatch['2025'] ?? 0;
        utilFee = coefficient * BASE_UTIL_FEE;
      }
    } else if (hp === 0) {
      utilFee = 0;
    } else {
      const isNew = category === 'rate_0_3';
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
    const customsClearance = 100000;

    let duty = 0;
    if (customsRate.mode === 'eur') {
      duty = customsRate.value * volume * eurRub;
    } else if (customsRate.mode === 'percent') {
      if (category === 'rate_0_3') {
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

    const brokerFee = 100000;
    const totalCustom = customsClearance + duty + utilFee + brokerFee;

    const customs = {
      carAge: ageInMonths / 12,
      category,
      customsRate,
      utilFee: Math.round(utilFee),
      customsClearance: Math.round(customsClearance),
      duty: Math.round(duty),
      brokerFee,
      totalCustom: Math.round(totalCustom),
    };

    const myAccidentCostKRW = car.myaccidentcost || 0;
    const currentRate = currencyMode === 'usdt'
      ? (usdtKrw > 0 ? usdtRub / usdtKrw : 0)
      : (swiftKrwRub > 0 ? 1 / swiftKrwRub : 0);

    const totalAccidentCostRUB = Math.round(myAccidentCostKRW * currentRate);
    const insPercent = priceKRW ? Math.round(myAccidentCostKRW / priceKRW * 100) : 0;

    const insurance = {
      accidentCount: car.myaccidentcnt || 0,
      myAccidentCostKRW,
      totalAccidentCostRUB,
      insPercent,
    };

    res[currencyMode] = {
      customs,
      koreaExpenses: { priceKRW, priceRUB, KCLfeeKRW, KCLfeeRUB, totalAuto, currencyMode },
      insurance,
      delivery: 0,
      total: Math.round(totalAuto + totalCustom),
    };
  });

  return res;
}
