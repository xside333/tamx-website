import React from 'react';
import { BaseComponentProps } from '../../../types';
import { cn } from '../../../lib/utils';
import { Select } from '../Select';

interface YearMonthRangeProps extends BaseComponentProps {
  yearFromValue?: number;
  monthFromValue?: number;
  yearToValue?: number;
  monthToValue?: number;
  onYearFromChange?: (value: number | undefined) => void;
  onMonthFromChange?: (value: number | undefined) => void;
  onYearToChange?: (value: number | undefined) => void;
  onMonthToChange?: (value: number | undefined) => void;
  disabled?: boolean;
  error?: string;
}

// Константы
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 2000;

const MONTHS = [
  { value: '1', label: 'Январь' },
  { value: '2', label: 'Февраль' },
  { value: '3', label: 'Март' },
  { value: '4', label: 'Апрель' },
  { value: '5', label: 'Май' },
  { value: '6', label: 'Июнь' },
  { value: '7', label: 'Июль' },
  { value: '8', label: 'Август' },
  { value: '9', label: 'Сентябрь' },
  { value: '10', label: 'Октябрь' },
  { value: '11', label: 'Ноябрь' },
  { value: '12', label: 'Декабрь' },
];

// Генерируем годы от MIN_YEAR до текущего года
const YEARS = Array.from(
  { length: CURRENT_YEAR - MIN_YEAR + 1 },
  (_, i) => {
    const year = MIN_YEAR + i;
    return { value: year.toString(), label: year.toString() };
  }
).reverse(); // От нового к старому

const YearMonthRange: React.FC<YearMonthRangeProps> = ({
  yearFromValue,
  monthFromValue,
  yearToValue,
  monthToValue,
  onYearFromChange,
  onMonthFromChange,
  onYearToChange,
  onMonthToChange,
  disabled = false,
  error,
  className,
  ...props
}) => {
  const handleYearFromChange = (value: string | string[]) => {
    const yearValue = typeof value === 'string' && value ? parseInt(value) : undefined;
    onYearFromChange?.(yearValue);
  };

  const handleMonthFromChange = (value: string | string[]) => {
    const monthValue = typeof value === 'string' && value ? parseInt(value) : undefined;
    onMonthFromChange?.(monthValue);
  };

  const handleYearToChange = (value: string | string[]) => {
    const yearValue = typeof value === 'string' && value ? parseInt(value) : undefined;
    onYearToChange?.(yearValue);
  };

  const handleMonthToChange = (value: string | string[]) => {
    const monthValue = typeof value === 'string' && value ? parseInt(value) : undefined;
    onMonthToChange?.(monthValue);
  };

  // Фильтруем доступные годы "до" на основе выбранного года "от"
  const availableToYears = yearFromValue 
    ? YEARS.filter(year => parseInt(year.value) >= yearFromValue)
    : YEARS;

  // Фильтруем доступные месяцы "до" если выбран тот же год "от" и "до"
  const availableToMonths = (yearFromValue && yearToValue && yearFromValue === yearToValue && monthFromValue)
    ? MONTHS.filter(month => parseInt(month.value) >= monthFromValue)
    : MONTHS;

  const containerClasses = cn(
    'space-y-3',
    className
  );

  return (
    <div className={containerClasses} {...props}>
      {/* Год и месяц ОТ */}
      <div className="space-y-2">
        <label className="text-secondary text-xs font-medium">От</label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select
              options={YEARS}
              value={yearFromValue?.toString()}
              onChange={handleYearFromChange}
              placeholder="Год"
              disabled={disabled}
            />
          </div>
          <div className="flex-1">
            <Select
              options={MONTHS}
              value={monthFromValue?.toString()}
              onChange={handleMonthFromChange}
              placeholder="Месяц"
              disabled={disabled || !yearFromValue}
            />
          </div>
        </div>
      </div>

      {/* Год и месяц ДО */}
      <div className="space-y-2">
        <label className="text-secondary text-xs font-medium">До</label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Select
              options={availableToYears}
              value={yearToValue?.toString()}
              onChange={handleYearToChange}
              placeholder="Год"
              disabled={disabled}
            />
          </div>
          <div className="flex-1">
            <Select
              options={availableToMonths}
              value={monthToValue?.toString()}
              onChange={handleMonthToChange}
              placeholder="Месяц"
              disabled={disabled || !yearToValue}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-1 text-sm text-status-error w-full" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default YearMonthRange;
