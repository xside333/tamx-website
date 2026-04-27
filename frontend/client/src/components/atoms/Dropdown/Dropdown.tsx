import React, { useRef, useEffect } from 'react';
import { cn } from '../../../lib/utils';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  onToggle: (open: boolean) => void;
  align?: 'left' | 'right';
  className?: string;
  panelClassName?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  open,
  onToggle,
  align = 'left',
  className,
  panelClassName,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) {
        onToggle(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onToggle]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (open && e.key === 'Escape') onToggle(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onToggle]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div onClick={() => onToggle(!open)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute top-full z-[var(--z-dropdown)] mt-1',
            align === 'left' ? 'left-0' : 'right-0',
            panelClassName,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export { Dropdown };
export default Dropdown;
