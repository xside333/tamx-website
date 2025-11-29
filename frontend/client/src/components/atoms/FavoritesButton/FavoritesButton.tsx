import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../../lib/utils';
import { Icon } from '../Icon';
import { FavoritesPopover } from '../../molecules';

interface FavoritesButtonProps {
  favoriteCars: any[];
  onCarClick: (carId: string) => void;
  onRemoveFromFavorites: (carId: string) => void;
  className?: string;
}

const FavoritesButton: React.FC<FavoritesButtonProps> = ({
  favoriteCars,
  onCarClick,
  onRemoveFromFavorites,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const buttonClasses = cn(
    'relative flex items-center space-x-2 px-4 py-2 rounded-lg',
    'bg-surface hover:bg-surface-secondary transition-fast',
    'border border-muted cursor-pointer',
    className
  );

  return (
    <div ref={buttonRef} className="relative">
      <div className={buttonClasses} onClick={handleToggle}>
        <Icon name="heart" size="sm" className="text-primary" />
        <span className="text-primary text-sm font-medium hidden lg:block">
          Избранное
        </span>
        {favoriteCars.length > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-on-accent text-xs rounded-full flex items-center justify-center">
            {favoriteCars.length}
          </div>
        )}
      </div>

      <FavoritesPopover
        isOpen={isOpen}
        onClose={handleClose}
        favoriteCars={favoriteCars}
        onCarClick={onCarClick}
        onRemoveFromFavorites={onRemoveFromFavorites}
      />
    </div>
  );
};

export default FavoritesButton;
