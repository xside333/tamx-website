import React, { useState, useMemo } from 'react';
import { ApiCar } from '../../../types';
import { cn } from '../../../lib/utils';
import { Button, Icon, Input } from '../../atoms';
import { Select } from '../../molecules';
import { 
  calcMonthlySimple, 
  formatCurrency, 
  getDownPaymentOptions, 
  getTermOptions,
  FinanceParams 
} from '../../../lib/finance';

interface FinanceBlockProps {
  car: ApiCar;
  className?: string;
}

/**
 * Блок расчета кредита для покупки автомобиля
 * Позволяет настроить параметры кредита и посмотреть расчет
 */
export const FinanceBlock: React.FC<FinanceBlockProps> = ({
  car,
  className,
}) => {
  const carPrice = car.current?.usdt?.total || car.simulated?.usdt?.total || car.price || 0;
  
  // Состояние формы
  const [downPayment, setDownPayment] = useState(Math.round(carPrice * 0.2)); // 20% по умолчанию
  const [termMonths, setTermMonths] = useState(36); // 3 года по умолчанию
  const [annualRate, setAnnualRate] = useState(12.5); // 12.5% по умолчанию
  
  // Опции для выпадающих списков
  const downPaymentOptions = useMemo(() => getDownPaymentOptions(carPrice), [carPrice]);
  const termOptions = useMemo(() => getTermOptions(), []);
  
  // Расчет кредита
  const financeResult = useMemo(() => {
    if (carPrice <= 0) return null;
    
    try {
      const params: FinanceParams = {
        carPrice,
        downPayment,
        termMonths,
        annualRate,
      };
      
      return calcMonthlySimple(params);
    } catch (error) {
      return null;
    }
  }, [carPrice, downPayment, termMonths, annualRate]);

  // Обработчики изменений
  const handleDownPaymentChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setDownPayment(Math.max(0, Math.min(numValue, carPrice)));
  };

  const handleDownPaymentOptionChange = (value: string) => {
    const option = downPaymentOptions.find(opt => opt.value.toString() === value);
    if (option) {
      setDownPayment(option.value);
    }
  };

  const handleTermChange = (value: string) => {
    const option = termOptions.find(opt => opt.value.toString() === value);
    if (option) {
      setTermMonths(option.value);
    }
  };

  const handleRateChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setAnnualRate(Math.max(0, Math.min(numValue, 50))); // Ограничиваем от 0% до 50%
  };

  const handleGetCredit = () => {
    // TODO: Реализовать заявку на кредит
  };

  if (carPrice <= 0) {
    return (
      <div className={cn('p-6 bg-surface rounded-lg border border-border', className)}>
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
          <Icon name="calculator" className="w-5 h-5 mr-2" />
          Кредитный калькулятор
        </h3>
        <p className="text-secondary">Цена автомобиля не указана</p>
      </div>
    );
  }

  return (
    <div className={cn('p-6 bg-surface rounded-lg border border-border', className)}>
      <h3 className="text-lg font-semibold text-primary mb-6 flex items-center">
        <Icon name="calculator" className="w-5 h-5 mr-2" />
        Кредитный калькулятор
      </h3>
      
      <div className="space-y-6">
        {/* Стоимость автомобиля */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">
            Стоимость автомобиля
          </label>
          <div className="text-xl font-bold text-primary">
            {formatCurrency(carPrice)}
          </div>
        </div>

        {/* Первоначальный взнос */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-secondary">
            Первоначальный взнос
          </label>
          
          {/* Быстрые варианты */}
          <div className="grid grid-cols-4 gap-2">
            {downPaymentOptions.map((option) => (
              <button
                key={option.percentage}
                onClick={() => setDownPayment(option.value)}
                className={cn(
                  'text-xs py-2 px-2 rounded border transition-colors',
                  downPayment === option.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border hover:border-accent/50'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          
          {/* Ввод суммы */}
          <Input
            type="number"
            value={downPayment.toString()}
            onChange={handleDownPaymentChange}
            placeholder="Введите сумму"
            className="w-full"
          />
          
          <div className="text-sm text-secondary">
            {Math.round((downPayment / carPrice) * 100)}% от стоимости
          </div>
        </div>

        {/* Срок кредита */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">
            Срок кредита
          </label>
          <Select
            options={termOptions}
            value={termMonths.toString()}
            onChange={handleTermChange}
            placeholder="Выберите срок"
          />
        </div>

        {/* Процентная ставка */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">
            Процентная ставка, % годовых
          </label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="50"
            value={annualRate.toString()}
            onChange={handleRateChange}
            placeholder="Введите ставку"
            className="w-full"
          />
        </div>

        {/* Результат расчета */}
        {financeResult && (
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary">Сумма кредита:</span>
                <span className="font-medium text-primary">
                  {formatCurrency(financeResult.loanAmount)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary">Ежемесячный платеж:</span>
                <span className="text-xl font-bold text-accent">
                  {formatCurrency(financeResult.monthlyPayment)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary">Общая сумма:</span>
                <span className="font-medium text-primary">
                  {formatCurrency(financeResult.totalAmount)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary">Переплата:</span>
                <span className="font-medium text-primary">
                  {formatCurrency(financeResult.overpayment)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Кнопка заявки */}
        <Button
          onClick={handleGetCredit}
          className="w-full"
          size="lg"
          disabled={!financeResult}
        >
          <Icon name="credit-card" className="w-5 h-5 mr-2" />
          Подать заявку на кредит
        </Button>

        {/* Disclaimer */}
        <p className="text-xs text-muted leading-relaxed">
          * Расчет является предварительным. Окончательные условия кредита определяются банком 
          после рассмотрения заявки и могут отличаться от указанных.
        </p>
      </div>
    </div>
  );
};
