import React from 'react';
import { Car } from '../../../types';
import { cn } from '../../../lib/utils';
import { Skeleton } from '../../atoms';
import { CtaBanner } from '../../molecules';
import CarCard from '../CarCard/CarCard';

interface CarGridProps {
  cars: Car[];
  loading?: boolean;
  error?: string;
  onCardClick?: (carId: string) => void;
  onFavoriteToggle?: (car: Car) => void;
  favoriteCarIds?: string[];
  onRetry?: () => void;
  onBannerOrder?: () => void;
  className?: string;
}

const CarGridSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
    {Array.from({ length: 9 }).map((_, index) => (
      <div key={index} className="card p-3">
        {/* Image skeleton */}
        <Skeleton height={234} className="rounded-xl mb-4" />
        
        {/* Content skeleton */}
        <div className="px-1 space-y-3">
          {/* Title */}
          <Skeleton height={20} width="70%" />
          
          {/* Price */}
          <Skeleton height={24} width="40%" className="rounded-lg" />
          
          {/* Badge */}
          <Skeleton height={21} width="50%" className="rounded-lg" />
          
          {/* Specs */}
          <Skeleton height={16} width="80%" />
          
          {/* Location and payment */}
          <div className="flex justify-between">
            <Skeleton height={16} width="30%" />
            <Skeleton height={16} width="35%" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const EmptyState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="text-center py-16">
    <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
      <svg className="w-12 h-12 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-primary mb-2">Автомобили не найдены</h3>
    <p className="text-secondary mb-6 max-w-md mx-auto">
      По заданным критериям поиска автомобили не найдены. Попробуйте изменить параметры фильтрации.
    </p>
    {onRetry && (
      <button 
        onClick={onRetry}
        className="btn btn-secondary"
      >
        Сбросить все фильтры
      </button>
    )}
  </div>
);

const ErrorState: React.FC<{ error: string; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="text-center py-16">
    <div className="w-24 h-24 mx-auto mb-6 bg-status-error/10 rounded-full flex items-center justify-center">
      <svg className="w-12 h-12 text-status-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-primary mb-2">Ошибка загрузки</h3>
    <p className="text-secondary mb-6 max-w-md mx-auto">{error}</p>
    {onRetry && (
      <button 
        onClick={onRetry}
        className="btn btn-primary"
      >
        Повторить попытку
      </button>
    )}
  </div>
);

const CarGrid: React.FC<CarGridProps> = ({
  cars,
  loading = false,
  error,
  onCardClick,
  onFavoriteToggle,
  favoriteCarIds = [],
  onRetry,
  onBannerOrder,
  className,
  ...props
}) => {
  if (loading) {
    return (
      <div className={cn('bg-surface rounded-3xl p-0 lg:p-8', className)} {...props}>
        <CarGridSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('bg-surface rounded-3xl p-0 lg:p-8', className)} {...props}>
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }

  if (cars.length === 0) {
    return (
      <div className={cn('bg-surface rounded-3xl p-0 lg:p-8', className)} {...props}>
        <EmptyState onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className={cn('bg-surface rounded-3xl p-0 lg:p-8', className)} {...props}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {cars.map((car, index) => (
          <React.Fragment key={car.id}>
            <CarCard
              car={car}
              onCardClick={onCardClick}
              onFavoriteToggle={onFavoriteToggle}
              isFavorite={favoriteCarIds.includes(car.id)}
            />
            {/* Insert CTA banner after 6th card (index 5) */}
            {index === 5 && cars.length > 6 && (
              <CtaBanner onOrder={onBannerOrder} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default CarGrid;
