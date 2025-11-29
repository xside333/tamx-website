import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../../lib/utils';
import {
  getKoreaPriceRUB,
  getKoreaExpensesRUB,
  getCustomsDuty,
  getUtilFee,
  getBrokerFee,
  getCustomsClearance,
  getTotalPrice,
  type CarDetailData
} from '../../../lib/carDetailTransforms';

interface PriceCalculationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  carData: CarDetailData;
  className?: string;
  placement?: 'inline' | 'bottom';
}

/**
 * Попап с детальным расчетом стоимости автомобиля
 * Открывается при клике на цену
 */
export const PriceCalculationPopover: React.FC<PriceCalculationPopoverProps> = ({
  isOpen,
  onClose,
  carData,
  className,
  placement = 'inline',
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef<number | null>(null);

  // Mount/unmount with smooth animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const t = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Prevent body scroll when bottom sheet is open (strict lock)
  useEffect(() => {
    if (placement !== 'bottom') return;
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const top = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (top) {
        const y = parseInt(top || '0') * -1;
        window.scrollTo(0, y);
      }
    }
  }, [isOpen, placement]);

  // Close on outside click (desktop / inline only)
  useEffect(() => {
    if (placement === 'bottom') return; // handled by overlay
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, placement]);

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!shouldRender) return null;


  if (placement === 'bottom') {
    const onTouchStart = (e: React.TouchEvent) => {
      startYRef.current = e.touches[0].clientY;
      setDragY(0);
    };
    const onTouchMove = (e: React.TouchEvent) => {
      if (startYRef.current == null) return;
      const dy = e.touches[0].clientY - startYRef.current;
      setDragY(Math.max(0, dy));
    };
    const onTouchEnd = () => {
      const threshold = 80;
      if (dragY > threshold) {
        onClose();
      }
      setDragY(0);
      startYRef.current = null;
    };

    return (
      <div className="fixed inset-0 z-[1050]">
        {/* Overlay */}
        <div
          className={cn('absolute inset-0 transition-opacity duration-300', visible ? 'opacity-40' : 'opacity-0')}
          style={{ backgroundColor: 'var(--color-muted)', touchAction: 'none' }}
          onClick={onClose}
          onTouchMove={(e) => e.preventDefault()}
        />
        {/* Sheet */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none">
          <div
            ref={popoverRef}
            className={cn(
              'pointer-events-auto bg-surface rounded-t-[32px] p-4 w-full max-w-[640px] shadow-lg border border-muted transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
              visible ? 'translate-y-0' : 'translate-y-full',
              className
            )}
            style={{ transform: `translateY(${dragY}px)` }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="mx-auto w-10 h-1.5 bg-muted rounded-full mb-3" />
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-primary text-base font-bold">Расчет стоимости</h3>
            </div>
            {/* Price Breakdown */}
            <div className="space-y-4 mb-4 max-h-[70vh] overflow-y-auto">
              <PriceRow label="Стоимость авто в Корее" value={getKoreaPriceRUB(carData)} />
              <PriceRow label="Расходы в Корее" value={getKoreaExpensesRUB(carData)} />
              <PriceRow label="Таможенная ставка" value={getCustomsDuty(carData)} />
              <PriceRow label="Утилизационный сбор" value={getUtilFee(carData)} />
              <PriceRow label="Услуги во Владивостоке" value={getBrokerFee(carData)} />
              <PriceRow label="Комиссия" value={getCustomsClearance(carData)} />
            </div>
            <div className="border-t border-muted pt-3">
              <div className="flex items-center justify-between">
                <span className="text-primary text-base font-bold">Итого</span>
                <span className="text-accent text-base font-bold">{getTotalPrice(carData)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-full mt-2 z-[1050]">
      <div
        ref={popoverRef}
        className={cn(
          'bg-surface rounded-[16px] p-4 w-[400px] shadow-lg border border-muted transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
          className
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-primary text-base font-bold">Расчет стоимости</h3>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-4 mb-6">
          <PriceRow label="Стоимость авто в Корее" value={getKoreaPriceRUB(carData)} />
          <PriceRow label="Расходы в Корее" value={getKoreaExpensesRUB(carData)} />
          <PriceRow label="Таможенная ставка" value={getCustomsDuty(carData)} />
          <PriceRow label="Утилизационный сбор" value={getUtilFee(carData)} />
          <PriceRow label="Услуги во Владивостоке" value={getBrokerFee(carData)} />
          <PriceRow label="Комиссия" value={getCustomsClearance(carData)} />

        </div>

        {/* Total */}
        <div className="border-t border-muted pt-4">
          <div className="flex items-center justify-between">
            <span className="text-primary text-lg font-bold">Итого</span>
            <span className="text-accent text-lg font-bold">{getTotalPrice(carData)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const PriceRow: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-primary">{label}</span>
    <span className="text-primary font-medium">{value}</span>
  </div>
);
