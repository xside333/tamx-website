import React from 'react';
import { cn } from '../../../lib/utils';
import { Icon } from '../../atoms';

interface MapPlaceholderProps {
  className?: string;
}

/**
 * Плейсхолдер для карты Яндекс.Карт
 * В будущем здесь будет интеграция с Yandex Maps API
 */
export const MapPlaceholder: React.FC<MapPlaceholderProps> = ({
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      <h3 className="text-lg font-semibold text-primary mb-6 flex items-center">
        <Icon name="map-pin" className="w-5 h-5 mr-2" />
        Местоположение
      </h3>
      
      <div className="relative bg-muted rounded-lg overflow-hidden h-96 flex items-center justify-center border border-border">
        {/* Фон с паттерном */}
        <div className="absolute inset-0 opacity-10">
          <svg
            width="100%"
            height="100%"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="map-pattern"
                x="0"
                y="0"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="20" cy="20" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#map-pattern)" />
          </svg>
        </div>
        
        {/* Контент плейсхолдера */}
        <div className="relative z-10 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-accent/10 rounded-full flex items-center justify-center">
            <Icon name="map-pin" className="w-8 h-8 text-accent" />
          </div>
          
          <div className="space-y-2">
            <h4 className="text-xl font-semibold text-primary">
              Япония, порт отправки
            </h4>
            <p className="text-secondary max-w-md mx-auto">
              Здесь будет интерактивная карта с отметкой местоположения автомобиля 
              и информацией о портах отправки
            </p>
          </div>
          
          {/* Fake координаты */}
          <div className="text-sm text-muted space-y-1">
            <div>Широта: 35.6762° N</div>
            <div>Долгота: 139.6503° E</div>
          </div>
          
          {/* Кнопка для открытия в Яндекс.Картах */}
          <button className="inline-flex items-center px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors">
            <Icon name="external-link" className="w-4 h-4 mr-2" />
            Открыть в Яндекс.Картах
          </button>
        </div>
        
        {/* Декоративные элементы карты */}
        <div className="absolute top-4 left-4 bg-white/90 rounded p-2 shadow-sm">
          <div className="flex items-center text-xs text-gray-600">
            <Icon name="zoom-in" className="w-3 h-3 mr-1" />
            Zoom
          </div>
        </div>
        
        <div className="absolute bottom-4 right-4 bg-white/90 rounded p-2 shadow-sm">
          <div className="text-xs text-gray-600">
            © Yandex Maps
          </div>
        </div>
        
        {/* Метка на карте */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center shadow-lg">
              <Icon name="map-pin" className="w-4 h-4 text-white" />
            </div>
            {/* Анимированный пульс */}
            <div className="absolute inset-0 w-8 h-8 bg-accent rounded-full animate-ping opacity-25"></div>
          </div>
        </div>
      </div>
      
      {/* Дополнительная информация */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center text-secondary">
          <Icon name="ship" className="w-4 h-4 mr-2" />
          Порт отправки: Токио
        </div>
        <div className="flex items-center text-secondary">
          <Icon name="calendar" className="w-4 h-4 mr-2" />
          Время доставки: 2-4 недели
        </div>
        <div className="flex items-center text-secondary">
          <Icon name="truck" className="w-4 h-4 mr-2" />
          Доставка по России
        </div>
      </div>
    </div>
  );
};
