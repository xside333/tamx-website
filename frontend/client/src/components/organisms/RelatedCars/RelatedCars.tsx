import React from 'react';
import { useCars } from '../../../hooks';
import { Car } from '../../../types';
import CarCard from '../CarCard';

import { ShowMoreButton } from '../../molecules';

interface RelatedCarsProps {
  currentCarId: string;
  currentPrice: number;
  onFavoriteToggle?: (car: Car) => void;
  favoriteCarIds?: string[];
}

const RelatedCars: React.FC<RelatedCarsProps> = ({ currentCarId, currentPrice, onFavoriteToggle, favoriteCarIds = [] }) => {
  const priceFrom = Math.max(0, Math.floor(currentPrice * 0.8));
  const priceTo = Math.ceil(currentPrice * 1.2);

  const [page, setPage] = React.useState(1);
  const [items, setItems] = React.useState<Car[]>([]);

  const { data: carsData, isFetching } = useCars({
    filters: { models: [], types: [], fuels: [], colors: [], priceFrom, priceTo },
    sort: 'date_desc',
    page,
  });

  // Append next page items (first 28 per page), exclude current car and duplicates
  React.useEffect(() => {
    if (!carsData?.cars) return;
    const pageItems = carsData.cars.filter(c => c.id !== currentCarId);
    const limited = pageItems.slice(0, 28);
    setItems(prev => {
      const ids = new Set(prev.map(i => i.id));
      const toAdd = limited.filter(c => !ids.has(c.id));
      return [...prev, ...toAdd];
    });
  }, [carsData?.cars, currentCarId]);

  const totalPages = carsData?.totalPages;
  const showButton = isFetching || (totalPages ? page < totalPages : true);

  const handleCardClick = (carId: string) => {
    window.location.href = `/car/${carId}`;
  };

  return (
    <section className="space-y-6 lg:space-y-8">
      <h2 className="text-primary text-xl lg:text-2xl font-bold leading-tight lg:leading-[28.8px]">
        Вам может понравиться
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 desktop:grid-cols-3 1.35xl:grid-cols-4 gap-4 lg:gap-6">
        {items.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            onCardClick={handleCardClick}
            onFavoriteToggle={onFavoriteToggle}
            isFavorite={favoriteCarIds.includes(car.id)}
            className="hover:shadow-lg transition-shadow"
          />
        ))}
      </div>

      {showButton && (
        <div className="flex justify-center pt-2">
          <ShowMoreButton
            loading={isFetching}
            disabled={isFetching}
            onClick={() => setPage(p => p + 1)}
          >
            {isFetching ? 'Загрузка...' : 'Показать еще'}
          </ShowMoreButton>
        </div>
      )}
    </section>
  );
};

export default RelatedCars;
