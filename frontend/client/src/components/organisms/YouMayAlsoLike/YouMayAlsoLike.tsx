import React from 'react';
import { cn } from '../../../lib/utils';
import { Icon } from '../../atoms';
import CarCard from '../CarCard';
import { Car } from '../../../types';

interface YouMayAlsoLikeProps {
  currentCarId?: string;
  className?: string;
}

/**
 * Секция "Вам может понравиться" с рекомендованными автомобилями
 * Использует существующий компонент CarCard для отображения
 */
export const YouMayAlsoLike: React.FC<YouMayAlsoLikeProps> = ({
  currentCarId,
  className,
}) => {
  
  // Моковые данные для демонстрации
  // TODO: Заменить на реальные данные из API
  const recommendedCars: Car[] = React.useMemo(() => [
    {
      id: 'rec-1',
      name: 'Toyota Camry XV70',
      brand: 'Toyota',
      model: 'Camry',
      generation: 'XV70',
      trim: 'Comfort',
      price: 2850000,
      year: 2020,
      month: 8,
      mileage: 45000,
      fuel: 'Бензин',
      engine: '2.5L',
      displacement: 2500,
      location: 'Токио',
      photos: ['/placeholder.svg'],
      totalPhotos: 8,
      status: {
        type: 'rate-3-5',
        label: 'Авто проходное',
      },
      accidentFree: true,
      color: 'Черный',
      myaccidentcnt: 0,
      myaccidentcost: 0,
    },
    {
      id: 'rec-2',
      name: 'Honda Accord CR6',
      brand: 'Honda',
      model: 'Accord',
      generation: 'CR6',
      trim: 'Sport',
      price: 2450000,
      year: 2019,
      month: 12,
      mileage: 62000,
      fuel: 'Бензин',
      engine: '2.0L Turbo',
      displacement: 2000,
      location: 'Осака',
      photos: ['/placeholder.svg'],
      totalPhotos: 12,
      status: {
        type: 'rate-0-3',
        label: 'Проходной через 2 мес.',
        monthsUntilPassable: 2,
      },
      accidentFree: false,
      color: 'Белый',
      myaccidentcnt: 1,
      myaccidentcost: 150000,
    },
    {
      id: 'rec-3',
      name: 'Mazda CX-5 KF',
      brand: 'Mazda',
      model: 'CX-5',
      generation: 'KF',
      trim: 'Touring',
      price: 3200000,
      year: 2021,
      month: 4,
      mileage: 28000,
      fuel: 'Бензин',
      engine: '2.5L',
      displacement: 2500,
      location: 'Иокогама',
      photos: ['/placeholder.svg'],
      totalPhotos: 15,
      status: {
        type: 'rate-3-5',
        label: 'Авто проходное',
      },
      accidentFree: true,
      color: 'Серый',
      myaccidentcnt: 0,
      myaccidentcost: 0,
    },
    {
      id: 'rec-4',
      name: 'Subaru Outback BS',
      brand: 'Subaru',
      model: 'Outback',
      generation: 'BS',
      trim: 'Premium',
      price: 2950000,
      year: 2020,
      month: 6,
      mileage: 38000,
      fuel: 'Бензин',
      engine: '2.5L',
      displacement: 2500,
      location: 'Нагоя',
      photos: ['/placeholder.svg'],
      totalPhotos: 10,
      status: {
        type: 'rate-5-plus',
        label: 'Высокая ставка',
      },
      accidentFree: true,
      color: 'Синий',
      myaccidentcnt: 0,
      myaccidentcost: 0,
    },
  ], []);

  // Исключаем текущий автомобиль из рекомендаций
  const filteredRecommendations = recommendedCars.filter(car => car.id !== currentCarId);

  const handleCardClick = (carId: string) => {
    // Переход на страницу автомобиля
    window.location.href = `/car/${carId}`;
  };

  const handleFavoriteToggle = (car: Car) => {
    // TODO: Реализовать добавление в избранное
  };

  if (filteredRecommendations.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-primary flex items-center">
          <Icon name="heart" className="w-5 h-5 mr-2 text-accent" />
          Вам может понравиться
        </h3>
        
        <a
          href="/catalog"
          className="text-accent hover:text-accent/80 text-sm font-medium flex items-center transition-colors"
        >
          Смотреть все
          <Icon name="arrow-right" className="w-4 h-4 ml-1" />
        </a>
      </div>

      {/* Сетка рекомендаций */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRecommendations.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            onCardClick={handleCardClick}
            onFavoriteToggle={handleFavoriteToggle}
            isFavorite={false} // TODO: Проверять реальный статус избранного
            className="h-full"
          />
        ))}
      </div>

      {/* Дополнительная CTA */}
      <div className="text-center pt-6 border-t border-border">
        <p className="text-secondary text-sm mb-4">
          Не нашли подходящий автомобиль?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
          <a
            href="/catalog"
            className="btn btn-outline flex-1 sm:flex-none"
          >
            <Icon name="search" className="w-4 h-4 mr-2" />
            Поиск по каталогу
          </a>
          <button className="btn btn-primary flex-1 sm:flex-none">
            <Icon name="bell" className="w-4 h-4 mr-2" />
            Уведомить о поступлении
          </button>
        </div>
      </div>
    </div>
  );
};
