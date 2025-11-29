import React from 'react';
import { BaseComponentProps } from '../../../types';
import { cn } from '../../../lib/utils';
import { Input } from '../../atoms';

interface YearRangeProps extends BaseComponentProps {
  fromValue?: number;
  toValue?: number;
  onFromChange?: (value: number | undefined) => void;
  onToChange?: (value: number | undefined) => void;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  disabled?: boolean;
  error?: string;
  min?: number;
  max?: number;
}

const YearRange: React.FC<YearRangeProps> = ({
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  fromPlaceholder = "От",
  toPlaceholder = "До",
  disabled = false,
  error,
  min,
  max,
  className,
  ...props
}) => {
  const handleFromChange = (value: string) => {
    const numValue = value ? parseInt(value) : undefined;
    onFromChange?.(numValue);
  };

  const handleToChange = (value: string) => {
    const numValue = value ? parseInt(value) : undefined;
    onToChange?.(numValue);
  };

  const formatInputValue = (value?: number) => {
    return value ? value.toString() : '';
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
          type="number"
          placeholder={fromPlaceholder}
          value={formatInputValue(fromValue)}
          onChange={handleFromChange}
          disabled={disabled}
          min={min}
          max={max}
          className="rounded-r-none border-r-0"
        />
      </div>
      <div className={separatorClasses} />
      <div className={toClasses}>
        <Input
          type="number"
          placeholder={toPlaceholder}
          value={formatInputValue(toValue)}
          onChange={handleToChange}
          disabled={disabled}
          min={min}
          max={max}
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

export default YearRange;
