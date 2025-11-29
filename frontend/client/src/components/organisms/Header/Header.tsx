import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BaseComponentProps, NavItem, ContactInfo } from '../../../types';
import { cn, formatPhone } from '../../../lib/utils';
import { Button, Icon } from '../../atoms';

interface HeaderProps extends BaseComponentProps {
  navItems?: NavItem[];
  contactInfo?: ContactInfo;
  onMobileMenuToggle?: () => void;
}

const defaultNavItems: NavItem[] = [
  { label: 'Каталог', href: '/catalog' },
  { label: 'Наш подход', href: 'https://tarasov-auto.ru/approach', external: true },
  { label: 'Опции', href: 'https://tarasov-auto.ru/options', external: true },
  { label: 'О компании', href: 'https://tarasov-auto.ru/about', external: true },
  { label: 'Контакты', href: 'https://tarasov-auto.ru/contacts', external: true },
];

const defaultContactInfo: ContactInfo = {
  phone: '+7 953 777 34 56',
  city: 'Новосибирск',
  socialLinks: {
    youtube: 'https://www.youtube.com/@tarasov_auto',
    whatsapp: 'https://api.whatsapp.com/send/?phone=79537773456&text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5%21+%D0%9D%D1%83%D0%B6%D0%B5%D0%BD+%D0%B0%D0%B2%D1%82%D0%BE%D0%BC%D0%BE%D0%B1%D0%B8%D0%BB%D1%8C+&type=phone_number&app_absent=0',
    telegram: 'https://t.me/autotarasov',
  },
};

