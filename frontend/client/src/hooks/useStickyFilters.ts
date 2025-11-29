import { useRef } from 'react';

export const useStickyFilters = () => {
  const actionBarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getActionBarClasses = () => {
    // Простой sticky для всех экранов с правильным отступом
    return "bg-surface rounded-xl p-5 sticky bottom-0 lg:bottom-2";
  };

  const getContainerClasses = () => {
    return "w-full lg:w-80 space-y-2";
  };

  return {
    actionBarRef,
    containerRef,
    getActionBarClasses,
    getContainerClasses,
  };
};
