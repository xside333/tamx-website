import { useState, useEffect, useRef } from 'react';

export const useResponsiveHeader = () => {
  const [hiddenButtons, setHiddenButtons] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  
  const logoRef = useRef<HTMLAnchorElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const socialRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkLayout = () => {
      // Проверяем мобильную версию
      if (window.innerWidth < 1024) {
        setIsMobile(true);
        setHiddenButtons([]);
        return;
      }
      
      setIsMobile(false);

      if (!logoRef.current || !navRef.current || !socialRef.current || !phoneRef.current || !containerRef.current) {
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const logoRect = logoRef.current.getBoundingClientRect();
      const navRect = navRef.current.getBoundingClientRect();
      const socialRect = socialRef.current.getBoundingClientRect();
      const phoneRect = phoneRef.current.getBoundingClientRect();

      // Рассчитываем расстояния
      const leftGap = navRect.left - logoRect.right;
      const rightGap = socialRect.left - navRect.right;
      const socialToPhoneGap = phoneRect.left - socialRect.right;

      let newHiddenButtons: string[] = [];

      // Если расстояние между соцсетями и телефоном меньше 20px или левый/правый gap меньше 20px
      if (socialToPhoneGap < 20 || leftGap < 20 || rightGap < 20) {
        // Сначала убираем "Опции"
        newHiddenButtons.push('options');
        
        // Пересчитываем после скрытия "Опции"
        // Если все еще мало места, убираем "Наш подход"
        if (socialToPhoneGap < 20 || leftGap < 10 || rightGap < 10) {
          newHiddenButtons.push('approach');
        }
      }

      setHiddenButtons(newHiddenButtons);
    };

    // Проверяем при загрузке и изменении размера окна
    checkLayout();
    
    const resizeObserver = new ResizeObserver(checkLayout);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', checkLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkLayout);
    };
  }, []);

  const shouldHideButton = (buttonName: string) => {
    return hiddenButtons.includes(buttonName);
  };

  const shouldHideSocialText = () => {
    // Убираем текст соцсетей при ширине меньше 1500px или если убираем кнопки навигации
    return window.innerWidth < 1500 || hiddenButtons.length > 0;
  };

  return {
    logoRef,
    navRef,
    socialRef,
    phoneRef,
    containerRef,
    shouldHideButton,
    shouldHideSocialText,
    isMobile,
  };
};
