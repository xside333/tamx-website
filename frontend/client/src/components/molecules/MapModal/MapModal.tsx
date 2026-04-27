import React, { useEffect, useRef } from 'react';
import { cn } from '../../../lib/utils';
import { Icon } from '../../atoms';

interface MapModalProps {
  open: boolean;
  onClose: () => void;
  className?: string;
}

const CONSTRUCTOR_SRC =
  'https://api-maps.yandex.ru/services/constructor/1.0/js/?um=constructor%3Aef0ad865b2f90bb81034e3a7077a1306a0f50cddef084c9c9fa2cb4c4fedbbc1&width=100%25&height=100%25&lang=ru_RU&scroll=true';

const MapModal: React.FC<MapModalProps> = ({ open, onClose, className }) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !mapRef.current) return;

    mapRef.current.replaceChildren();

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    script.async = true;
    script.src = CONSTRUCTOR_SRC;
    mapRef.current.appendChild(script);

    return () => {
      if (mapRef.current) mapRef.current.replaceChildren();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)]" onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={cn(
          'absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto',
          'bg-surface border border-muted rounded-xl shadow-lg',
          'w-[min(640px,calc(100vw-32px))] overflow-hidden',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
          <h3 className="text-[var(--color-text-primary)] text-base font-semibold font-[var(--font-family-heading)]">
            Новосибирск, ул. Ленина 85, офис 3
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--color-surface-secondary)] transition-colors"
          >
            <Icon name="close" size="md" />
          </button>
        </div>
        <div className="w-full h-[400px] relative" ref={mapRef} />
        <div className="px-4 py-3 text-center">
          <a
            href="https://yandex.ru/maps/?pt=82.920430,55.030199&z=15&l=map"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent)] text-sm font-medium hover:underline"
          >
            Открыть в Яндекс Картах
          </a>
        </div>
      </div>
    </div>
  );
};

export default MapModal;
