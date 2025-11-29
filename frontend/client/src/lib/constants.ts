/**
 * Константы для фильтров каталога
 * Используются вместо данных из API для Топлива и Цветов кузова
 */

export const FUEL_TYPES = [
  { value: "gasoline", label: "Бензин" },
  { value: "diesel", label: "Дизель" },
  { value: "gasoline_electric", label: "Бензин + Электро" },
  { value: "diesel_electric", label: "Дизель + Электро" },
  { value: "gasoline_gas", label: "Бензин + Газ" },
  { value: "electric", label: "Электро" },
  { value: "hydrogen", label: "Водород" },
  { value: "gas_electric", label: "Газ + Электро" },
  { value: "gas_general", label: "Газ (общая продажа)" },
  { value: "not_specified", label: "Не указан" },
] as const;

export const CAR_COLORS = {
  PRIMARY: [
    { value: "white", label: "Белый", hex: "#FFFFFF" },
    { value: "black", label: "Чёрный", hex: "#000000" },
    { value: "gray", label: "Серый", hex: "#808080" },
    { value: "silver", label: "Серебряный", hex: "#C0C0C0" },
    { value: "blue", label: "Синий", hex: "#0057FF" },
    { value: "red", label: "Красный", hex: "#E53935" },
    { value: "brown", label: "Коричневый", hex: "#8B4513" },
  ],
  EXTENDED: [
    { value: "two_tone_black", label: "Двухцветный чёрный", hex: "#1C1C1C" },
    { value: "silver_gray", label: "Серебряно-серый", hex: "#BEBEBE" },
    { value: "two_tone_silver", label: "Двухцветный серебряный", hex: "#D3D3D3" },
    { value: "pearl_white", label: "Жемчужно-белый", hex: "#F8F8FF" },
    { value: "two_tone_white", label: "Двухцветный белый", hex: "#FAFAFA" },
    { value: "two_tone_pearl_white", label: "Двухцветный жемчужно-белый", hex: "#FDFDFD" },
    { value: "light_blue", label: "Светло-голубой", hex: "#ADD8E6" },
    { value: "light_silver", label: "Светло-серебряный", hex: "#DCDCDC" },
    { value: "reed", label: "Тростниковый", hex: "#B2BEB5" },
    { value: "light_gold", label: "Светло-золотистый", hex: "#E6C873" },
    { value: "two_tone_brown", label: "Двухцветный коричневый", hex: "#A0522D" },
    { value: "gold", label: "Золотой", hex: "#FFD700" },
    { value: "two_tone_gold", label: "Двухцветный золотой", hex: "#E6BE8A" },
    { value: "sky_blue", label: "Небесно-голубой", hex: "#87CEEB" },
    { value: "dark_green", label: "Тёмно-зелёный", hex: "#006400" },
    { value: "green", label: "Зелёный", hex: "#008000" },
    { value: "lime", label: "Салатовый", hex: "#7CFC00" },
    { value: "turquoise", label: "Бирюзовый", hex: "#40E0D0" },
    { value: "orange", label: "Оранжевый", hex: "#FFA500" },
    { value: "purple", label: "Фиолетовый", hex: "#800080" },
    { value: "pink", label: "Розовый", hex: "#FFC0CB" },
    { value: "yellow", label: "Жёлтый", hex: "#FFEB3B" },
    { value: "beige", label: "Бежевый", hex: "#F5F5DC" },
    { value: "other", label: "Другие цвета", hex: "#CCCCCC" },
  ],
} as const;

// Объединяем все цвета для совместимости с существующим кодом
export const BODY_COLORS = [
  ...CAR_COLORS.PRIMARY,
  ...CAR_COLORS.EXTENDED
] as const;

export type FuelType = typeof FUEL_TYPES[number]['value'];
export type BodyColor = typeof BODY_COLORS[number]['value'];
