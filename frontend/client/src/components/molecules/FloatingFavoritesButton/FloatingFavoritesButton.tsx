import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../../lib/utils';
import { FavoritesPopover } from '../FavoritesPopover';
import { Car } from '../../../types';

interface FloatingFavoritesButtonProps {
  favoriteCars: Car[];
  onCarClick: (carId: string) => void;
  onRemoveFromFavorites: (carId: string) => void;
  className?: string;
}

const FloatingFavoritesButton: React.FC<FloatingFavoritesButtonProps> = ({
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

  if (favoriteCars.length === 0) return null;

  const buttonClasses = cn(
    'fixed w-14 h-14 bg-accent rounded-full',
    'flex items-center justify-center shadow-lg hover:bg-accent/90',
    'transition-all floating z-40 md:z-sticky cursor-pointer',
    'favorites-btn-mobile right-[10px] md:bottom-6 md:right-6',
    className
  );

  return (
    <div ref={buttonRef} className="relative">
      <button className={buttonClasses} onClick={handleToggle}>
        <svg className="w-6 h-6 text-on-accent" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <span className="absolute -top-2 -right-2 w-6 h-6 bg-surface text-accent text-xs font-bold rounded-full flex items-center justify-center">
          {favoriteCars.length}
        </span>
      </button>

      {/* Popover positioned above the button with fixed positioning */}
      <FavoritesPopover
        isOpen={isOpen}
        onClose={handleClose}
        favoriteCars={favoriteCars}
        onCarClick={onCarClick}
        onRemoveFromFavorites={onRemoveFromFavorites}
        className="fixed favorites-popover-mobile right-[10px] md:bottom-[92px] md:right-6 z-40 md:z-dropdown"
      />
    </div>
  );
};

export default FloatingFavoritesButton;
