import { useState, useCallback, useEffect } from 'react';
import type { CarData } from '@/lib/api';

const API_BASE_URL = 'https://api.tarasov-auto.online';
const BASE_UTIL_FEE = 20000;

interface UtilRow {
  id: number;
  year_from: number;
  year_to: number;
  l_from: string;
  l_to: string;
  engine_type: 'ice' | 'ev_hybrid';
  power_from: number;
  power_to: number;
  '2025': string;
  '2026': string;
  '2027': string;
  coefficient: string;
}

interface UseHorsePowerResult {
  defaultHp: number;
  customHp: string;
  isLoading: boolean;
  error: string | null;
  setCustomHp: (value: string) => void;
  calculateUtilFee: (hp: number, isSimulated?: boolean, monthsToPass?: number) => number;
  fetchHpData: () => Promise<void>;
}

export const useHorsePower = (carData: CarData | null): UseHorsePowerResult => {
  const [customHp, setCustomHp] = useState<string>('');
  const [utilTable, setUtilTable] = useState<UtilRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultHp = carData?.meta?.hp || 0;

  // Загрузка данных HP и таблицы util_december_2025 (для ручного вызова)
  const fetchHpData = useCallback(async () => {
    if (!carData?.car_id) return; // Нет ID

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/hp?id=${carData.car_id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUtilTable(data.util_december_2025 || []);
    } catch (err) {
      setError('Не удалось загрузить данные');
    } finally {
      setIsLoading(false);
    }
  }, [carData?.car_id]);

  // Автоматическая загрузка данных при монтировании компонента
  useEffect(() => {
    if (!carData?.car_id || utilTable) return; // Если нет ID или уже загружено - выходим
    
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/hp?id=${carData.car_id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setUtilTable(data.util_december_2025 || []);
      } catch (err) {
        setError('Не удалось загрузить данные');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carData?.car_id]); // Только carData?.car_id в зависимостях

  // Функция расчёта утильсбора (логика из calcCarFull.js)
  const calculateUtilFee = useCallback((hp: number, isSimulated: boolean = false, monthsToPass: number = 0): number => {
    if (!carData || !utilTable || utilTable.length === 0) {
      return 0;
    }

    const fuel = carData.meta?.fuel;
    const volume = carData.meta?.displacement || 0; // см³
    const volumeInLiters = volume / 1000;
    
    // Рассчитываем возраст авто
    const ymStr = carData.meta?.yearmonth?.toString();
    if (!ymStr || ymStr.length < 6) return 0;
    
    const year = parseInt(ymStr.substring(0, 4), 10);
    const month = parseInt(ymStr.substring(4, 6), 10) - 1;
    const baseDate = new Date(year, month, 1);
    const now = new Date();
    const ageInMonths = (now.getFullYear() - baseDate.getFullYear()) * 12 + (now.getMonth() - baseDate.getMonth());
    const ageInYears = Math.floor(ageInMonths / 12);

    // ✅ НОВАЯ ЛОГИКА: Определяем год для выбора коэффициента утиль-сбора
    // В симулированном режиме переносимся в будущее
    let calcDate = new Date();
    if (isSimulated && monthsToPass > 0) {
      calcDate = new Date();
      calcDate.setMonth(calcDate.getMonth() + monthsToPass);
    }
    const utilYear = calcDate.getFullYear();
    const utilColumnName = utilYear.toString(); // "2025", "2026" или "2027"

    // Если топливо "기타" или "Не указан", утильсбор = 0
    if (fuel === "기타" || fuel === "Не указан") {
      return 0;
    }

    // Определяем тип двигателя
    // ICE (ДВС) - корейские и русские значения
    const iceFuelsKorean = [
      "가솔린",              // Бензин
      "디젤",                // Дизель
      "LPG",                 // Газ
      "LPG(일반인 구입)",    // Газ (общая продажа)
      "가솔린+LPG",          // Бензин + Газ
      "수소"                 // Водород
    ];
    
    const iceFuelsRussian = [
      "Бензин",
      "Дизель",
      "Газ",
      "Газ (общая продажа)",
      "Бензин+Газ",
      "Водород"
    ];

    let engineType: 'ice' | 'ev_hybrid';
    if (iceFuelsKorean.includes(fuel || '') || iceFuelsRussian.includes(fuel || '')) {
      engineType = 'ice';
    } else {
      // Все остальные топлива (электро, гибрид и т.д.) = ev_hybrid
      engineType = 'ev_hybrid';
    }

    // Если hp = 0, утильсбор = 0
    if (hp === 0) {
      return 0;
    }

    // Ищем подходящую строку в таблице util_december_2025
    const utilMatch = utilTable.find((r) => {
      // Проверяем возраст авто
      const ageMatch = r.year_from === 0 
        ? (ageInYears >= r.year_from && ageInYears < r.year_to)
        : (ageInYears >= r.year_from && ageInYears <= r.year_to);
      
      // Для гибридов (ev_hybrid) объем не проверяем
      // Для ДВС (ice) проверяем объём в литрах (правило: > от AND <= до)
      const volumeMatch = engineType === 'ev_hybrid' 
        ? true
        : (volumeInLiters > parseFloat(r.l_from) && volumeInLiters <= parseFloat(r.l_to));
      
      // Сравниваем тип двигателя
      const engineMatch = r.engine_type === engineType;
      
      // Сравниваем лошадиные силы (правило: > от AND <= до)
      const powerMatch = hp > r.power_from && hp <= r.power_to;
      
      // Возвращаем результат проверки всех условий
      const allMatch = ageMatch && volumeMatch && engineMatch && powerMatch;
      return allMatch;
    });

    if (utilMatch) {
      // Берём коэффициент из колонки нужного года (2025, 2026 или 2027)
      const coefficientStr = (utilMatch as any)[utilColumnName] || utilMatch['2025'] || '0';
      const coefficient = parseFloat(coefficientStr);
      const utilFee = Math.round(coefficient * BASE_UTIL_FEE);
      return utilFee;
    }

    // Не найдено совпадение
    return 0;
  }, [carData, utilTable]);

  return {
    defaultHp,
    customHp,
    isLoading,
    error,
    setCustomHp,
    calculateUtilFee,
    fetchHpData,
  };
};

