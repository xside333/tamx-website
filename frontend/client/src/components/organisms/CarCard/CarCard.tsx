import React, { useState, useCallback } from 'react';
import { Car } from '../../../types';
import { cn, formatPrice, formatMileage, getFuelLabel, computeDefaultMonthlyPayment } from '../../../lib/utils';
import { Badge, Icon, Button } from '../../atoms';
import { LeadModal, FavoriteToggle } from '../../molecules';
import useEmblaCarousel from 'embla-carousel-react';

interface CarCardProps {
  car: Car;
  onCardClick?: (carId: string, e?: React.MouseEvent) => void;
  onFavoriteToggle?: (car: Car) => void;
  isFavorite?: boolean;
  className?: string;
}

const CarCard: React.FC<CarCardProps> = ({
  car,
  onCardClick,
  onFavoriteToggle,
  isFavorite = false,
  className,
  ...props
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  // Create extended photos array based on photo count
  const extendedPhotos = (() => {
    if (car.photos.length === 0) {
      // No photos: show placeholder twice (second with overlay)
      return ['/placeholder.svg', '/placeholder.svg'];
    } else if (car.photos.length === 1) {
      // One photo: duplicate it (second with overlay)
      return [car.photos[0], car.photos[0]];
    } else if (car.photos.length >= 4) {
      // 4+ photos: add extra photo for "more photos" overlay
      return [...car.photos, car.photos[car.photos.length - 1]];
    } else {
      // 2-3 photos: use as is
      return [...car.photos];
    }
  })();

  const isLastPhoto = currentPhotoIndex === extendedPhotos.length - 1;
  const shouldShowBlurOverlay = car.photos.length >= 4 && isLastPhoto;
  const shouldShowNoMorePhotos = (car.photos.length === 0 || car.photos.length === 1 || (car.photos.length >= 2 && car.photos.length <= 3)) && isLastPhoto;

  // Embla carousel callbacks
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentPhotoIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const photoIndex = Math.floor((x / width) * extendedPhotos.length);
    const clampedIndex = Math.max(0, Math.min(photoIndex, extendedPhotos.length - 1));
    setCurrentPhotoIndex(clampedIndex);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCurrentPhotoIndex(0);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    onCardClick?.(car.id, e);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(car);
  };

  const monthlyPayment = car.monthlyPayment || computeDefaultMonthlyPayment(car.price);

  return (
    <div
      className={cn(
        'card group cursor-pointer transition-all duration-normal hover:shadow-md',
        className
      )}
      onClick={handleCardClick}
      {...props}
    >
      {/* Car image carousel */}
      <div className="relative px-[3px] pt-[3px] cursor-pointer">
        {/* Status badge overlay (top-left over photo) */}
        {car.status && (
          <div className="absolute top-[10px] left-[10px] z-10">
            <Badge variant={car.status.type as any} className="inline-flex" size="sm">
              {car.status.label}
            </Badge>
          </div>
        )}

        {/* Favorite toggle - always visible on mobile, hover on desktop */}
        <div className="absolute top-[10px] right-[10px] z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-slow">
          <FavoriteToggle car={car} isFavorite={isFavorite} onToggle={onFavoriteToggle} className="bg-surface" />
        </div>

        {/* Desktop version - mouse hover with original behavior */}
        <div
          className="hidden md:block"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
        >
          <img
            src={extendedPhotos[currentPhotoIndex]}
            alt={car.name}
            className="w-full h-[234px] object-cover rounded-xl"
            loading="lazy"
          />

          {/* Desktop overlays - positioned over the image as before */}
          {shouldShowBlurOverlay && car.photos.length >= 4 && (
            <div className="absolute inset-0 rounded-xl backdrop-blur-sm bg-black/30 flex items-center justify-center">
              <div className="flex flex-col items-center justify-center">
                <Icon name="camera" size="xl" color="#ffffff" className="mb-2" />
                <span className="text-white text-sm font-medium">Ещё фото →</span>
              </div>
            </div>
          )}

          {shouldShowNoMorePhotos && (
            <div className="absolute inset-0 rounded-xl backdrop-blur-sm bg-black/30 flex items-center justify-center">
              <div className="flex flex-col items-center justify-center">
                <Icon name="close" size="xl" color="#ffffff" className="mb-2" />
                <span className="text-white text-sm font-medium">Фото больше нет</span>
              </div>
            </div>
          )}
        </div>

        {/* Mobile version - swipe carousel */}
        <div className="block md:hidden overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {extendedPhotos.map((photo, index) => {
              const isLastSlide = index === extendedPhotos.length - 1;
              const shouldShowOverlay = car.photos.length >= 4 && isLastSlide;
              const shouldShowNoMorePhotosSlide = (car.photos.length === 0 || car.photos.length === 1 || (car.photos.length >= 2 && car.photos.length <= 3)) && isLastSlide;

              return (
                <div key={index} className="flex-[0_0_100%] min-w-0 relative">
                  <img
                    src={photo}
                    alt={`${car.name} - фото ${index + 1}`}
                    className="w-full h-[234px] object-cover rounded-xl"
                    loading="lazy"
                  />

                  {/* Overlay for "More photos" on last slide */}
                  {shouldShowOverlay && (
                    <div className="absolute inset-0 rounded-xl backdrop-blur-sm bg-black/30 flex items-center justify-center">
                      <div className="flex flex-col items-center justify-center">
                        <Icon name="camera" size="xl" color="#ffffff" className="mb-2" />
                        <span className="text-white text-sm font-medium">Ещё фото →</span>
                      </div>
                    </div>
                  )}

                  {/* Overlay for "No more photos" on last slide */}
                  {shouldShowNoMorePhotosSlide && (
                    <div className="absolute inset-0 rounded-xl backdrop-blur-sm bg-black/30 flex items-center justify-center">
                      <div className="flex flex-col items-center justify-center">
                        <Icon name="close" size="xl" color="#ffffff" className="mb-2" />
                        <span className="text-white text-sm font-medium">Фото больше нет</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Photo counter dots - always visible on mobile when multiple photos, hover on desktop */}
        {extendedPhotos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1 z-20 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
            {extendedPhotos.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  currentPhotoIndex === index
                    ? 'bg-surface'
                    : 'bg-surface/50'
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Car details */}
      <div className="px-4 pb-4 mt-4">
        <h3
          className="text-primary font-medium text-base mb-4 min-h-[48px] leading-6"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {car.name}
        </h3>

        {/* Price and Buy button */}
        <div className="flex items-center justify-between mb-2 gap-3">
          <div className="text-primary font-bold text-lg">{formatPrice(car.price)}</div>
          <Button
            variant="primary"
            className="h-[36px] px-4 py-2"
            onClick={(e) => { e.stopPropagation(); setLeadOpen(true); }}
          >
            Купить
          </Button>
        </div>

        {/* Car specs */}
        <div className="text-sm text-primary mb-3">
          <span>
            {car.year}, {formatMileage(car.mileage)}, {getFuelLabel(car.fuel)}, {car.engine}
          </span>
        </div>

        {/* Credit offer (left bottom) */}
        <div className="mt-1">
          <a
            href={`/car/${car.id}#credit`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent text-sm font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            В кредит от {formatPrice(monthlyPayment)}/мес.
          </a>
        </div>
      </div>
      {/* Lead modal */}
      <LeadModal
        open={leadOpen}
        onClose={() => setLeadOpen(false)}
        car={{
          id: car.id,
          name: car.name,
          price: car.price,
          link: (typeof window !== 'undefined' ? `${window.location.origin}/car/${car.id}` : `/car/${car.id}`),
          statusLabel: car.status?.label || null,
        }}
        title="Заявка на покупку авто"
        pageLabel="Каталог"
        btnLabel="Купить"
      />
    </div>
  );
};

export default CarCard;
