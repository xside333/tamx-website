import React from 'react';
import { BaseComponentProps } from '../../../types';
import { cn, getStatusVariant } from '../../../lib/utils';

interface BadgeProps extends BaseComponentProps {
  variant?: 'passable' | 'high-rate' | 'will-be-passable' | 'warning' | 'rate-3-5' | 'rate-5-plus' | 'rate-0-3' | 'custom';
  customColor?: string;
  size?: 'sm' | 'md';
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'custom',
  customColor,
  size = 'md',
  className,
  ...props
}) => {
  const baseClasses = [
    'badge',
    'inline-flex',
    'items-center',
    'rounded-lg',
    'font-normal',
    'w-fit',
  ];

  const sizeClasses = {
    sm: ['px-2', 'py-1', 'text-xs'],
    md: ['px-3', 'py-1', 'text-sm'],
  };

  const variantClasses = variant !== 'custom' 
    ? getStatusVariant(variant).split(' ')
    : customColor 
      ? [customColor]
      : ['bg-muted', 'text-text-primary'];

  const classes = cn(
    baseClasses,
    sizeClasses[size],
    variantClasses,
    className
  );

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
};

export default Badge;
