/**
 * Упрощенная формула расчета кредита для UI демонстрации
 * Реальная формула должна быть получена от бэкенда
 */
export interface FinanceParams {
  /** Стоимость автомобиля в рублях */
  carPrice: number;
  /** Первоначальный взнос в рублях */
  downPayment: number;
  /** Срок кредита в месяцах */
  termMonths: number;
  /** Годовая процентная ставка в процентах (например, 12.5) */
  annualRate: number;
}

export interface FinanceResult {
  /** Сумма кредита в рублях */
  loanAmount: number;
  /** Ежемесячный платеж в рублях */
  monthlyPayment: number;
  /** Общая сумма к доплате в рублях */
  totalAmount: number;
  /** Переплата по кредиту в рублях */
  overpayment: number;
}

/**
 * Упрощенный расчет ежемесячного платежа по кредиту
 * Формула аннуитетного платежа: PMT = PV * r * (1 + r)^n / ((1 + r)^n - 1)
 * где:
 * - PV (Present Value) - сумма кредита
 * - r - месячная процентная ставка
 * - n - количество платежей (месяцев)
 */
export function calcMonthlySimple(params: FinanceParams): FinanceResult {
  const { carPrice, downPayment, termMonths, annualRate } = params;

  // Валидация входных данных
  if (carPrice <= 0) {
    throw new Error('Стоимость автомобиля должна быть больше 0');
  }
  if (downPayment < 0 || downPayment > carPrice) {
    throw new Error('Первоначальный взнос должен быть от 0 до стоимости автомобиля');
  }
  if (termMonths <= 0 || termMonths > 360) {
    throw new Error('Срок кредита должен быть от 1 до 360 месяцев');
  }
  if (annualRate < 0 || annualRate > 100) {
    throw new Error('Процентная ставка должна быть от 0 до 100%');
  }

  const loanAmount = carPrice - downPayment;

  // Если первоначальный взнос равен стоимости автомобиля
  if (loanAmount <= 0) {
    return {
      loanAmount: 0,
      monthlyPayment: 0,
      totalAmount: downPayment,
      overpayment: 0,
    };
  }

  // Если процентная ставка 0%
  if (annualRate === 0) {
    const monthlyPayment = loanAmount / termMonths;
    return {
      loanAmount,
      monthlyPayment,
      totalAmount: carPrice,
      overpayment: 0,
    };
  }

  // Расчет аннуитетного платежа
  const monthlyRate = annualRate / 100 / 12; // Месячная процентная ставка
  const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, termMonths);
  
  const monthlyPayment = loanAmount * (numerator / denominator);
  const totalAmount = downPayment + (monthlyPayment * termMonths);
  const overpayment = totalAmount - carPrice;

  return {
    loanAmount,
    monthlyPayment: Math.round(monthlyPayment),
    totalAmount: Math.round(totalAmount),
    overpayment: Math.round(overpayment),
  };
}

/**
 * Форматировать сумму в рублях для отображения
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Получить предустановленные варианты первоначального взноса
 */
export function getDownPaymentOptions(carPrice: number): Array<{ label: string; value: number; percentage: number }> {
  const options = [10, 20, 30, 50];
  
  return options.map(percentage => ({
    label: `${percentage}%`,
    value: Math.round(carPrice * percentage / 100),
    percentage,
  }));
}

/**
 * Получить предустановленные варианты срока кредита
 */
export function getTermOptions(): Array<{ label: string; value: number }> {
  return [
    { label: '1 год', value: 12 },
    { label: '2 года', value: 24 },
    { label: '3 года', value: 36 },
    { label: '4 года', value: 48 },
    { label: '5 лет', value: 60 },
    { label: '7 лет', value: 84 },
  ];
}
