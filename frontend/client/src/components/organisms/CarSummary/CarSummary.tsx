import React from 'react';
import { ApiCar } from '../../../types';
import { cn, formatPrice, formatMileage, getStatusVariant } from '../../../lib/utils';
import { Badge, Button, Icon, PriceTag } from '../../atoms';
import { Hint } from '../../molecules';

interface CarSummaryProps {
  car: ApiCar;
  className?: string;
}

/**
 * Основная сводка информации об автомобиле
 * Показывает название, цену, статус и ключевые характеристики
 */
export const CarSummary: React.FC<CarSummaryProps> = ({
  car,
  className,
}) => {
  // Формируем название автомобиля
  const carTitle = [
    car.manufacturerenglishname,
    car.modelgroupenglishname,
    car.gradeenglishname,
  ].filter(Boolean).join(' ');

  // Получаем цену (приоритет current.usdt.total)
  const price = car.current?.usdt?.total || car.simulated?.usdt?.total || car.price || 0;

  // Получаем статус
  const status = React.useMemo(() => {
    const category = car.current?.usdt?.customs?.category;
    const monthsToPass = car.simulated?.monthsToPass;

    if (!category) return null;

    // Преобразуем формат из API (с подчеркиваниями) в наш формат (с дефисами)
    const normalizedCategory = category.replace(/_/g, '-');

    let statusType: string;
    let statusLabel: string;

    // Если есть monthsToPass, то показываем сумму из simulated и срок
    if (monthsToPass && monthsToPass > 0) {
      statusType = 'rate-0-3';
      const simTotal = car.simulated?.usdt?.total || 0;
      statusLabel = `${formatPrice(Math.round(simTotal))} через ${monthsToPass} мес.`;
    }
    // Если нет monthsToPass, но статус rate_0_3, то "Высокая ставка"
    else if (normalizedCategory === 'rate-0-3') {
      statusType = 'rate-5-plus';
      statusLabel = 'Высокая ставка';
    }
    // Остальные статусы как обычно
    else {
      statusType = normalizedCategory;
      const statusLabels: Record<string, string> = {
        'rate-5-plus': 'Высокая ставка',
        'rate-3-5': 'Авто проходное',
        'rate-0-3': 'Высокая ставка', // fallback
      };
      statusLabel = statusLabels[normalizedCategory] || category;
    }

    return {
      type: statusType,
      label: statusLabel,
      monthsToPass: monthsToPass || 0,
    } as { type: string; label: string; monthsToPass: number };
  }, [car.current?.usdt?.customs?.category, car.simulated?.monthsToPass, car.simulated?.usdt?.total]);

  // Ключевые характеристики
  const keySpecs = React.useMemo(() => [
    { label: 'Год выпуска', value: car.year ? `${car.year}` : null },
    { label: 'Пробег', value: car.mileage ? formatMileage(car.mileage) : null },
    { label: 'Двигатель', value: car.displacement ? `${car.displacement / 1000}L` : null },
    { label: 'Топливо', value: car.fuelname || car.fuel_type },
    { label: 'Цвет', value: car.colorname || car.color },
  ].filter(spec => spec.value), [car]);

  // Информация о повреждениях
  const accidentInfo = React.useMemo(() => {
    const hasAccidents = (car.myaccidentcnt && car.myaccidentcnt > 0) || (car.myaccidentcost && car.myaccidentcost > 0);
    
    if (!hasAccidents) {
      return { type: 'clean', label: 'Без повреждений' };
    }
    
    if (car.myaccidentcost && car.myaccidentcost > 0) {
      return { 
        type: 'damaged', 
        label: `Ущерб: ${formatPrice(car.myaccidentcost)}` 
      };
    }
    
    return { 
      type: 'damaged', 
      label: `Повреждений: ${car.myaccidentcnt}` 
    };
  }, [car.myaccidentcnt, car.myaccidentcost]);

  const handleOrderInspection = () => {
    // TODO: Реализовать заказ осмотра
  };

  const handleContactManager = () => {
    // TODO: Реализовать связь с менеджером
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-primary mb-2 leading-tight">
          {carTitle}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Статус */}
          {status && (
            <Hint
              content={(() => {
                if (status.monthsToPass > 0) {
                  const m = status.monthsToPass;
                  return `Через ${m} месяца автомобиль станет проходным и будет оформляться по льготной ставке. Сейчас для него действует высокая таможенная пошлина.`;
                }
                if (status.type === 'rate-3-5') {
                  return 'Автомобиль считается “проходным и попадает под льготную ставку таможенной пошлины.';
                }
                if (status.type === 'rate-5-plus') {
                  return 'Для этого автомобиля действует повышенная таможенная пошлина, так как его возраст превышает 5 лет.';
                }
                return '';
              })()}
            >
              <div>
                <Badge variant={status.type} className="text-sm">
                  {status.label}
                </Badge>
              </div>
            </Hint>
          )}
          
          {/* Повреждения */}
          <Badge
            variant={accidentInfo.type === 'clean' ? 'success' : 'error'}
            className="text-sm"
          >
            {accidentInfo.label}
          </Badge>
        </div>
      </div>

      {/* Цена */}
      <div>
        <PriceTag
          price={price}
          size="lg"
          className="text-3xl lg:text-4xl font-bold"
        />
        {car.yearmonth && (
          <p className="text-sm text-secondary mt-1">
            Дата добавления: {car.yearmonth}
          </p>
        )}
      </div>

      {/* Ключевые характеристики */}
      <div className="grid grid-cols-2 gap-4">
        {keySpecs.map((spec, index) => (
          <div key={index} className="space-y-1">
            <div className="text-sm text-secondary">{spec.label}</div>
            <div className="font-medium text-primary">{spec.value}</div>
          </div>
        ))}
      </div>

      {/* Действия */}
      <div className="space-y-3">
        <Button
          onClick={handleOrderInspection}
          className="w-full"
          size="lg"
        >
          <Icon name="calendar" className="w-5 h-5 mr-2" />
          Заказать осмотр
        </Button>
        
        <Button
          onClick={handleContactManager}
          variant="outline"
          className="w-full"
          size="lg"
        >
          <Icon name="message-circle" className="w-5 h-5 mr-2" />
          Написать менеджеру
        </Button>
      </div>

      {/* Дополнительная информация */}
      <div className="pt-4 border-t border-border space-y-3">
        {car.firstadvertiseddatetime && (
          <div className="flex items-center text-sm text-secondary">
            <Icon name="clock" className="w-4 h-4 mr-2" />
            Первое размещение: {new Date(car.firstadvertiseddatetime).toLocaleDateString('ru-RU')}
          </div>
        )}
        
        <div className="flex items-center text-sm text-secondary">
          <Icon name="map-pin" className="w-4 h-4 mr-2" />
          Местоположение: Япония
        </div>
        
        {car.car_id && (
          <div className="flex items-center text-sm text-secondary">
            <Icon name="hash" className="w-4 h-4 mr-2" />
            ID: {car.car_id}
          </div>
        )}
      </div>
    </div>
  );
};
