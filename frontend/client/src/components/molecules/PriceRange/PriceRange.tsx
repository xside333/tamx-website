import React from 'react';
import { BaseComponentProps } from '../../../types';
import { cn } from '../../../lib/utils';
import { formatPriceInput, handleUserInput } from '../../../lib/formatters';
import { Input } from '../../atoms';

interface PriceRangeProps extends BaseComponentProps {
  fromValue?: number;
  toValue?: number;
  onFromChange?: (value: number | undefined) => void;
  onToChange?: (value: number | undefined) => void;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  disabled?: boolean;
  error?: string;
}

const PriceRange: React.FC<PriceRangeProps> = ({
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  fromPlaceholder = "От",
  toPlaceholder = "До",
  disabled = false,
  error,
  className,
  ...props
}) => {
  const formatInputValue = (value?: number) => {
    return formatPriceInput(value);
  };

  // Обработчики с улучшенным форматированием
  const handleFromInputChange = (newValue: string) => {
    const currentValue = formatInputValue(fromValue);
    const { numericValue } = handleUserInput(newValue, currentValue, '₽');
    onFromChange?.(numericValue);
  };

  const handleToInputChange = (newValue: string) => {
    const currentValue = formatInputValue(toValue);
    const { numericValue } = handleUserInput(newValue, currentValue, '₽');
    onToChange?.(numericValue);
  };

  const containerClasses = cn(
    'flex w-full relative',
    className
  );

  const fromClasses = cn(
    'flex-1',
    'focus-within:z-10'
  );

  const toClasses = cn(
    'flex-1',
    'focus-within:z-10'
  );

  const separatorClasses = cn(
    'absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2',
    'w-px h-[52px] bg-divider z-0'
  );

  return (
    <div className={containerClasses} {...props}>
      <div className={fromClasses}>
        <Input
          type="text"
          placeholder={fromPlaceholder}
          value={formatInputValue(fromValue)}
          onChange={handleFromInputChange}
          disabled={disabled}
          className="rounded-r-none border-r-0"
        />
      </div>
      <div className={separatorClasses} />
      <div className={toClasses}>
        <Input
          type="text"
          placeholder={toPlaceholder}
          value={formatInputValue(toValue)}
          onChange={handleToInputChange}
          disabled={disabled}
          className="rounded-l-none border-l-0"
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-status-error w-full" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default PriceRange;
