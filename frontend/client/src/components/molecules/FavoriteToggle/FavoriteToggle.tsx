import React from 'react';
import { Car } from '../../../types';
import { cn } from '../../../lib/utils';
import { Icon } from '../../atoms';
import { useFavorites } from '../../../hooks';

interface FavoriteToggleProps {
  car: Car;
  isFavorite?: boolean;
  onToggle?: (car: Car) => void;
  className?: string;
}

const FavoriteToggle: React.FC<FavoriteToggleProps> = ({ car, isFavorite, onToggle, className }) => {
  // Fallback to internal favorites hook if external handlers are not provided
  const internal = useFavorites();
  const active = typeof isFavorite === 'boolean' ? isFavorite : internal.isFavorite(car.id);
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggle) onToggle(car);
    else internal.toggleFavorite(car);
  };

  return (
    <button
      aria-label={active ? 'Убрать из избранного' : 'Добавить в избранное'}
      onClick={handleToggle}
      className={cn(
        'w-[42px] h-[42px] bg-transparent rounded-full flex items-center justify-center border border-muted z-10',
        'transition-opacity duration-slow',
        className,
      )}
    >
      <Icon name="heart" size="md" color={active ? '#D72E36' : '#342929'} />
    </button>
  );
};

export default FavoriteToggle;
