import React from 'react';
import { cn } from '../../../lib/utils';

interface SourceSelectorProps {
  value?: string; // '' | 'K' | 'C'
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  className?: string;
}

const SourceSelector: React.FC<SourceSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className,
}) => {
  const options = [
    { id: '', label: 'Все' },
    { id: 'K', label: 'Корея', icon: '/icon_Korea.svg' },
    { id: 'C', label: 'Китай', icon: '/icon_China.svg' },
  ];

  const handleClick = (id: string) => {
    if (disabled) return;
    onChange(id || undefined);
  };

  return (
    <div className={cn('source-selector', className)}>
      {options.map((opt) => {
        const isActive = (value || '') === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => handleClick(opt.id)}
            className={cn(
              'source-selector__item',
              isActive && 'source-selector__item--active',
            )}
          >
            {opt.icon && (
              <img
                src={opt.icon}
                alt={opt.label}
                className="source-selector__icon"
              />
            )}
            <span className="source-selector__label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export { SourceSelector };
