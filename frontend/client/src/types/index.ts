import { FuelType, BodyColor } from '../lib/constants';

// Car Types
export interface Car {
  id: string;
  name: string;
  brand: string;
  model: string;
  generation?: string;
  trim?: string;
  price: number;
  year: number;
  month?: number;
  mileage: number;
  fuel: string;
  engine: string;
  displacement?: number; // см³
  location: string;
  monthlyPayment?: number;
  photos: string[];
  totalPhotos?: number;
  status?: CarStatus;
  accidentFree?: boolean;
  color?: string;
  createdAt?: string;
  firstadvertiseddatetime?: string;
  
  // Поля повреждений
  myaccidentcnt?: number;
  myaccidentcost?: number;
  unavailable?: boolean;
}

export interface CarStatus {
  type: StatusType;
  label: string;
  description?: string;
  monthsUntilPassable?: number;
}

export type StatusType = 'rate-3-5' | 'rate-5-plus' | 'rate-0-3';

// Filter Types
export interface Filters {
  // Иерархия
  brand?: string;
  model?: string; // CSV сорока для API
  generation?: string; // Одиночное значение для поколения
  type?: string; // CSV строка для API

  // Массивы для UI (конвертируются в CSV для API)
  models: string[];
  types: string[];

  // Диапазоны
  priceFrom?: number;
  priceTo?: number;
  yearFrom?: number;
  yearTo?: number;
  monthFrom?: number;
  monthTo?: number;
  mileageFrom?: number;
  mileageTo?: number;

  // Мультиселекты
  fuels: string[]; // Из constants.ts
  colors: string[]; // Из constants.ts
  fuelType?: string; // CSV строка для API
  bodyColor?: string; // CSV строка для API

  // Состояние
  noDamage?: boolean; // accidentFree в UI

  // Категории растаможки (значения API: rate_3_5, rate_0_3, rate_5_plus)
  categories?: string[];
}

// Патч-тип для частичного обновления фильтров
export type FiltersPatch = Partial<Filters>;

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
}

// Sort Types - обновлены под API
export type SortOption =
  | 'date_desc'
  | 'date_asc'
  | 'price_desc'
  | 'price_asc'
  | 'mileage_asc';

export interface SortConfig {
  value: SortOption;
  label: string;
}

// Pagination Types
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// API Response Types
export interface CarsResponse {
  cars: Car[];
  pagination: PaginationInfo;
  appliedFilters: Filters;
  totalCount: number;
}

// Обновленный тип под новое API
export interface FilterOptionsResponse {
  brands?: FilterOption[];
  models?: FilterOption[];
  generations?: FilterOption[];
  types?: FilterOption[];
  yearRange?: {
    min: number;
    max: number;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  mileageRange?: {
    min: number;
    max: number;
  };
}

// UI State Types
export interface UIState {
  isFiltersOpen: boolean;
  isLoading: boolean;
  error?: string;
  selectedCarIds: string[];
}

// Search/URL Params Types
export interface SearchParams {
  brand?: string;
  models?: string[];
  generations?: string[];
  types?: string[];
  price_from?: number;
  price_to?: number;
  year_from?: number;
  year_to?: number;
  month_from?: number;
  month_to?: number;
  mileage_from?: number;
  mileage_to?: number;
  fuels?: string[];
  colors?: string[];
  no_damage?: boolean;
  sort?: SortOption;
  page?: number;
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'number' | 'email' | 'tel';
  placeholder?: string;
  value?: string | number;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  id?: string;
  name?: string;
}

export interface SelectProps extends BaseComponentProps {
  options: FilterOption[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  disabled?: boolean;
  error?: string;
  searchable?: boolean;
  triggerClassName?: string; // additional classes applied only to the clickable trigger (not the container)
  fullWidth?: boolean; // controls whether the select takes full width of its container
}

// Favorites Types
export interface FavoritesState {
  carIds: string[];
  addToFavorites: (carId: string) => void;
  removeFromFavorites: (carId: string) => void;
  toggleFavorite: (carId: string) => void;
  isFavorite: (carId: string) => boolean;
  clearFavorites: () => void;
}

// Navigation Types
export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

// Contact Types
export interface ContactInfo {
  phone: string;
  email?: string;
  address?: string;
  city: string;
  socialLinks: {
    youtube?: string;
    whatsapp?: string;
    telegram?: string;
  };
}

// Error Types
export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

// Form Types
export interface OrderFormData {
  name: string;
  phone: string;
  email?: string;
  comment?: string;
  preferredContactTime?: string;
  appliedFilters?: Filters;
}

// API Types
export interface ApiCar {
  // Основные поля
  car_id?: string;
  id?: string;
  manufacturerenglishname?: string;
  modelgroupenglishname?: string;
  gradeenglishname?: string;
  price?: number;

  // Техданные
  fuel_type?: string;
  fuelname?: string;
  displacement?: number; // см³

  // Дата/цвет/пробег
  year?: number;
  month?: number;
  yearmonth?: string;
  color?: string;
  colorname?: string;
  mileage?: number;

  // Повреждения
  myaccidentcnt?: number;
  myaccidentcost?: number;

  // Фото
  photo_paths?: Array<{
    code: '001' | '003' | '004' | '007';
    path: string;
  }>;
  photo_outer?: string; // альтернативное фото

  // Бейджи (опционально)
  current?: {
    usdt?: {
      total?: number;
      customs?: {
        category?: 'rate_5_plus' | 'rate_0_3' | 'rate_3_5';
      };
    };
  };
  simulated?: {
    usdt?: {
      total?: number;
    };
    monthsToPass?: number;
  };
}

// Utility Types
export { FuelType, BodyColor };
