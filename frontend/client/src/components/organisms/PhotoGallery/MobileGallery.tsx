import React, { useCallback, useEffect } from 'react';
import useEmblaCarousel, { EmblaCarouselType } from 'embla-carousel-react';
import { cn } from '../../../lib/utils';

interface MobileGalleryProps {
  photos: string[];
  selected: number;
  onSelect: (index: number) => void;
  onOpenLightbox?: (index: number) => void;
  linkUrl?: string;
}

const scrollThumbIntoView = (thumbApi: EmblaCarouselType | undefined, index: number) => {
  if (!thumbApi) return;
  const nodes = thumbApi.slideNodes();
  const node = nodes[index];
  if (node) node.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
};

export const MobileGallery: React.FC<MobileGalleryProps> = ({ photos, selected, onSelect, onOpenLightbox, linkUrl }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [thumbsRef, thumbsApi] = useEmblaCarousel({ dragFree: true, containScroll: 'keepSnaps' });

  const onSlideSelect = useCallback(() => {
    if (!emblaApi) return;
    const idx = emblaApi.selectedScrollSnap();
    onSelect(idx);
    scrollThumbIntoView(thumbsApi, idx);
  }, [emblaApi, thumbsApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSlideSelect);
    emblaApi.on('reInit', onSlideSelect);
    onSlideSelect();
  }, [emblaApi, onSlideSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.scrollTo(selected, true);
    scrollThumbIntoView(thumbsApi, selected);
  }, [selected, emblaApi, thumbsApi]);

  return (
    <div className="block lg:hidden">
      <div className="overflow-hidden rounded-[16px]" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {photos.map((src, i) => (
            <div className="min-w-0 flex-[0_0_100%]" key={i}>
              <div className="relative w-full h-[280px] sm:h-[360px] bg-muted rounded-[16px] overflow-hidden">
                <img
                  src={src}
                  alt={`Фото ${i + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => onOpenLightbox?.(i)}
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
                {linkUrl && (
                  <button
                    aria-label="Открыть объявление на Encar"
                    className="absolute top-2 right-2 text-white opacity-70 hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); window.open(linkUrl, '_blank'); }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                      <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="15,3 21,3 21,9" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="10" y1="14" x2="21" y2="3" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 overflow-hidden" ref={thumbsRef}>
        <div className="flex gap-2">
          {photos.map((src, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect(i);
                emblaApi?.scrollTo(i);
              }}
              className={cn(
                'relative flex-[0_0_auto] w-20 h-16 rounded-md overflow-hidden border-2',
                selected === i ? 'border-accent' : 'border-transparent'
              )}
            >
              <img src={src} alt={`Миниатюра ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileGallery;
