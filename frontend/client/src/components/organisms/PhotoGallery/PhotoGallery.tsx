// PhotoGallery.tsx — версия 0001.004
import React, { useState } from 'react';
import { cn } from '../../../lib/utils';
import { Icon } from '../../atoms';
import MobileGallery from './MobileGallery';
import { processDetailPhotos, getEncarLink, type CarDetailData } from '../../../lib/carDetailTransforms';
import useEmblaCarousel from 'embla-carousel-react';

interface PhotoGalleryProps {
  car: any;
  carData: CarDetailData;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ car, carData }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [thumbnailPage, setThumbnailPage] = useState(0);

  const photos = React.useMemo(() => processDetailPhotos(carData), [carData]);

  const openLightbox = (index: number) => {
    setSelectedPhoto(index);
    setIsLightboxOpen(true);
  };
  const closeLightbox = () => setIsLightboxOpen(false);
  const selectPhoto = (index: number) => setSelectedPhoto(index);

  const nextImage = () => setSelectedPhoto((p) => (p + 1) % photos.length);
  const prevImage = () => setSelectedPhoto((p) => (p === 0 ? photos.length - 1 : p - 1));

  // Keyboard nav in lightbox
  React.useEffect(() => {
    if (!isLightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); if (lightboxApi) lightboxApi.scrollNext(); else nextImage(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); if (lightboxApi) lightboxApi.scrollPrev(); else prevImage(); }
      else if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); };
  }, [isLightboxOpen]);

  // Thumbnails pagination (6 per page)
  const thumbnailsPerPage = 6;
  const totalThumbnailPages = Math.ceil(photos.length / thumbnailsPerPage);
  const visibleThumbnails = photos.slice(thumbnailPage * thumbnailsPerPage, (thumbnailPage + 1) * thumbnailsPerPage);
  const nextThumbnailPage = () => thumbnailPage < totalThumbnailPages - 1 && setThumbnailPage(thumbnailPage + 1);
  const prevThumbnailPage = () => thumbnailPage > 0 && setThumbnailPage(thumbnailPage - 1);

  const encarUrl = getEncarLink(carData);

  // Embla for lightbox (важно: align:start + containScroll, чтобы не "подглядывали" соседние слайды)
  const [lightboxRef, lightboxApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
  });

  // Sync selected slide on open + subscribe to select
  React.useEffect(() => {
    if (!isLightboxOpen || !lightboxApi) return;
    lightboxApi.scrollTo(selectedPhoto, true);
    const onSelectLightbox = () => setSelectedPhoto(lightboxApi.selectedScrollSnap());
    lightboxApi.on('select', onSelectLightbox);
    return () => { lightboxApi.off('select', onSelectLightbox); }; // cleanup строго void
  }, [isLightboxOpen, lightboxApi, selectedPhoto]);

  // Scroll lock under lightbox
  const scrollLockYRef = React.useRef(0);
  React.useEffect(() => {
    if (!isLightboxOpen) return;
    scrollLockYRef.current = window.scrollY || window.pageYOffset || 0;
    const { body, documentElement } = document;
    body.style.position = 'fixed';
    body.style.top = `-${scrollLockYRef.current}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    (documentElement.style as CSSStyleDeclaration).overscrollBehavior = 'none';
    return () => {
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      body.style.overflow = '';
      body.style.touchAction = '';
      (documentElement.style as CSSStyleDeclaration).overscrollBehavior = '';
      window.scrollTo(0, scrollLockYRef.current || 0);
    };
  }, [isLightboxOpen]);

  // === Ограничения размеров для изображения (и ширины вьюпорта карусели) ===
  const maxImgStyle: React.CSSProperties = {
    maxWidth: 'min(90vw, 1600px)',
    maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 112px)', // запас под контролы
  };
  const viewportStyle: React.CSSProperties = {
    width: 'min(90vw, 1600px)',  // фиксируем ширину вьюпорта → каждый слайд = 100% этой ширины
    height: 'auto',
  };

  return (
    <section className="bg-surface rounded-lg lg:rounded-[32px] p-[3px] overflow-hidden">
      {/* Desktop layout */}
      <div className="hidden lg:flex lg:flex-row gap-[2px]">
        {/* Left: Main Photo */}
        <div className="relative lg:w-[40%]">
          <div className="overflow-hidden rounded-[28px] bg-muted h-[340px] w-full">
            <img
              src={photos[selectedPhoto] || '/placeholder.svg'}
              alt={`${car?.name ?? 'Авто'} - фото ${selectedPhoto + 1}`}
              className="w-full h-full object-cover cursor-pointer"
              loading="eager"
              onClick={() => openLightbox(selectedPhoto)}
            />
            {encarUrl && (
              <button
                aria-label="Открыть объявление на Encar"
                className="absolute top-2 right-2 text-white opacity-70 hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); window.open(encarUrl, '_blank'); }}
              >
                <Icon name="external-link" size="lg" color="#ffffff" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Thumbnails Grid */}
        <div className="relative lg:w-[60%]">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 grid-rows-2 gap-x-[2px] gap-y-[2px] h-[340px]">
            {visibleThumbnails.map((photo, index) => {
              const actualIndex = thumbnailPage * thumbnailsPerPage + index;
              return (
                <button
                  key={actualIndex}
                  onClick={() => selectPhoto(actualIndex)}
                  className={cn(
                    'relative overflow-hidden rounded-[28px] border-2 transition-all duration-200 h-[169px]',
                    selectedPhoto === actualIndex ? 'border-accent' : 'border-transparent hover:border-border'
                  )}
                >
                  <img src={photo} alt={`Превью ${actualIndex + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  {selectedPhoto !== actualIndex && <div className="absolute inset-0 bg-black/20" />}
                </button>
              );
            })}
          </div>

          {totalThumbnailPages > 1 && (
            <>
              <button
                onClick={nextThumbnailPage}
                disabled={thumbnailPage >= totalThumbnailPages - 1}
                className="absolute -right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Следующее фото"
              >
                <Icon name="chevron-right" className="w-5 h-5 text-primary" />
              </button>
              {thumbnailPage > 0 && (
                <button
                  onClick={prevThumbnailPage}
                  className="absolute -left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:shadow-lg transition-shadow"
                  aria-label="Предыдущие фото"
                >
                  <Icon name="chevron-left" className="w-5 h-5 text-primary" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile & tablet layout */}
      <div className="block lg:hidden">
        <MobileGallery
          photos={photos}
          selected={selectedPhoto}
          onSelect={setSelectedPhoto}
          onOpenLightbox={openLightbox}
          linkUrl={encarUrl}
        />
      </div>

      {/* Fullscreen Lightbox */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center"
          style={{
            overscrollBehavior: 'contain',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
          }}
        >
          {/* Бекдроп — кликом закрываем */}
          <div className="absolute inset-0 cursor-pointer z-[71]" onClick={closeLightbox} />

          {/* Контент лайтбокса */}
            <div
              className="absolute inset-0 z-[72] flex items-center justify-center"
              onClick={closeLightbox}
              >
          {/* Embla viewport: фикс ширина (как у фото), высота по контенту */}
            <div className="overflow-hidden inline-block" ref={lightboxRef} style={{ touchAction: 'pan-y', ...viewportStyle }}>
              <div className="flex items-center">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative flex-none w-full h-auto flex items-center justify-center"
                  >
                    {/* Контейнер фото — именно к нему привязываем ВСЕ контролы */}
                    <div
                        className="relative inline-block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img
                          src={photo}
                          alt={`${car?.name ?? 'Авто'} - фото ${index + 1}`}
                          draggable={false}
                          className="block object-contain mx-auto w-full sm:w-auto"
                          style={{height: 'auto', ...maxImgStyle }}
                        />
                      {/* Кнопка закрытия — 10px от верхнего/правого края фото */}
                      <button
                        onClick={closeLightbox}
                        className="absolute bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center text-white transition-colors duration-200"
                        aria-label="Закрыть галерею"
                        style={{ top: 10, right: 10 }}
                      >
                        <Icon name="x" className="w-6 h-6" />
                      </button>

                      {/* Стрелки — центр по высоте фото, 10px от левого/правого краёв фото */}
                      {photos.length > 1 && (
                        <>
                          <button
                            onClick={() => lightboxApi && lightboxApi.scrollPrev()}
                            className="absolute bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center text-white transition-colors duration-200"
                            aria-label="Предыдущее фото"
                            style={{ left: 10, top: '50%', transform: 'translateY(-50%)' }}
                          >
                            <Icon name="chevron-left" className="w-6 h-6" />
                          </button>
                          <button
                            onClick={() => lightboxApi && lightboxApi.scrollNext()}
                            className="absolute bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center text-white transition-colors duration-200"
                            aria-label="Следующее фото"
                            style={{ right: 10, top: '50%', transform: 'translateY(-50%)' }}
                          >
                            <Icon name="chevron-right" className="w-6 h-6" />
                          </button>
                        </>
                      )}

                      {/* Счётчик — ровно 10px от низа фото, по центру */}
                      <div
                        className="absolute bg-black/50 text-white px-3 py-1 rounded"
                        style={{ left: '50%', transform: 'translateX(-50%)', bottom: 10 }}
                      >
                        {selectedPhoto + 1} / {photos.length}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PhotoGallery;
