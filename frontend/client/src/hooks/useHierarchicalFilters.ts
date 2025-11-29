import { useState, useEffect } from 'react';
import { RawFiltersData, getHierarchicalFilters, fetchCarFilters } from '../lib/api';
import { FilterOption } from '../types';
import { FUEL_TYPES, BODY_COLORS } from '../lib/constants';

export interface UseHierarchicalFiltersReturn {
  // Сырые иерархические данные
  filtersData: RawFiltersData | null;
  
  // Функции для получения срезов данных (синхронные)
  getModelsForBrand: (brand: string) => FilterOption[];
  getGenerationsForModel: (brand: string, model: string) => FilterOption[];
  getTypesForGeneration: (brand: string, model: string, generation: string) => FilterOption[];
  
  // Плоские списки для UI
  brandOptions: FilterOption[];
  fuelOptions: FilterOption[];
  colorOptions: FilterOption[];
  
  // Состояния загрузки
  isLoading: boolean;
  error: string | null;
}

/**
 * Хук для работы с иерархическими фильтрами
 * Загружает полную структуру фильтров один раз и кэширует в localStorage на 24 часа
 * Предоставляет синхронные функции для получения зависимых списков
 */
export const useHierarchicalFilters = (): UseHierarchicalFiltersReturn => {
  const [filtersData, setFiltersData] = useState<RawFiltersData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Функция для загрузки данных
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await getHierarchicalFilters();

      setFiltersData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки фильтров';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Загружаем данные при монтировании
  useEffect(() => {
    fetchData();
  }, []);

  // Синхронная функция для получения моделей для выбранного бренда
  const getModelsForBrand = (brand: string): FilterOption[] => {
    if (!filtersData || !brand || !filtersData[brand]) {
      return [];
    }

    return Object.keys(filtersData[brand]).map(model => ({
      value: model,
      label: model,
    }));
  };

  // Синхронная функция для получения поколений для выбранной модели
  const getGenerationsForModel = (brand: string, model: string): FilterOption[] => {
    if (!filtersData || !brand || !model || !filtersData[brand]?.[model]) {
      return [];
    }

    return Object.keys(filtersData[brand][model]).map(generation => ({
      value: generation,
      label: generation,
    }));
  };

  // Синхронная функция для получения типов для выбранного поколения
  const getTypesForGeneration = (brand: string, model: string, generation: string): FilterOption[] => {
    if (!filtersData || !brand || !model || !generation || !filtersData[brand]?.[model]?.[generation]) {
      return [];
    }

    return filtersData[brand][model][generation].map(type => ({
      value: type,
      label: type,
    }));
  };

  // Плоские списки для UI
  const brandOptions: FilterOption[] = filtersData
    ? Object.keys(filtersData).map(brand => ({
        value: brand,
        label: brand,
      }))
    : [];

  const fuelOptions: FilterOption[] = FUEL_TYPES.map(fuel => ({
    value: fuel.value,
    label: fuel.label,
  }));

  const colorOptions: FilterOption[] = BODY_COLORS.map(color => ({
    value: color.value,
    label: color.label,
  }));

  return {
    filtersData,
    getModelsForBrand,
    getGenerationsForModel,
    getTypesForGeneration,
    brandOptions,
    fuelOptions,
    colorOptions,
    isLoading,
    error,
  };
};
