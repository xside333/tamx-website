import React from 'react';
import { Filters, FiltersPatch } from '../../../types';
import { cn } from '../../../lib/utils';
import { Button, Skeleton } from '../../atoms';
import { Select, PriceRange, YearMonthRange, MileageRange } from '../../molecules';
import { useStickyFilters } from '../../../hooks/useStickyFilters';
import { useHierarchicalFilters } from '../../../hooks/useHierarchicalFilters';
import { resetDependentFilters } from '../../../lib/apiTransforms';

interface FiltersAsideProps {
  filters: Filters;
  appliedFilters: Filters;
  onFiltersChange: (filters: FiltersPatch) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onResetGroup: (group: string) => void;
  totalCount: number;
  loading?: boolean;
  className?: string;
}

const FilterGroup: React.FC<{
  title: string;
  onReset?: () => void;
  children: React.ReactNode;
}> = ({ title, onReset, children }) => (
  <div className="bg-surface rounded-xl p-5 space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-primary font-bold text-sm">{title}</h3>
      {onReset && (
        <button 
          onClick={onReset}
          className="text-secondary text-sm hover:text-primary transition-fast"
        >
          Сбросить
        </button>
      )}
    </div>
    {children}
  </div>
);

const FiltersAside: React.FC<FiltersAsideProps> = ({
  filters,
  appliedFilters,
  onFiltersChange,
  onApplyFilters,
  onResetFilters,
  onResetGroup,
  totalCount,
  loading = false,
  className,
  ...props
}) => {
  // Получаем иерархические фильтры с кэшированием
  const {
    filtersData,
    getModelsForBrand,
    getGenerationsForModel,
    getTypesForGeneration,
    brandOptions,
    fuelOptions,
    colorOptions,
    isLoading: filtersLoading,
    error: filtersError,
  } = useHierarchicalFilters();

  // Получаем опции для зависимых фильтров синхронно из загруженных данных
  const modelOptions = filters.brand ? getModelsForBrand(filters.brand) : [];
  const generationOptions = filters.brand && filters.model
    ? getGenerationsForModel(filters.brand, filters.model)
    : [];
  const typeOptions = filters.brand && filters.model && filters.generation
    ? getTypesForGeneration(filters.brand, filters.model, filters.generation)
    : [];

  // Дефолтные диапазоны (можно улучшить, получая из API)
  const priceRange = { min: 100000, max: 50000000 };
  const yearRange = { min: 2000, max: new Date().getFullYear() };
  const mileageRange = { min: 0, max: 500000 };

  const handleBrandChange = (value: string | string[]) => {
    const brand = typeof value === 'string' ? value : undefined;
    const newFilters = resetDependentFilters({ ...filters, brand }, 'brand');
    onFiltersChange(newFilters);
  };

  const handleModelChange = (value: string | string[]) => {
    const model = typeof value === 'string' ? value : undefined;
    const newFilters = resetDependentFilters({ ...filters, model }, 'model');
    onFiltersChange(newFilters);
  };


  const handleGenerationChange = (value: string | string[]) => {
    const generation = typeof value === 'string' ? value : undefined;
    const newFilters = resetDependentFilters({ ...filters, generation }, 'generation');
    onFiltersChange(newFilters);
  };

  const handleTypesChange = (value: string | string[]) => {
    const types = Array.isArray(value) ? value : [value].filter(Boolean);
    // Types is the lowest level in hierarchy, no cascading needed
    onFiltersChange({ types });
  };

  const handleFuelsChange = (value: string | string[]) => {
    const fuels = Array.isArray(value) ? value : [value].filter(Boolean);
    onFiltersChange({ fuels });
  };

  const handleColorsChange = (value: string | string[]) => {
    const colors = Array.isArray(value) ? value : [value].filter(Boolean);
    onFiltersChange({ colors });
  };

  const handlePriceFromChange = (value?: number) => {
    onFiltersChange({ priceFrom: value });
  };

  const handlePriceToChange = (value?: number) => {
    onFiltersChange({ priceTo: value });
  };

  const handleYearFromChange = (value?: number) => {
    const newFilters: FiltersPatch = { yearFrom: value };
    // При сбросе года сбрасываем месяц "от"
    if (!value) {
      newFilters.monthFrom = undefined;
    }
    onFiltersChange(newFilters);
  };

  const handleYearToChange = (value?: number) => {
    const newFilters: FiltersPatch = { yearTo: value };
    // При сбросе года сбрасываем месяц "до"
    if (!value) {
      newFilters.monthTo = undefined;
    }
    onFiltersChange(newFilters);
  };

  const handleMonthFromChange = (value?: number) => {
    onFiltersChange({ monthFrom: value });
  };

  const handleMonthToChange = (value?: number) => {
    onFiltersChange({ monthTo: value });
  };

  const handleMileageFromChange = (value?: number) => {
    onFiltersChange({ mileageFrom: value });
  };

  const handleMileageToChange = (value?: number) => {
    onFiltersChange({ mileageTo: value });
  };

  const handleNoDamageChange = (checked: boolean) => {
    onFiltersChange({ noDamage: checked || undefined });
  };

  const handlePassableChange = (checked: boolean) => {
    const current = new Set(filters.categories || []);
    if (checked) {
      current.add('rate_3_5');
    } else {
      current.delete('rate_3_5');
    }
    onFiltersChange({ categories: Array.from(current) });
  };

  const handleNonPassableChange = (checked: boolean) => {
    const current = new Set(filters.categories || []);
    const nonPassableValues = ['rate_0_3', 'rate_5_plus'];
    if (checked) {
      nonPassableValues.forEach(v => current.add(v));
    } else {
      nonPassableValues.forEach(v => current.delete(v));
    }
    onFiltersChange({ categories: Array.from(current) });
  };

  const { actionBarRef, containerRef, getActionBarClasses, getContainerClasses } = useStickyFilters();

  const isFiltersLoading = loading || filtersLoading;

  // Показываем скелетон если фильтры еще загружаются
  if (filtersLoading) {
    return (
      <aside
        ref={containerRef}
        className={cn(getContainerClasses(), className)}
        {...props}
      >
        <div className="space-y-6">
          {/* Skeleton для фильтров */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-surface rounded-xl p-5 space-y-4">
              <Skeleton className="h-4 w-24" />
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  // Показываем ошибку если не удалось загрузить фильтры
  if (filtersError) {
    return (
      <aside
        ref={containerRef}
        className={cn(getContainerClasses(), className)}
        {...props}
      >
        <div className="bg-surface rounded-xl p-5 text-center">
          <p className="text-red-500 mb-4">Ошибка загрузки фильтров:</p>
          <p className="text-sm text-secondary mb-4">{filtersError}</p>
          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Перезагрузить страницу
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      ref={containerRef}
      className={cn(getContainerClasses(), className)}
      {...props}
    >
      {/* Car Filter Group */}
      <FilterGroup
        title="Автомобиль"
        onReset={() => onResetGroup('car')}
      >
        <div className="space-y-3">
          <Select
            options={brandOptions}
            value={filters.brand}
            onChange={handleBrandChange}
            placeholder="Марка"
            disabled={isFiltersLoading}
            searchable={true}
          />

          <Select
            options={modelOptions}
            value={filters.model}
            onChange={handleModelChange}
            placeholder="Модель"
            searchable={true}
            disabled={isFiltersLoading || !filters.brand}
          />

          <Select
            options={generationOptions}
            value={filters.generation}
            onChange={handleGenerationChange}
            placeholder="Поколение"
            disabled={isFiltersLoading || !filters.model}
          />

          <Select
            options={typeOptions}
            value={filters.types}
            onChange={handleTypesChange}
            placeholder="Комплектация"
            multiple
            disabled={isFiltersLoading || !filters.generation}
          />
        </div>
      </FilterGroup>

      {/* Price Filter Group */}
      <FilterGroup 
        title="Цена" 
        onReset={() => onResetGroup('price')}
      >
        <PriceRange
          fromValue={filters.priceFrom}
          toValue={filters.priceTo}
          onFromChange={handlePriceFromChange}
          onToChange={handlePriceToChange}
          fromPlaceholder="От"
          toPlaceholder="До"
          disabled={isFiltersLoading}
        />
      </FilterGroup>

      {/* Year Filter Group */}
      <FilterGroup
        title="Год выпуска"
        onReset={() => onResetGroup('year')}
      >
        <YearMonthRange
          yearFromValue={filters.yearFrom}
          monthFromValue={filters.monthFrom}
          yearToValue={filters.yearTo}
          monthToValue={filters.monthTo}
          onYearFromChange={handleYearFromChange}
          onMonthFromChange={handleMonthFromChange}
          onYearToChange={handleYearToChange}
          onMonthToChange={handleMonthToChange}
          disabled={isFiltersLoading}
        />
      </FilterGroup>

      {/* Mileage Filter Group */}
      <FilterGroup
        title="Пробег"
        onReset={() => onResetGroup('mileage')}
      >
        <MileageRange
          fromValue={filters.mileageFrom}
          toValue={filters.mileageTo}
          onFromChange={handleMileageFromChange}
          onToChange={handleMileageToChange}
          fromPlaceholder="От"
          toPlaceholder="До"
          min={0}
          max={mileageRange?.max}
          disabled={isFiltersLoading}
        />
      </FilterGroup>

      {/* Engine Filter Group */}
      <FilterGroup 
        title="Двигатель" 
        onReset={() => onResetGroup('engine')}
      >
        <Select
          options={fuelOptions}
          value={filters.fuels}
          onChange={handleFuelsChange}
          placeholder="Топливо"
          multiple
          disabled={isFiltersLoading}
        />
      </FilterGroup>

      {/* Color Filter Group */}
      <FilterGroup 
        title="Цвет кузова" 
        onReset={() => onResetGroup('color')}
      >
        <Select
          options={colorOptions}
          value={filters.colors}
          onChange={handleColorsChange}
          placeholder="Цвет кузова"
          multiple
          disabled={isFiltersLoading}
        />
      </FilterGroup>

      {/* Condition Filter Group */}
      <FilterGroup title="Дополнительный параметры">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="no-damage"
              checked={filters.noDamage || false}
              onChange={(e) => handleNoDamageChange(e.target.checked)}
              className="w-5 h-5 text-accent border border-border rounded focus:outline-none accent-accent cursor-pointer"
              disabled={isFiltersLoading}
            />
            <label htmlFor="no-damage" className="text-primary text-sm cursor-pointer">
              Без повреждений
            </label>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="passable"
              checked={(filters.categories || []).includes('rate_3_5')}
              onChange={(e) => handlePassableChange(e.target.checked)}
              className="w-5 h-5 text-accent border border-border rounded focus:outline-none accent-accent cursor-pointer"
              disabled={isFiltersLoading}
            />
            <label htmlFor="passable" className="text-primary text-sm cursor-pointer">
              Проходные авто
            </label>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="non-passable"
              checked={(filters.categories || []).some((c) => c === 'rate_0_3' || c === 'rate_5_plus')}
              onChange={(e) => handleNonPassableChange(e.target.checked)}
              className="w-5 h-5 text-accent border border-border rounded focus:outline-none accent-accent cursor-pointer"
              disabled={isFiltersLoading}
            />
            <label htmlFor="non-passable" className="text-primary text-sm cursor-pointer">
              Непроходные авто
            </label>
          </div>
        </div>
      </FilterGroup>

      {/* Action Bar */}
      <div
        ref={actionBarRef}
        className={getActionBarClasses()}
      >
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            onClick={onResetFilters}
            disabled={isFiltersLoading}
            className="flex-1 h-[52px]"
          >
            Сбросить все
          </Button>
          <Button
            variant="primary"
            onClick={onApplyFilters}
            disabled={isFiltersLoading}
            loading={isFiltersLoading}
            className="flex-1 h-[52px]"
          >
            Показать
          </Button>
        </div>

      </div>
    </aside>
  );
};

export default FiltersAside;
