import { useState, useEffect } from 'react';

/**
 * Хук для определения мобильного устройства
 * Использует lg breakpoint из Tailwind (1024px)
 */
export const useMobile = (breakpoint: number = 1024): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Проверяем при первой загрузке
    checkIsMobile();

    // Добавляем слушатель изменения размера окна
    window.addEventListener('resize', checkIsMobile);

    // Очищаем слушатель при размонтировании
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, [breakpoint]);

  return isMobile;
};
