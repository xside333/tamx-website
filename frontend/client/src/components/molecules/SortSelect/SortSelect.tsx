import React from 'react';
import { BaseComponentProps, SortOption, SortConfig } from '../../../types';
import { Select } from '../Select';
import { cn } from '../../../lib/utils';

interface SortSelectProps extends BaseComponentProps {
  value?: SortOption;
  onChange?: (value: SortOption) => void;
  disabled?: boolean;
}

const sortOptions: SortConfig[] = [
  { value: 'date_desc', label: 'Новые поступления' },
  { value: 'date_asc', label: 'Старые поступления' },
  { value: 'price_asc', label: 'Сначала дешёвые' },
  { value: 'price_desc', label: 'Сначала дорогие' },
  { value: 'mileage_asc', label: 'Сначала с меньшим пробегом' },
];

const SortSelect: React.FC<SortSelectProps> = ({
  value = 'date_desc',
  onChange,
  disabled = false,
  className,
  ...props
}) => {
  const handleChange = (selectedValue: string | string[]) => {
    if (typeof selectedValue === 'string') {
      onChange?.(selectedValue as SortOption);
    }
  };

  return (
    <Select
      options={sortOptions.map(option => ({
        value: option.value,
        label: option.label,
      }))}
      value={value}
      onChange={handleChange}
      placeholder="Сортировка"
      disabled={disabled}
      className={cn('sort-select-container', className)}
      triggerClassName={cn('sort-select-trigger')}
      fullWidth={false}
      {...props}
    />
  );
};

export default SortSelect;
