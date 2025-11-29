import React from 'react';
import { ApiCar } from '../../../types';
import { cn, formatMileage } from '../../../lib/utils';
import { Icon } from '../../atoms';

interface SpecListProps {
  car: ApiCar;
  className?: string;
}

interface SpecItem {
  label: string;
  value: string | null;
  icon?: string;
}

/**
 * Список детальных характеристик автомобиля
 * Отображает технические данные в удобном формате
 */
export const SpecList: React.FC<SpecListProps> = ({
  car,
  className,
}) => {
  
  const specifications = React.useMemo(() => {
    const specs: SpecItem[] = [
      {
        label: 'Двигатель',
        value: car.displacement ? `${(car.displacement / 1000).toFixed(1)}L` : null,
        icon: 'settings',
      },
      {
        label: 'Тип топлива',
        value: car.fuelname || car.fuel_type,
        icon: 'fuel',
      },
      {
        label: 'Привод',
        value: null, // Пока нет в API
        icon: 'navigation',
      },
      {
        label: 'Коробка передач',
        value: null, // Пока нет в API
        icon: 'rotate-cw',
      },
      {
        label: 'VIN/Frame',
        value: null, // Пока нет в API
        icon: 'hash',
      },
      {
        label: 'Год выпуска',
        value: car.year ? `${car.year}` : null,
        icon: 'calendar',
      },
      {
        label: 'Месяц выпуска',
        value: car.month ? `${car.month}` : null,
        icon: 'calendar',
      },
      {
        label: 'Пробег',
        value: car.mileage ? formatMileage(car.mileage) : null,
        icon: 'gauge',
      },
      {
        label: 'Цвет',
        value: car.colorname || car.color,
        icon: 'palette',
      },
    ];

    // Фильтруем только заполненные характеристики
    return specs.filter(spec => spec.value !== null && spec.value !== undefined);
  }, [car]);

  const damageSpecs = React.useMemo(() => {
    const specs: SpecItem[] = [];
    
    if (car.myaccidentcnt !== undefined) {
      specs.push({
        label: 'Количество повреждений',
        value: `${car.myaccidentcnt}`,
        icon: 'alert-triangle',
      });
    }
    
    if (car.myaccidentcost !== undefined && car.myaccidentcost > 0) {
      specs.push({
        label: 'Стоимость ремонта',
        value: `${car.myaccidentcost.toLocaleString()} ¥`,
        icon: 'dollar-sign',
      });
    }
    
    return specs;
  }, [car.myaccidentcnt, car.myaccidentcost]);

  if (specifications.length === 0 && damageSpecs.length === 0) {
    return (
      <div className={cn('p-6 bg-surface rounded-lg border border-border', className)}>
        <h3 className="text-lg font-semibold text-primary mb-4">Характеристики</h3>
        <p className="text-secondary">Информация о характеристиках пока недоступна</p>
      </div>
    );
  }

  return (
    <div className={cn('p-6 bg-surface rounded-lg border border-border', className)}>
      <h3 className="text-lg font-semibold text-primary mb-6 flex items-center">
        <Icon name="list" className="w-5 h-5 mr-2" />
        Характеристики
      </h3>
      
      <div className="space-y-4">
        {/* Основные характеристики */}
        {specifications.length > 0 && (
          <div className="space-y-3">
            {specifications.map((spec, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
              >
                <div className="flex items-center text-secondary">
                  {spec.icon && (
                    <Icon name={spec.icon} className="w-4 h-4 mr-3 text-secondary" />
                  )}
                  <span className="text-sm">{spec.label}</span>
                </div>
                <div className="font-medium text-primary text-sm">
                  {spec.value}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Информация о повреждениях */}
        {damageSpecs.length > 0 && (
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-secondary mb-3 flex items-center">
              <Icon name="alert-triangle" className="w-4 h-4 mr-2" />
              Информация о повреждениях
            </h4>
            <div className="space-y-3">
              {damageSpecs.map((spec, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center text-secondary">
                    {spec.icon && (
                      <Icon name={spec.icon} className="w-4 h-4 mr-3 text-secondary" />
                    )}
                    <span className="text-sm">{spec.label}</span>
                  </div>
                  <div className="font-medium text-primary text-sm">
                    {spec.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Нет повреждений */}
        {damageSpecs.length === 0 && (car.myaccidentcnt === 0 || car.myaccidentcnt === undefined) && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center text-green-600">
              <Icon name="check-circle" className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Без повреждений</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
