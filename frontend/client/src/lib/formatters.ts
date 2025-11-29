/**
 * Утилиты для форматирования чисел в полях ввода
 */

/**
 * Форматирует число с пробелами для тысяч
 * 1000000 → "1 000 000"
 */
export function formatNumberWithSpaces(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Удаляет все символы кроме цифр
 * "1 000 000 ₽" → "1000000"
 */
export function parseNumberFromString(value: string): number | undefined {
  const cleaned = value.replace(/\D/g, '');
  return cleaned ? parseInt(cleaned) : undefined;
}

/**
 * Форматирует цену для отображения в поле ввода
 * 1000000 → "1 000 000 ₽"
 */
export function formatPriceInput(value?: number): string {
  if (!value) return '';
  return `${formatNumberWithSpaces(value)} ₽`;
}

/**
 * Форматирует пробег для отображения в поле ввода  
 * 50000 → "50 000 км"
 */
export function formatMileageInput(value?: number): string {
  if (!value) return '';
  return `${formatNumberWithSpaces(value)} км`;
}

/**
 * Парсит цену из отформатированной строки
 * "1 000 000 ₽" → 1000000
 */
export function parsePriceFromInput(value: string): number | undefined {
  return parseNumberFromString(value);
}

/**
 * Парсит пробег из отформатированной строки
 * "50 000 км" → 50000
 */
export function parseMileageFromInput(value: string): number | undefined {
  return parseNumberFromString(value);
}

/**
 * Форматирует число при вводе пользователем
 * Добавляет пробелы и единицы измерения в реальном времени
 */
export function formatAsUserTypes(value: string, unit: '₽' | 'км'): string {
  // Если строка пустая, возвращаем пустую строку
  if (!value || value.trim() === '') return '';

  const number = parseNumberFromString(value);
  if (!number || number === 0) return '';

  const formatted = formatNumberWithSpaces(number);
  return `${formatted} ${unit}`;
}

/**
 * Обрабатывает ввод пользователя с учетом позиции курсора
 * Позволяет свободно редактировать числовую часть
 */
export function handleUserInput(
  newValue: string,
  oldValue: string,
  unit: '₽' | 'км'
): { displayValue: string; numericValue: number | undefined } {
  // Удаляем единицы измерения для работы с чистыми числами
  const cleanNew = newValue.replace(` ${unit}`, '').trim();
  const cleanOld = oldValue.replace(` ${unit}`, '').trim();

  // Если пользователь очистил поле
  if (!cleanNew) {
    return { displayValue: '', numericValue: undefined };
  }

  // Извлекаем только цифры
  const numericValue = parseNumberFromString(cleanNew);

  // Если нет цифр, возвращаем пустое значение
  if (!numericValue) {
    return { displayValue: '', numericValue: undefined };
  }

  // Форматируем для отображения
  const displayValue = `${formatNumberWithSpaces(numericValue)} ${unit}`;

  return { displayValue, numericValue };
}
