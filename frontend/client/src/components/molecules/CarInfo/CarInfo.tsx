import React from 'react';
import { formatMileage } from '../../../lib/utils';
import { getCarProductionDate, getEngineDisplacement, isChina, type CarDetailData } from '../../../lib/carDetailTransforms';

interface CarInfoProps {
  carData: CarDetailData;
}

const SpecRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-secondary text-sm font-medium">{label}</span>
    <span className="text-primary text-sm font-medium">{value}</span>
  </div>
);

/** Привод: fwd/rwd/awd → русское название */
const driveTypeLabel: Record<string, string> = {
  fwd: 'Передний',
  rwd: 'Задний',
  awd: 'Полный',
};

const CarInfo: React.FC<CarInfoProps> = ({ carData }) => {
  const china = isChina(carData);

  if (china) {
    // Китайское авто: brand, model, color, mileage, fuel, displacement, hp, transmission, body_type, drive_type, seller_type
    const meta = carData.meta;
    const drive = (meta as any)?.drive_type;
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
        <div className="space-y-4 lg:space-y-6">
          <SpecRow label="Марка:" value={meta?.brand || 'Не указано'} />
          <SpecRow label="Модель:" value={meta?.model || 'Не указано'} />
          <SpecRow label="Дата производства:" value={getCarProductionDate(carData)} />
          <SpecRow label="Пробег:" value={formatMileage(meta?.mileage || 0)} />
          <SpecRow label="Цвет:" value={meta?.color || 'Не указан'} />
        </div>

        <div className="space-y-4 lg:space-y-6">
          <SpecRow label="Тип топлива:" value={meta?.fuel || meta?.fuelfilter || 'Не указан'} />
          <SpecRow label="Объем двигателя:" value={getEngineDisplacement(carData)} />
          <SpecRow label="Мощность двигателя:" value={meta?.hp ? `${meta.hp} л.с.` : 'Не указана'} />
          <SpecRow label="КПП:" value={meta?.transmission || 'Не указана'} />
          <SpecRow label="Кузов:" value={meta?.body_type || 'Не указан'} />
          {drive && <SpecRow label="Привод:" value={driveTypeLabel[drive] || drive} />}
        </div>
      </div>
    );
  }

  // Корейское авто (оригинальная логика)
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
        <SpecRow label="Мощность двигателя:" value={carData.meta?.hp ? `${carData.meta.hp} л.с.` : 'Не указана'} />
      </div>
    </div>
  );
};

export { CarInfo };
