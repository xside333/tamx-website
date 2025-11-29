import React, { useEffect, useRef } from 'react';
import { Icon } from '../../atoms';

const LocationSection: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    // Очистим контейнер перед вставкой (во избежание дублей при HMR)
    mapRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    script.async = true;
    script.src = 'https://api-maps.yandex.ru/services/constructor/1.0/js/?um=constructor%3Aef0ad865b2f90bb81034e3a7077a1306a0f50cddef084c9c9fa2cb4c4fedbbc1&width=100%25&height=100%25&lang=ru_RU&scroll=true';
    mapRef.current.appendChild(script);

    return () => {
      if (mapRef.current) mapRef.current.innerHTML = '';
    };
  }, []);

  return (
    <section className="bg-surface rounded-lg lg:rounded-[32px] p-4 lg:p-8">
      <div className="mb-6">
        <h2 className="text-primary text-xl lg:text-2xl font-bold leading-tight lg:leading-[28.8px] mb-2">
          Тарасов AUTO Новосибирск
        </h2>
        <p className="text-primary text-base">Город Новосибирск, ул. Ленина 85</p>

        <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-8 mt-4">
          <a
            href="tel:+79537773456"
            className="flex items-center space-x-2 text-primary hover:text-accent transition-colors"
          >
            <Icon name="phone" size="md" className="text-secondary" />
            <span className="text-sm font-medium">+79537773456</span>
          </a>

          <div className="flex items-center space-x-2">
            <Icon name="clock" size="md" className="text-secondary" />
            <span className="text-primary text-sm font-medium">каждый день с 9 до 20:00</span>
          </div>
        </div>
      </div>

      {/* Карта Яндекс (Constructor) */}
      <div className="relative bg-surface-secondary rounded-lg lg:rounded-[16px] h-[250px] lg:h-[417px] overflow-hidden">
        <div ref={mapRef} className="absolute inset-0" />
      </div>
    </section>
  );
};

export default LocationSection;
