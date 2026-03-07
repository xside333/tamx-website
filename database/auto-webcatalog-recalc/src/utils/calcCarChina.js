/**
 * Расчёт итоговой стоимости для китайских авто (CNY → RUB)
 * Один режим — VTB (прямой банковский курс cny_rub_vtb)
 *
 * priceRUB = priceCNY * cny_rub_vtb
 * totalprice_usd считается через курс ЦБ (usd_rub)
 */
export function calcCarChina(car, customsRates, utilRates, utilDecember2025, exchange, customsFee, customsRate03, prodDate, category, hp = 0, currentYear = null, simulatedDate = null) {
  const utilYear = currentYear || new Date().getFullYear();
  const utilColumnName = utilYear.toString();

  const eurRub    = exchange.eur_rub      ?? 0;
  const cnyRubVtb = exchange.cny_rub_vtb  ?? 0;

  // Цена в юанях (che168 хранит реальную цену, без множителя)
  const priceCNY = car.price ?? 0;

  // Внутренние расходы в Китае: 15 000 CNY (логистика, оформление)
  const INTERNAL_EXPENSES_CNY = 15400;

  const priceRUB = Math.round(priceCNY * cnyRubVtb);
  const internalExpensesRUB = Math.round(INTERNAL_EXPENSES_CNY * cnyRubVtb);
  const totalAuto = priceRUB + internalExpensesRUB;

  // Объём двигателя в см³ (уже конвертирован при передаче)
  const volume = Number(car.displacement_cc || 0);

  // Расчёт возраста авто
  const year = Number(prodDate?.substring(0, 4));
  const month = Number(prodDate?.substring(4, 6)) - 1;
  const baseDate = new Date(year, month, 1);
  const now = simulatedDate || new Date();
  const ageInMonths = baseDate
    ? (now.getFullYear() - baseDate.getFullYear()) * 12 + (now.getMonth() - baseDate.getMonth())
    : 0;

  // Ставка таможенной пошлины
  let customsRate = { mode: 'eur', value: 0 };
  const match = customsRates.find(r =>
    volume > r.engine_volume_min && volume <= r.engine_volume_max && r[category] === true
  );
  if (category === 'rate_0_3') {
    customsRate = { mode: 'percent', value: match?.rate_percent ?? 0 };
  } else {
    customsRate = { mode: 'eur', value: match?.rate_eur ?? 0 };
  }

  // Определение типа двигателя для утильсбора
  const fuel = car.engine_type;
  const ageInYears = Math.floor(ageInMonths / 12);
  const volumeInLiters = volume / 1000;

  // ДВС-топлива (русские значения из che168)
  const iceFuelsChina = ['Бензиновый', 'Дизельный'];

  let engineType = null;
  if (iceFuelsChina.includes(fuel)) {
    engineType = 'ice';
  } else {
    engineType = 'ev_hybrid';
  }

  // Утилизационный сбор
  const BASE_UTIL_FEE = 20000;
  let utilFee = 0;

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
    // Fallback на старую логику
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

  // Таможенная пошлина — по cny_rub_vtb (прямой курс)
  const priceRUBforFee = priceCNY * cnyRubVtb;
  const customsClearance = 100000;

  let duty = 0;
  if (customsRate.mode === 'eur') {
    duty = customsRate.value * volume * eurRub;
  } else if (customsRate.mode === 'percent') {
    if (category === 'rate_0_3') {
      const priceEUR = priceRUBforFee / eurRub;
      const rate03Match = customsRate03.find(r =>
        priceEUR > r.min_price_eur && priceEUR <= r.max_price_eur
      );
      if (rate03Match) {
        const percentDuty = rate03Match.percent / 100 * priceRUBforFee;
        const minDuty = rate03Match.min_rate_per_cm3_eur * volume * eurRub;
        duty = Math.max(percentDuty, minDuty);
      }
    } else {
      duty = priceCNY * customsRate.value * cnyRubVtb;
    }
  }

  // Брокер
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

  return {
    customs,
    chinaExpenses: {
      priceCNY,
      priceRUB,
      internalExpensesCNY: INTERNAL_EXPENSES_CNY,
      internalExpensesRUB,
      totalAuto,
    },
    delivery: 0,
    total: Math.round(totalAuto + totalCustom),
  };
}
