import React from 'react';
import { ApiCar } from '../../types';
import { cn } from '../../lib/utils';
import { 
  CarGallery,
  CarSummary,
  FinanceBlock,
  MapPlaceholder,
  YouMayAlsoLike 
} from '../organisms';
import { SpecList } from '../molecules';
import { Skeleton } from '../atoms';

interface CarDetailTemplateProps {
  car?: ApiCar;
  loading?: boolean;
  className?: string;
}

/**
 * Шаблон страницы автомобиля
 * Компонует все секции согласно Figma дизайну
 */
export const CarDetailTemplate: React.FC<CarDetailTemplateProps> = ({
  car,
  loading = false,
  className,
}) => {
  
  if (loading) {
    return <CarDetailSkeleton />;
  }

  if (!car) {
    return null;
  }

  return (
    <div className={cn('container mx-auto py-8 space-y-8', className)}>
      {/* Хлебные крошки */}
      <nav className="text-sm text-secondary" aria-label="Breadcrumb">
        <ol className="flex space-x-2">
          <li>
            <a href="/catalog" className="hover:text-primary transition-colors">
              Каталог
            </a>
          </li>
          <li className="before:content-['/'] before:mx-2">
            <span className="text-primary">
              {car.manufacturerenglishname} {car.modelgroupenglishname}
            </span>
          </li>
        </ol>
      </nav>

      {/* Основной контент - Галерея и Сводка */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Галерея изображений */}
        <div className="order-1">
          <CarGallery car={car} />
        </div>
        
        {/* Основная информация */}
        <div className="order-2 space-y-6">
          <CarSummary car={car} />
        </div>
      </div>

      {/* Характеристики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SpecList car={car} />
        
        {/* Финансовый блок */}
        <FinanceBlock car={car} />
      </div>

      {/* Карта (на всю ширину) */}
      <div>
        <MapPlaceholder />
      </div>

      {/* Рекомендации (на всю ширину) */}
      <div>
        <YouMayAlsoLike currentCarId={car.car_id || car.id} />
      </div>
    </div>
  );
};

/**
 * Скелетон для загрузки страницы автомобиля
 */
const CarDetailSkeleton: React.FC = () => {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Хлебные крошки скелетон */}
      <Skeleton className="h-4 w-64" />

      {/* Основной контент скелетон */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Галерея скелетон */}
        <div className="space-y-4">
          <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-square w-20 rounded" />
            ))}
          </div>
        </div>
        
        {/* Информация скелетон */}
        <div className="space-y-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="h-6 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 flex-1" />
          </div>
        </div>
      </div>

      {/* Характеристики и финансы скелетон */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>

      {/* Карта скелетон */}
      <Skeleton className="h-96 w-full rounded-lg" />

      {/* Рекомендации скелетон */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
