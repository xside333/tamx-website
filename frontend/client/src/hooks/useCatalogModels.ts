import { useQuery } from '@tanstack/react-query';
import { Filters } from '../types';
import { getCatalogModels, CatalogModelsApiResponse } from '../lib/api';
import { transformFiltersToApiParams } from '../lib/apiTransforms';

interface UseCatalogModelsParams {
  filters: Filters;
  page: number;
  pageSize?: number;
  /** Если false — загружаем только счётчик, но не полный список */
  loadItems?: boolean;
}

function buildModelApiParams(filters: Filters, page: number) {
  const apiParams = transformFiltersToApiParams(filters, page);
  const { generation, type, model, sortBy, ...modelParams } = apiParams as any;
  return modelParams;
}

/**
 * Хук для получения агрегированного списка моделей.
 *
 * Всегда делает лёгкий запрос счётчика (pageSize=1) для отображения
 * числа моделей в переключателе режимов.
 *
 * Полный список (items) загружается только когда loadItems=true.
 */
export const useCatalogModels = ({
  filters,
  page,
  pageSize = 12,
  loadItems = true,
}: UseCatalogModelsParams) => {
  // generation и type несовместимы с режимом моделей
  const hasBlockingFilters = !!(filters.generation || (filters.types && filters.types.length > 0));

  const baseParams = buildModelApiParams(filters, 1);

  // Лёгкий запрос только для получения счётчика totalModels/totalAds
  const counterQuery = useQuery<CatalogModelsApiResponse>({
    queryKey: ['catalogModelsCount', filters],
    queryFn: () => getCatalogModels({ ...baseParams, page: 1, pageSize: 1 }),
    enabled: !hasBlockingFilters,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Полный запрос списка — только при активном режиме моделей
  const itemsParams = buildModelApiParams(filters, page);
  const itemsQuery = useQuery<CatalogModelsApiResponse>({
    queryKey: ['catalogModels', filters, page, pageSize],
    queryFn: () => getCatalogModels({ ...itemsParams, page, pageSize }),
    enabled: loadItems && !hasBlockingFilters,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    // Данные полного списка (только в режиме models)
    data: itemsQuery.data,
    isLoading: itemsQuery.isLoading,
    error: itemsQuery.error,
    refetch: itemsQuery.refetch,

    // Счётчики доступны всегда
    totalModels: counterQuery.data?.totalModels ?? itemsQuery.data?.totalModels ?? 0,
    totalAds: counterQuery.data?.totalAds ?? itemsQuery.data?.totalAds ?? 0,
  };
};
