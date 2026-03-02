/**
 * Маппинги значений колонок для che168 → unified формат
 * Цвета, топливо, трансмиссия, тип кузова
 * Данные из реальной БД (проверено 2026-02-15)
 */

// --- Цвета (русский lowercase → английский) ---
export const che168ColorToEnglish = {
  'белый': 'white',
  'черный': 'black',
  'серебристо-серый': 'silver',
  'синий': 'blue',
  'красный': 'red',
  'шампань': 'beige',
  'зеленый': 'green',
  'желтый': 'yellow',
  'другой': 'other',
  'темно-серый': 'gray',
  'коричневый': 'brown',
  'фиолетовый': 'purple',
  'оранжевый': 'orange',
};

// --- Топливо (русский → английский фильтр) ---
export const che168FuelToEnglish = {
  'Бензиновый': 'gasoline',
  'Дизельный': 'diesel',
  'Электрический (BEV)': 'electric',
  'Бензиновый + 48V mild hybrid': 'mild_hybrid',
  'Подключаемый гибрид (PHEV)': 'phev',
  'Гибридный (HEV)': 'hybrid',
  'Расширитель диапазона (REEV)': 'reev',
  'Бензиновый с электроприводом': 'hybrid',
  'Бензиновый + 90V mild hybrid': 'mild_hybrid',
  'Бензиновый + CNG': 'cng',
  'Дизельный + 48V mild hybrid': 'mild_hybrid',
  'Газомоторное топливо (CNG)': 'cng',
};

// --- Трансмиссия (русский lowercase → unified) ---
export const che168TransmissionToUnified = {
  'автоматическая': 'automatic',
  'механическая': 'manual',
};

// --- Трансмиссия encar (корейский → unified) ---
export const encarTransmissionToUnified = {
  '오토': 'automatic',
  '수동': 'manual',
  'CVT': 'cvt',
  '세미오토': 'semi-auto',
  '기타': 'other',
};

// --- Привод che168 (русский → unified) ---
export const che168DriveTypeToUnified = {
  'передний привод': 'fwd',
  'задний привод': 'rwd',
  'полный привод': 'awd',
  'полный привод (2 мотора)': 'awd',
  'полный привод (3 мотора)': 'awd',
  'полный привод (4 мотора)': 'awd',
  'задний привод (2 мотора)': 'rwd',
};

// --- Тип кузова che168 (русский lowercase → unified) ---
export const che168BodyTypeToUnified = {
  'кроссовер/внедорожник': 'suv',
  'седан': 'sedan',
  'седан/хэтчбек': 'hatchback',
  'минивэн': 'minivan',
  'хэтчбек': 'hatchback',
  'купе/родстер': 'coupe',
  'пикап': 'pickup',
  'микроавтобус': 'van',
  'фургон': 'van',
  'легкий грузовик': 'truck',
};
