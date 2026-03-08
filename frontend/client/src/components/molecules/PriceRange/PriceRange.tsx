import React, { useState } from 'react';
import { BaseComponentProps } from '../../../types';
import { cn } from '../../../lib/utils';
import { formatNumberWithSpaces, parseNumberFromString } from '../../../lib/formatters';
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
  const [fromFocused, setFromFocused] = useState(false);
  const [toFocused, setToFocused] = useState(false);

  const formatBlurred = (value?: number) =>
    value ? `${formatNumberWithSpaces(value)} ₽` : '';

  const formatFocused = (value?: number) =>
    value ? formatNumberWithSpaces(value) : '';

  const handleChange = (
    newValue: string,
    onChange?: (v: number | undefined) => void
  ) => {
    const numeric = parseNumberFromString(newValue);
    onChange?.(numeric);
  };

  const containerClasses = cn('flex w-full relative', className);
  const separatorClasses = cn(
    'absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2',
    'w-px h-[52px] bg-divider z-0'
  );

  return (
    <div className={containerClasses} {...props}>
      <div className="flex-1 focus-within:z-10">
        <Input
          type="text"
          inputMode="numeric"
          placeholder={fromPlaceholder}
          value={fromFocused ? formatFocused(fromValue) : formatBlurred(fromValue)}
          onChange={(v) => handleChange(v, onFromChange)}
          onFocus={() => setFromFocused(true)}
          onBlur={() => setFromFocused(false)}
          disabled={disabled}
          className="rounded-r-none border-r-0"
        />
      </div>
      <div className={separatorClasses} />
      <div className="flex-1 focus-within:z-10">
        <Input
          type="text"
          inputMode="numeric"
          placeholder={toPlaceholder}
          value={toFocused ? formatFocused(toValue) : formatBlurred(toValue)}
          onChange={(v) => handleChange(v, onToChange)}
          onFocus={() => setToFocused(true)}
          onBlur={() => setToFocused(false)}
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
