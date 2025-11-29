import React from 'react';
import { cn } from '../../../lib/utils';
import { Button } from '../../atoms';

interface CtaBannerProps {
  className?: string;
  onOrder?: () => void;
}

const CtaBanner: React.FC<CtaBannerProps> = ({ className, onOrder }) => {
  return (
    <div className={cn('cta-banner', className)}>
      {/* Content with icon and text */}
      <div className="cta-banner-content">
        <div className="cta-banner-icon">
          <img src="/cta-car.webp" alt="Car" className="w-auto h-full object-contain" />
        </div>
        <div className="text-center md:text-left">
          <h3 className="cta-banner-text text-base md:text-lg font-bold leading-tight">
            Ищете, но всё не то?
          </h3>
          <p className="cta-banner-text text-base md:text-lg font-bold leading-tight">
            Мы бесплатно подберем нужное авто
          </p>
        </div>
      </div>

      {/* Button */}
      <Button
        variant="secondary"
        className="bg-surface text-primary hover:bg-gray-100 whitespace-nowrap flex-shrink-0 w-full md:w-auto btn-equal"
        onClick={onOrder}
      >
        Заказать подбор
      </Button>
    </div>
  );
};

export default CtaBanner;
