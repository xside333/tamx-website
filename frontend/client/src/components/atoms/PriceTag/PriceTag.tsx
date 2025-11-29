import React from 'react';
import { BaseComponentProps } from '../../../types';
import { cn, formatPrice } from '../../../lib/utils';

interface PriceTagProps extends BaseComponentProps {
  price: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'accent' | 'minimal';
  showCurrency?: boolean;
}

const PriceTag: React.FC<PriceTagProps> = ({
  price,
  size = 'md',
  variant = 'default',
  showCurrency = true,
  className,
  ...props
}) => {
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-bold',
    'transition-fast',
  ];

  const sizeClasses = {
    sm: ['text-sm', 'px-2', 'py-1'],
    md: ['text-lg', 'px-3', 'py-2'],
    lg: ['text-xl', 'px-4', 'py-2'],
    xl: ['text-2xl', 'px-5', 'py-3'],
  };

  const variantClasses = {
    default: [
      'bg-surface',
      'text-primary',
      'border',
      'border-muted',
      'rounded-lg',
    ],
    accent: [
      'bg-accent',
      'text-on-accent',
      'rounded-lg',
    ],
    minimal: [
      'bg-transparent',
      'text-primary',
    ],
  };

  const classes = cn(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    className
  );

  const formattedPrice = showCurrency ? formatPrice(price) : price.toLocaleString('ru-RU');

  return (
    <div className={classes} {...props}>
      {formattedPrice}
    </div>
  );
};

export { PriceTag };
