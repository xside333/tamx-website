export function calcCarFull(car, customsRates, utilRates, exchange, customsFee, customsRate03, swiftRates, prodDate, category) {
  const res = {};
  ['usdt', 'swift'].forEach((currencyMode) => {
    const usdtRub = exchange.usdt_rub ?? 0;
    const usdtKrw = exchange.usdt_krw ?? 0;
    const eurRub = exchange.eur_rub ?? 0;
    const krwRub = exchange.krw_rub ?? 0;
    const swiftKrwRub = swiftRates.hana_rub ?? 0;

    const priceKRW = (car.price ?? 0) * 10000;
    const KCLfeeKRW = 2000000;

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
    const now = new Date();
    const ageInMonths = baseDate ? (now.getFullYear() - baseDate.getFullYear()) * 12 + (now.getMonth() - baseDate.getMonth()) : 0;

    let customsRate = { mode: "eur", value: 0 };
    const match = customsRates.find(r => volume >= r.engine_volume_min && volume <= r.engine_volume_max && r[category] === true);
    if (category === "rate_0_3") {
      customsRate = { mode: "percent", value: match?.rate_percent ?? 0 };
    } else {
      customsRate = { mode: "eur", value: match?.rate_eur ?? 0 };
    }

    const fuel = car.fuelname;
    const isCombustion = !["전기", "수소", "수소+전기"].includes(fuel);
    const isNew = category === "rate_0_3";
    const actualYear = now.getFullYear();
    const utilMatch = utilRates.find(r =>
      r.year === actualYear && volume >= r.engine_volume_min &&
      volume <= r.engine_volume_max && r.is_new === isNew &&
      r.is_personal === true && r.is_combustion === isCombustion
    );
    const utilFee = utilMatch?.rate ?? 0;

    const priceRUBforFee = priceKRW * krwRub;
    const customsClearance = 100000;

    let duty = 0;
    if (customsRate.mode === "eur") {
      duty = customsRate.value * volume * eurRub;
    } else if (customsRate.mode === "percent") {
      if (category === "rate_0_3") {
        const priceEUR = priceRUBforFee / eurRub;
        const rate03Match = customsRate03.find(r => priceEUR >= r.min_price_eur && priceEUR <= r.max_price_eur);
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