const Header: React.FC<HeaderProps> = ({
  navItems = defaultNavItems,
  contactInfo = defaultContactInfo,
  onMobileMenuToggle,
  className,
  ...props
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [hideOptions, setHideOptions] = useState(false); // index 2 among navItems
  const [hideApproach, setHideApproach] = useState(false); // index 1 among navItems
  const BASE_GAP = 24; // px (gap-6)
  const MIN_GAP = 10; // px
  const [gapPx, setGapPx] = useState<number>(BASE_GAP);
  const widthCacheRef = useRef<number[]>([]);

  const computeFit = () => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      // Desktop logic only
      if (gapPx !== BASE_GAP) setGapPx(BASE_GAP);
      if (hideOptions) setHideOptions(false);
      if (hideApproach) setHideApproach(false);
      return;
    }

    const available = container.clientWidth;
    const children = Array.from(content.children) as HTMLElement[];

    const widths = children.map((el, i) => {
      const w = el.offsetWidth;
      if (w > 0) widthCacheRef.current[i] = w;
      return widthCacheRef.current[i] ?? w;
    });

    const countAll = widths.length;
    const sumAll = widths.reduce((a, b) => a + b, 0);

    const sumExcluding = (exclude: Set<number>) =>
      widths.reduce((acc, w, i) => (exclude.has(i) ? acc : acc + w), 0);

    const tryFit = (exclude: Set<number>) => {
      const itemsCount = countAll - exclude.size;
      if (itemsCount <= 0) return null;
      const sum = sumExcluding(exclude);
      const minTotal = sum + MIN_GAP * Math.max(0, itemsCount - 1);
      const maxTotal = sum + BASE_GAP * Math.max(0, itemsCount - 1);

      if (maxTotal <= available) return { gap: BASE_GAP, exclude };
      if (minTotal > available) return null;

      const idealGap = Math.floor((available - sum) / Math.max(1, itemsCount - 1));
      const clampedGap = Math.max(MIN_GAP, Math.min(BASE_GAP, idealGap));
      return { gap: clampedGap, exclude };
    };

    // Indices in children for nav items match order in navItems
    const optionsChildIndex = 2; // "Опции"
    const approachChildIndex = 1; // "Наш подход"

    const scenarios = [
      new Set<number>(),
      new Set<number>([optionsChildIndex]),
      new Set<number>([optionsChildIndex, approachChildIndex]),
    ];

    let result: { gap: number; exclude: Set<number> } | null = null;
    for (const ex of scenarios) {
      const r = tryFit(ex);
      if (r) { result = r; break; }
    }

    if (!result) {
      // Fallback: hide both and keep min gap
      result = { gap: MIN_GAP, exclude: new Set<number>([optionsChildIndex, approachChildIndex]) };
    }

    const nextHideOptions = result.exclude.has(optionsChildIndex);
    const nextHideApproach = result.exclude.has(approachChildIndex);

    if (gapPx !== result.gap) setGapPx(result.gap);
    if (hideOptions !== nextHideOptions) setHideOptions(nextHideOptions);
    if (hideApproach !== nextHideApproach) setHideApproach(nextHideApproach);
  };

  useLayoutEffect(() => {
    computeFit();
    const ro = new ResizeObserver(() => computeFit());
    if (containerRef.current) ro.observe(containerRef.current);
    if (contentRef.current) ro.observe(contentRef.current);
    const onResize = () => computeFit();
    window.addEventListener('resize', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    onMobileMenuToggle?.();
  };

  const headerClasses = cn(
    'bg-background',
    'py-4 lg:py-7',
    className
  );

  return (
    <header className={headerClasses} {...props}>
      <div className="max-w-[1512px] mx-auto px-4 lg:px-16">
        <div className="bg-surface rounded-xl p-3 lg:p-0 lg:bg-transparent">
          <div className="flex items-center justify-between gap-5">
          {/* Logo */}
          <a href="/catalog" className="flex-shrink-0 flex items-center">
            <img
              src="/logo_black.png"
              alt="Tarasov Auto Logo"
              className="h-[40px] lg:h-[60px] w-auto object-contain"
            />
          </a>

          {/* Desktop Navigation */}
          <nav ref={containerRef} className="hidden lg:flex flex-1 items-center justify-center bg-surface rounded-xl px-6 py-4 h-[40px] lg:h-[60px] transition-all duration-300 overflow-hidden">
            <div
              ref={contentRef}
              className="flex items-center whitespace-nowrap mx-auto gap-[var(--nav-gap)]"
              style={{ ['--nav-gap' as any]: `${gapPx}px` }}
            >
              {navItems.map((item, index) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'font-medium text-sm transition-all duration-300 px-5 whitespace-nowrap no-underline hover:no-underline',
                    index === 0 ? 'text-accent' : 'text-secondary hover:text-accent',
                    index === 2 && hideOptions && 'hidden',
                    index === 1 && hideApproach && 'hidden'
                  )}
                  {...(item.external && { target: '_blank', rel: 'noopener noreferrer' })}
                >
                  {item.label}
                </a>
              ))}

              {contactInfo.socialLinks.youtube && (
                <a
                  href={contactInfo.socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center px-5 text-secondary hover:text-accent transition-all duration-300 no-underline"
                  aria-label="YouTube"
                >
                  <Icon name="youtube" size="lg" />
                </a>
              )}
              {contactInfo.socialLinks.whatsapp && (
                <a
                  href={contactInfo.socialLinks.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center px-5 text-secondary hover:text-accent transition-all duration-300 no-underline"
                  aria-label="WhatsApp"
                >
                  <Icon name="whatsapp" size="md" />
                </a>
              )}
              {contactInfo.socialLinks.telegram && (
                <a
                  href={contactInfo.socialLinks.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center px-5 text-secondary hover:text-accent transition-all duration-300 no-underline"
                  aria-label="Telegram"
                >
                  <Icon name="telegram" size="md" className="w-[22px] h-[22px]" />
                </a>
              )}
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            className="lg:hidden bg-surface rounded-xl p-4 w-[48px] h-[48px]"
            onClick={handleMobileMenuToggle}
          >
            <Icon name={isMobileMenuOpen ? 'close' : 'menu'} size="md" />
          </Button>

          {/* Desktop Contact Info */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="bg-surface rounded-xl px-6 py-4 h-[40px] lg:h-[60px] flex items-center transition-all duration-300">
              <a
                href={`tel:${contactInfo.phone}`}
                className="flex items-center gap-2 text-secondary hover:text-accent transition-all duration-300 no-underline hover:no-underline"
              >
                <Icon name="phone" size="md" />
                <span className="text-sm font-medium whitespace-nowrap">
                  {formatPhone(contactInfo.phone)}
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden mt-4 max-w-[1512px] mx-auto px-4"><div className="bg-surface rounded-xl p-4 space-y-4">
          {/* Navigation Links */}
          <nav className="space-y-3">
            {navItems.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  'block py-2 px-4 rounded-lg font-medium text-sm transition-all duration-300 no-underline hover:no-underline',
                  index === 0
                    ? 'text-accent bg-accent/10'
                    : 'text-secondary hover:text-accent hover:bg-surface-secondary'
                )}
                {...(item.external && { target: '_blank', rel: 'noopener noreferrer' })}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Contact Info */}
          <div className="border-t border-muted pt-4">
            <a
              href={`tel:${contactInfo.phone}`}
              className="flex items-center space-x-2 text-accent hover:text-accent/80 transition-all duration-300 no-underline hover:no-underline"
            >
              <Icon name="phone" size="sm" color="var(--color-accent)" />
              <span className="text-sm font-medium">
                {formatPhone(contactInfo.phone)}
              </span>
            </a>
          </div>
        </div>
        </div>
      )}
    </header>
  );
};

export default Header;
