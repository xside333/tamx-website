// lib/koreanMapping.js - маппинги корейских названий топлива

export const fuelMap = {
  "가솔린":                { ru: "Бензин", en: "gasoline" },
  "디젤":                  { ru: "Дизель", en: "diesel" },
  "가솔린+전기":           { ru: "Бензин + Электро", en: "gasoline_electric" },
  "디젤+전기":             { ru: "Дизель + Электро", en: "diesel_electric" },
  "가솔린+LPG":            { ru: "Бензин + Газ", en: "gasoline_gas" },
  "가솔린+CNG":            { ru: "Бензин + Газ", en: "gasoline_cng" },
  "전기":                  { ru: "Электро", en: "electric" },
  "수소":                  { ru: "Водород", en: "hydrogen" },
  "LPG+전기":              { ru: "Газ + Электро", en: "gas_electric" },
  "하이브리드":            { ru: "Гибрид", en: "hybrid" },
  "플러그인 하이브리드":   { ru: "Подзаряжаемый гибрид", en: "plug_in_hybrid" },
  "전기차":                { ru: "Электромобиль", en: "electric_car" },
  "LPG":                   { ru: "Газ", en: "gas" },
  "LPG(일반인 구입)":      { ru: "Газ (общая продажа)", en: "gas_general" },
  "CNG":                   { ru: "Газ", en: "cng" },
  "기타":                  { ru: "Не указан", en: "not_specified" }
};

// Простая функция транслитерации fuelname -> английское название
export function getFuelEnglish(fuelname) {
  const mapping = fuelMap[fuelname];
  return mapping ? mapping.en : fuelname;
}

// Простая функция транслитерации fuelname -> русское название
export function getFuelRussian(fuelname) {
  const mapping = fuelMap[fuelname];
  return mapping ? mapping.ru : fuelname;
}

