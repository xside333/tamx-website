import React from 'react';
import { formatMileage } from '../../../lib/utils';
import { getCarProductionDate, getEngineDisplacement, type CarDetailData } from '../../../lib/carDetailTransforms';

interface CarInfoProps {
  carData: CarDetailData;
}

const SpecRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-secondary text-sm font-medium">{label}</span>
    <span className="text-primary text-sm font-medium">{value}</span>
  </div>
);

const CarInfo: React.FC<CarInfoProps> = ({ carData }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
      <div className="space-y-4 lg:space-y-6">
        <SpecRow label="Марка:" value={carData.meta?.manufacturerenglishname || 'Не указано'} />
        <SpecRow label="Модель:" value={carData.meta?.modelgroupenglishname || 'Не указано'} />
        <SpecRow label="Поколение:" value={carData.meta?.modelname || 'Не указано'} />
        <SpecRow label="Тип:" value={carData.meta?.gradeenglishname || 'Не указано'} />
        <SpecRow label="Дата производства:" value={getCarProductionDate(carData)} />
      </div>

      <div className="space-y-4 lg:space-y-6">
        <SpecRow label="Цвет:" value={carData.meta?.color || 'Не указан'} />
        <SpecRow label="Пробег:" value={formatMileage(carData.meta?.mileage || 0)} />
        <SpecRow label="Тип топлива:" value={carData.meta?.fuel || 'Не указан'} />
        <SpecRow label="Объем двигателя:" value={getEngineDisplacement(carData)} />
      </div>
    </div>
  );
};

export { CarInfo };
