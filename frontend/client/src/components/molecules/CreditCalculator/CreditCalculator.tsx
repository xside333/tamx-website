import React, { useMemo, useState } from 'react';
import { Button } from '../../atoms';
import { calcMonthlySimple } from '../../../lib/finance';

export interface CreditCalculatorProps {
  price: number;
  minDownPayment?: number; // default 100000
  maxTermMonths?: number;  // default 96
  monthlyRate?: number;    // default 0.02458 (2.458% per month)
  onOpenLead?: (data: { title: string; btn: string; downPayment: number; loanAmount: number; termMonths: number; monthlyPayment: number; }) => void;
}

const NBSP = '\u00A0';
const CURRENT_UI_INITIAL_DOWN = 1072510; // округлённое начальное из текущего UI
const CURRENT_UI_INITIAL_TERM_YEARS = 5; // текущее положение слайдера (годы)
const MIN_LOAN_AMOUNT = 100000;

const formatRub = (v: number) => `${new Intl.NumberFormat('ru-RU').format(Math.round(v))}${NBSP}₽`;

const pluralizeMonthsRightLabel = (maxTermMonths: number) => {
  if (maxTermMonths % 12 === 0) {
    const years = Math.floor(maxTermMonths / 12);
    return `${years} лет`;
  }
  return `${maxTermMonths} месяцев`;
};

const CreditCalculator: React.FC<CreditCalculatorProps> = ({
  price,
  minDownPayment = 100000,
  maxTermMonths = 96,
  monthlyRate = 0.02458,
  onOpenLead,
}) => {
  // Границы первоначального взноса с учетом минимальной суммы кредита
  const downMin = minDownPayment;
  const downMax = useMemo(() => {
    if (!price || price <= 0) return Math.max(downMin, 0);
    return Math.max(price - MIN_LOAN_AMOUNT, downMin);
  }, [price, downMin]);

  const initialDownPayment = useMemo(() => {
    const fifty = Math.round((price || 0) * 0.5);
    const base = Math.max(minDownPayment, fifty);
    return Math.min(base, downMax);
  }, [price, minDownPayment, downMax]);

  const initialTermMonths = useMemo(() => {
    // конвертировать текущее положение (в годах) в месяцы
    const months = CURRENT_UI_INITIAL_TERM_YEARS * 12;
    // клиппинг к диапазону
    return Math.min(Math.max(1, months), maxTermMonths);
  }, [maxTermMonths]);

  const [downPayment, setDownPayment] = useState<number>(initialDownPayment);
  const [termMonths, setTermMonths] = useState<number>(initialTermMonths);

  const loanAmount = useMemo(() => {
    if (!price || price <= 0) return MIN_LOAN_AMOUNT;
    const p = Math.max(price - (downPayment || 0), MIN_LOAN_AMOUNT);
    return p;
  }, [price, downPayment]);

  // Используем единую функцию расчета из finance.ts
  const payment = useMemo(() => {
    if (!price || price <= 0 || loanAmount <= 0 || termMonths <= 0) return 0;
    
    try {
      // Конвертируем месячную ставку в годовую для единой функции
      const annualRate = monthlyRate * 12 * 100; // 0.02458 * 12 * 100 = ~29.5%
      const result = calcMonthlySimple({
        carPrice: price,
        downPayment,
        termMonths,
        annualRate,
      });
      return result.monthlyPayment;
    } catch {
      return 0;
    }
  }, [price, downPayment, termMonths, monthlyRate, loanAmount]);

  const handleDownChange = (value: number) => {
    const clipped = Math.min(Math.max(value, downMin), downMax);
    setDownPayment(clipped);
  };

  const handleTermChange = (value: number) => {
    const clipped = Math.min(Math.max(value, 1), maxTermMonths);
    setTermMonths(clipped);
  };

  const rightLabel = pluralizeMonthsRightLabel(maxTermMonths);

  const isDownDisabled = !price || price <= downMin;

  const clampedDown = Math.min(Math.max(downPayment, downMin), downMax);
  const downPercent = useMemo(() => {
    const range = downMax - downMin;
    if (range <= 0) return 0;
    return ((clampedDown - downMin) / range) * 100;
  }, [clampedDown, downMin, downMax]);

  const termPercent = useMemo(() => {
    const range = maxTermMonths - 1;
    if (range <= 0) return 0;
    return ((termMonths - 1) / range) * 100;
  }, [termMonths, maxTermMonths]);

  const formatTermSelected = (n: number) => {
    return n % 12 === 0 ? `${Math.floor(n / 12)} лет` : `${n} мес`;
  };

  return (
    <section id="credit-calculator" className="bg-surface rounded-lg lg:rounded-[32px] p-4 lg:p-8">
      <div className="mb-6 lg:mb-8">
        <h2 className="text-primary text-xl lg:text-2xl font-bold leading-tight lg:leading-[28.8px] mb-4">
          Быстрый и простой онлайн-кредит
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-primary text-sm lg:text-base">Одобрение от 10 минут</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left: Form controls */}
        <div className="border border-muted rounded-lg lg:rounded-[24px] p-4 lg:p-8 space-y-6 lg:space-y-8">
          <div>
            <div className="relative mb-4">
              <label className="text-secondary text-sm block">Первоначальный взнос</label>
              <span className="absolute right-0 top-0 text-secondary text-sm">{formatRub(clampedDown)}</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={downMin}
                max={downMax}
                step={1000}
                value={Math.min(Math.max(downPayment, downMin), downMax)}
                onChange={(e) => handleDownChange(Number(e.target.value))}
                disabled={isDownDisabled}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-secondary text-sm mt-2">
                <span>{formatRub(downMin)}</span>
                <span>{formatRub(downMax)}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="relative mb-4">
              <label className="text-secondary text-sm block">Срок кредита</label>
              <span className="absolute right-0 top-0 text-secondary text-sm">{formatTermSelected(termMonths)}</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={1}
                max={maxTermMonths}
                step={1}
                value={termMonths}
                onChange={(e) => handleTermChange(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-secondary text-sm mt-2">
                <span>1 Месяц</span>
                <span>{rightLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Result */}
        <div className="bg-surface-secondary rounded-lg lg:rounded-[24px] p-4 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <span className="text-secondary text-sm">Наше предложение</span>
          </div>

          <div className="bg-surface rounded-lg lg:rounded-[16px] p-4 lg:p-6 space-y-4 lg:space-y-6">
            <div>
              <div className="text-secondary text-base font-medium mb-2">Сумма кредита</div>
              <div className="text-primary text-lg lg:text-[20px] font-bold">{formatRub(loanAmount)}</div>
            </div>

            <div>
              <div className="text-secondary text-base font-medium mb-2">Платеж</div>
              <div className="text-primary text-lg lg:text-[20px] font-bold">от {formatRub(payment)}/мес</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
            <Button
              variant="primary"
              className="flex-1 px-4 lg:px-8 py-3 lg:py-4 btn-equal"
              onClick={() => onOpenLead?.({
                title: 'Заявка на кредит',
                btn: 'Получить одобрение',
                downPayment: clampedDown,
                loanAmount,
                termMonths,
                monthlyPayment: payment,
              })}
            >
              Получить одобрение
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CreditCalculator;
