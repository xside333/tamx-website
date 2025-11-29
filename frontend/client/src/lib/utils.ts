import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format price with currency
export function formatPrice(price: number): string {
  // Форматируем число с пробелами и добавляем символ рубля
  const formatted = new Intl.NumberFormat('ru-RU').format(price);
  return `${formatted} ₽`;
}

// Format mileage
export function formatMileage(mileage: number): string {
  return new Intl.NumberFormat('ru-RU').format(mileage) + ' км';
}

// Format year as date
export function formatYear(year: number, month?: number): string {
  if (month) {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit' });
  }
  return year.toString();
}

// Debounce function for search/filter inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Format phone number
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('7')) {
    return `+7 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
  }
  return phone;
}

// Convert search params to URL string
export function buildSearchParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, String(v)));
      } else {
        searchParams.set(key, String(value));
      }
    }
  });
  
  return searchParams.toString();
}

// Parse search params from URL
export function parseSearchParams(searchString: string): Record<string, any> {
  const params = new URLSearchParams(searchString);
  const result: Record<string, any> = {};
  
  for (const [key, value] of params.entries()) {
    if (result[key]) {
      // Handle multiple values for the same key
      if (Array.isArray(result[key])) {
        result[key].push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number (Russian format)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+7|7|8)?[\s-]?\(?(\d{3})\)?[\s-]?(\d{3})[\s-]?(\d{2})[\s-]?(\d{2})$/;
  return phoneRegex.test(phone);
}

// Get fuel type label in Russian (now fuel is already in Russian from API)
export function getFuelLabel(fuel: string): string {
  // Fuel is now returned directly in Russian from API or constants
  return fuel || 'Не указано';
}

// Get status badge variant
export function getStatusVariant(statusType: string): string {
  const variants: Record<string, string> = {
    // Дефисы (нормализованный формат)
    'rate-3-5': 'bg-status-rate35 text-primary',        // 🟢 Авто проходное (зеленый)
    'rate-5-plus': 'bg-status-rate5Plus text-primary',  // 🔴 Высокая ставка (красный)
    'rate-0-3': 'bg-status-rate03 text-primary',        // 🟡 Проходной через n мес. (желтый)
    // Подчеркивания (исходный формат API)
    'rate_3_5': 'bg-status-rate35 text-primary',        // 🟢 Авто проходное (зеленый)
    'rate_5_plus': 'bg-status-rate5Plus text-primary',  // 🔴 Высокая ставка (красный)
    'rate_0_3': 'bg-status-rate03 text-primary',        // 🟡 Проходной через n мес. (желтый)
    // Legacy support
    passable: 'bg-status-rate35 text-primary',
    'high-rate': 'bg-status-rate5Plus text-primary',
    'will-be-passable': 'bg-status-rate03 text-primary',
    warning: 'bg-status-rate03 text-primary',
  };

  return variants[statusType] || 'bg-muted text-primary';
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Local storage helpers with error handling
export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail if localStorage is not available
  }
}
