import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '../../atoms';
import { getDeliveryCosts } from '../../../lib/api';
import { formatPrice } from '../../../lib/utils';

const DeliveryToCity: React.FC = () => {
  const { data: costs } = useQuery({ queryKey: ['deliveryCosts'], queryFn: getDeliveryCosts, staleTime: 24 * 60 * 60 * 1000 });
  const cities = useMemo(() => Object.keys(costs || {}).sort(), [costs]);

  const [open, setOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const selectedCost = selectedCity ? costs?.[selectedCity] ?? null : null;
  const description = selectedCost
    ? `Доставка осуществляется из города Владивосток. Стоимость доставки до вашего города составляет ${formatPrice(selectedCost).replace('₽', '')} рублей без учета страхования груза`
    : 'Рассчитаем примерную сумму доставки из автосалона до выбранного города.';

  return (
    <section className="bg-surface rounded-lg lg:rounded-[32px] p-4 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        <div className="space-y-4">
          <h2 className="text-primary text-xl lg:text-2xl font-bold leading-tight lg:leading-[28.8px]">
            Доставка до вашего города
          </h2>
          <p className="text-primary text-sm">
            {description}
          </p>
        </div>
        <div className="space-y-3 w-full lg:w-auto relative flex flex-col items-stretch lg:items-end">
          <button
            className="border border-muted rounded-lg lg:rounded-[16px] px-4 py-4 w-full lg:w-[402px] flex items-center justify-between hover:border-accent transition-colors group"
            onClick={() => setOpen(o => !o)}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <div className="flex items-center space-x-3">
              <Icon name="map-pin" size="md" className="text-accent" />
              <span className="text-primary text-sm font-medium">{selectedCity || 'Выберите город'}</span>
            </div>
            <Icon name="chevron-right" size="sm" className="text-primary group-hover:text-accent transition-colors" />
          </button>

          {open && cities.length > 0 && (
            <div className="absolute right-0 z-[1040] mt-2 w-full lg:w-[402px] bg-surface rounded-lg lg:rounded-[16px] border border-muted shadow-lg max-h-[260px] overflow-auto">
              <ul role="listbox" className="py-2">
                {cities.map(city => (
                  <li key={city}>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-surface-secondary text-sm"
                      onClick={() => { setSelectedCity(city); setOpen(false); }}
                      role="option"
                    >
                      {city}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-surface-secondary rounded-lg lg:rounded-[16px] px-4 py-4 w-full lg:w-[402px] flex items-center space-x-3">
            <Icon name="truck" size="md" className="text-accent" />
            {selectedCost ? (
              <span className="heading-2">{formatPrice(selectedCost)}</span>
            ) : (
              <span className="text-secondary text-sm leading-[18.2px]">Фактическая сумма может незначительно отличаться</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DeliveryToCity;
