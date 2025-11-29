import React from 'react';
import { InputProps } from '../../../types';
import { cn } from '../../../lib/utils';

const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  error,
  className,
  id,
  name,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const inputClasses = cn(
    'input',
    'w-full',
    'h-[52px]',
    'px-4',
    'bg-surface-secondary',
    'border-none',
    'rounded-lg',
    'text-sm',
    'text-primary',
    'placeholder:text-muted',
    'transition-fast',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-accent',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    error && 'ring-2 ring-status-error',
    className
  );

  return (
    <div className="w-full">
      <input
        type={type}
        id={id}
        name={name}
        className={inputClasses}
        placeholder={placeholder}
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-status-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
