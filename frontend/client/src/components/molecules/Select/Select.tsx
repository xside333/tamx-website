import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SelectProps } from '../../../types';
import { cn } from '../../../lib/utils';
import { Icon } from '../../atoms';

const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Выберите опцию',
  multiple = false,
  disabled = false,
  error,
  className,
  searchable = false,
  triggerClassName,
  fullWidth = true,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const selectRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOptions = multiple
    ? Array.isArray(value) ? value : []
    : value ? [value] : [];

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) {
      return options;
    }
    return options.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery, searchable]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchQuery('');
      }
    }
  };

  const handleOptionClick = (optionValue: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter(v => v !== optionValue)
        : [...currentValues, optionValue];
      onChange?.(newValues);
    } else {
      onChange?.(optionValue);
      setIsOpen(false);
    }
  };

  const getDisplayText = () => {
    if (selectedOptions.length === 0) return placeholder;
    
    if (multiple) {
      if (selectedOptions.length === 1) {
        const option = options.find(o => o.value === selectedOptions[0]);
        return option?.label || selectedOptions[0];
      }
      return `Выбрано: ${selectedOptions.length}`;
    }
    
    const option = options.find(o => o.value === selectedOptions[0]);
    return option?.label || selectedOptions[0];
  };

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, searchable]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key to close dropdown
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectClasses = cn(
    'relative',
    fullWidth ? 'w-full' : 'w-auto inline-block',
    className
  );

  const triggerClasses = cn(
    'flex items-center justify-between cursor-pointer',
    fullWidth ? 'w-full' : 'w-auto',
    'h-[52px] px-4',
    'bg-surface-secondary rounded-lg',
    'border-none',
    'transition-fast',
    error && 'ring-2 ring-status-error',
    disabled && 'opacity-50 cursor-not-allowed',
    triggerClassName
  );

  const dropdownClasses = cn(
    'absolute top-full mt-1',
    fullWidth ? 'left-0 right-0 w-full' : 'left-0 lg:right-0 lg:left-auto w-max min-w-full',
    'bg-surface border border-muted rounded-lg shadow-lg',
    'max-h-60 overflow-auto z-dropdown',
    'transform transition-all duration-fast',
    isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
  );

  return (
    <div ref={selectRef} className={selectClasses} {...props}>
      <div className={triggerClasses} onClick={handleToggle}>
        <span className={cn(
          'text-sm',
          selectedOptions.length === 0 ? 'text-muted' : 'text-primary'
        )}>
          {getDisplayText()}
        </span>
        <Icon 
          name="chevronDown" 
          size="sm" 
          className={cn(
            'transition-transform duration-fast',
            isOpen && 'rotate-180'
          )}
        />
      </div>

      <div className={dropdownClasses}>
        {searchable && (
          <div className="p-3 border-b border-muted">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        <div className="max-h-48 overflow-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted">
              {searchQuery ? 'Нет совпадений' : 'Нет доступных опций'}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                className={cn(
                  'px-4 py-3 text-sm cursor-pointer transition-fast',
                  'hover:bg-surface-secondary',
                  'flex items-center justify-between',
                  selectedOptions.includes(option.value) && 'bg-accent/10 text-accent'
                )}
                onClick={() => handleOptionClick(option.value)}
              >
                <span>{option.label}</span>
                {option.count !== undefined && (
                  <span className="text-xs text-muted ml-2">({option.count})</span>
                )}
                {multiple && selectedOptions.includes(option.value) && (
                  <div className="w-4 h-4 bg-accent rounded-sm flex items-center justify-center">
                    <svg className="w-3 h-3 text-on-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {error && (
        <p className="mt-1 text-sm text-status-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Select;
