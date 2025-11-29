import React from 'react';
import { ButtonProps } from '../../../types';
import { cn } from '../../../lib/utils';

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  className,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  ...props
}, ref) => {
  const baseClasses = [
    'btn',
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'transition-fast',
    'focus:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-accent',
    'focus-visible:ring-offset-2',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
  ];

  const variantClasses = {
    primary: [
      'bg-accent',
      'text-on-accent',
      'hover:bg-accent/90',
      'active:bg-accent/95',
    ],
    secondary: [
      'bg-surface-secondary',
      'text-primary',
      'border',
      'border-muted',
      'hover:bg-muted/50',
      'active:bg-muted/70',
    ],
    outline: [
      'bg-transparent',
      'text-accent',
      'border',
      'border-accent',
      'hover:bg-accent',
      'hover:text-onAccent',
      'active:bg-accent/95',
    ],
    ghost: [
      'bg-transparent',
      'text-secondary',
      'hover:bg-surface-secondary',
      'hover:text-primary',
      'active:bg-muted/50',
    ],
  } as const;

  const sizeClasses = {
    sm: ['px-3', 'py-2', 'text-sm', 'rounded-md'],
    md: ['px-4', 'py-3', 'text-sm', 'rounded-lg'],
    lg: ['px-6', 'py-4', 'text-base', 'rounded-xl'],
  } as const;

  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    loading && 'cursor-wait',
    className
  );

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
