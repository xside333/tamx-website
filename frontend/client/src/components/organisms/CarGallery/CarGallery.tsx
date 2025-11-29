import React, { useState, useCallback } from 'react';
import { ApiCar } from '../../../types';
import { cn } from '../../../lib/utils';
import { Icon } from '../../atoms';
import useEmblaCarousel from 'embla-carousel-react';

interface CarGalleryProps {
  car: ApiCar;
  className?: string;
}

/**
 * Галерея изображений автомобиля с каруселью и полноэкранным просмотром
 */
export const CarGallery: React.FC<CarGalleryProps> = ({
  car,
  className,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  // Собираем массив изображений по приоритету
  const images = React.useMemo(() => {
    const photoArray: string[] = [];
    
    // Приоритетные фотографии из photo_paths
    if (car.photo_paths && car.photo_paths.length > 0) {
      // Сортируем по приоритету: 001 > 003 > 004 > 007
      const priorityOrder = ['001', '003', '004', '007'];
      const sortedPhotos = [...car.photo_paths].sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a.code || a.cod || '999');
        const bIndex = priorityOrder.indexOf(b.code || b.cod || '999');
        return aIndex - bIndex;
      });
      
      sortedPhotos.forEach(photo => {
        if (photo.path) {
          photoArray.push(photo.path);
        }
      });
    }
    
    // Если нет фотографий из photo_paths, используем photo_outer
    if (photoArray.length === 0 && car.photo_outer) {
      photoArray.push(car.photo_outer);
    }
    
    // Если нет ни одной фотографии, используем плейсхолдер
    if (photoArray.length === 0) {
      photoArray.push('/placeholder.svg');
    }
    
    return photoArray;
  }, [car.photo_paths, car.photo_outer]);

  // Embla carousel для главного изображения
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'center',
  });

  // Embla carousel для превью
  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
    containScroll: 'keepSnaps',
    dragFree: true,
  });

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
    if (emblaThumbsApi) emblaThumbsApi.scrollTo(index);
    setSelectedImageIndex(index);
  }, [emblaApi, emblaThumbsApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedImageIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  const nextImage = () => {
    const nextIndex = (selectedImageIndex + 1) % images.length;
    setSelectedImageIndex(nextIndex);
    scrollTo(nextIndex);
  };

  const prevImage = () => {
    const prevIndex = selectedImageIndex === 0 ? images.length - 1 : selectedImageIndex - 1;
    setSelectedImageIndex(prevIndex);
    scrollTo(prevIndex);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Основная карусель */}
      <div className="relative group">
        <div className="overflow-hidden rounded-lg bg-muted" ref={emblaRef}>
          <div className="flex">
            {images.map((image, index) => (
              <div
                key={index}
                className="relative flex-none w-full aspect-[4/3] cursor-pointer"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={image}
                  alt={`${car.manufacturerenglishname} ${car.modelgroupenglishname} - фото ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
                
                {/* Иконка зума */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                  <div className="bg-white/90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Icon name="expand" className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Стрелки навигации для главной карусели */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              aria-label="Предыдущее фото"
            >
              <Icon name="chevron-left" className="w-5 h-5 text-primary" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              aria-label="Следующее фото"
            >
              <Icon name="chevron-right" className="w-5 h-5 text-primary" />
            </button>
          </>
        )}

        {/* Индикатор количества фото */}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-sm px-2 py-1 rounded">
            {selectedImageIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Превью изображений */}
      {images.length > 1 && (
        <div className="overflow-hidden" ref={emblaThumbsRef}>
          <div className="flex gap-2">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={cn(
                  'relative flex-none w-20 h-20 rounded border-2 transition-colors duration-200 overflow-hidden',
                  selectedImageIndex === index
                    ? 'border-accent'
                    : 'border-transparent hover:border-border'
                )}
              >
                <img
                  src={image}
                  alt={`Превью ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {selectedImageIndex !== index && (
                  <div className="absolute inset-0 bg-black/20" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Полноэкранная галерея (лайтбокс) */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          {/* Фон для закрытия */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={closeLightbox}
          />
          
          {/* Контент лайтбокса */}
          <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            <img
              src={images[selectedImageIndex]}
              alt={`${car.manufacturerenglishname} ${car.modelgroupenglishname} - фото ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Кнопка закрытия */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors duration-200"
              aria-label="Закрыть галерею"
            >
              <Icon name="x" className="w-6 h-6" />
            </button>

            {/* Навигация в лайтбоксе */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors duration-200"
                  aria-label="Предыдущее фото"
                >
                  <Icon name="chevron-left" className="w-6 h-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors duration-200"
                  aria-label="Следующее фото"
                >
                  <Icon name="chevron-right" className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Счетчик фото в лайтбоксе */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded">
              {selectedImageIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
