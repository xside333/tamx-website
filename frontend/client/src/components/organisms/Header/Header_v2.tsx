import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../../lib/utils';
import { Icon, Dropdown } from '../../atoms';
import { LeadModal } from '../../molecules/LeadModal';
import { MapModal } from '../../molecules/MapModal';
import { useHierarchicalFilters } from '../../../hooks/useHierarchicalFilters';

/* ─── Static data ─── */

const NAV_LINKS = [
  { label: 'О нас', href: 'https://tamx.ru/about' },
  { label: 'Договоры', href: 'https://tamx.ru/contracts' },
  { label: 'Контакты', href: 'https://tamx.ru/contacts' },
  { label: 'Журнал', href: 'https://tamx.ru/journal' },
  { label: 'Отзывы', href: 'https://tamx.ru/reviews' },
  { label: 'Выполненные заказы', href: 'https://tamx.ru/price-catalog' },
] as const;

const MOBILE_MENU_LINKS = [
  { label: 'Авторизация', href: 'https://tamx.ru/page-login/' },
  { label: 'Купить', href: 'https://auto.tamx.ru/catalog' },
  { label: 'Продать', href: 'https://tamx.ru/buyout' },
  { label: 'Кредит', href: 'https://tamx.ru/credit' },
  { label: 'Сервис', href: 'https://tamx.ru/services' },
  { label: 'О нас', href: 'https://tamx.ru/about' },
  { label: 'Договоры', href: 'https://tamx.ru/contracts' },
  { label: 'Контакты', href: 'https://tamx.ru/contacts' },
  { label: 'Журнал', href: 'https://tamx.ru/journal' },
  { label: 'Отзывы', href: 'https://tamx.ru/reviews' },
  { label: 'Выполненные заказы', href: 'https://tamx.ru/price-catalog' },
] as const;

const SERVICES_LINKS = [
  { label: 'Продать', href: 'https://tamx.ru/buyout' },
  { label: 'Все услуги', href: 'https://tamx.ru/services' },
  { label: 'Кредит', href: 'https://tamx.ru/credit' },
  { label: 'Выкуп / Продать', href: 'https://tamx.ru/buyout' },
  { label: 'Акции', href: 'https://tamx.ru/promotions' },
] as const;

const BUY_SECTIONS: { label: string; href: string; disabled?: boolean; badge?: string }[] = [
  { label: 'Новые авто', href: 'https://auto.tamx.ru/catalog?yearFrom=2025&sortBy=price_asc&page=1' },
  { label: 'Авто с пробегом', href: 'https://auto.tamx.ru/catalog' },
  { label: 'Авто под заказ', href: 'https://auto.tamx.ru/catalog' },
  { label: 'Мотоциклы', href: '#', disabled: true, badge: 'Скоро' },
  { label: 'Снегоходы', href: '#', disabled: true, badge: 'Скоро' },
  { label: 'Гидроциклы', href: '#', disabled: true, badge: 'Скоро' },
];

const POPULAR_TAGS = [
  { label: 'до 1 млн', href: 'https://auto.tamx.ru/catalog?priceTo=1000000&sortBy=date_desc&page=1' },
  { label: 'до 2 млн', href: 'https://auto.tamx.ru/catalog?priceTo=2000000&sortBy=date_desc&page=1' },
  { label: 'до 100 тыс км', href: 'https://auto.tamx.ru/catalog?mileageTo=100000&sortBy=date_desc&page=1' },
  { label: '4вд', href: 'https://auto.tamx.ru/catalog?driveType=awd&sortBy=date_desc&page=1' },
  { label: 'дизель', href: 'https://auto.tamx.ru/catalog?fuelType=diesel&sortBy=date_desc&page=1' },
  { label: 'до 3 млн', href: 'https://auto.tamx.ru/catalog?priceTo=3000000&sortBy=date_desc&page=1' },
  { label: 'до 70 тыс км', href: 'https://auto.tamx.ru/catalog?mileageTo=70000&sortBy=date_desc&page=1' },
  { label: 'черный кузов', href: 'https://auto.tamx.ru/catalog?bodyColor=black&sortBy=date_desc&page=1' },
] as const;

const SOCIAL_LINKS = [
  { name: 'vk' as const, href: 'https://vk.com/tarasov_auto' },
  { name: 'youtube' as const, href: 'https://youtube.com/@tarasov_auto' },
  { name: 'telegram' as const, href: 'https://t.me/tarasov_auto' },
  { name: 'whatsapp' as const, href: 'http://wa.me/+79537773456' },
  { name: 'max' as const, href: 'https://max.ru/join/1-XyB0uZw5QT3ub-BcCuRXxn2XK7wj-dqLzr_nkAHG4' },
  { name: 'tiktok' as const, href: 'https://www.tiktok.com/@tarasov_auto' },
] as const;

const LEAD_CAR_STUB = {
  id: 'header-order',
  name: 'Заказать машину',
  price: 0,
  link: 'https://tamx.ru/',
};

/* ─── Inline picker dropdown ─── */

interface PickerDropdownProps {
  options: string[];
  search: string;
  onSearch: (v: string) => void;
  onSelect: (v: string) => void;
  placeholder: string;
}

const PickerDropdown: React.FC<PickerDropdownProps> = ({ options, search, onSearch, onSelect, placeholder }) => {
  const filtered = search.trim()
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[var(--header-v2-border)] rounded-sm shadow-lg z-50 max-h-52 flex flex-col">
      <input
        type="text"
        autoFocus
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="w-full h-8 px-3 text-sm border-b border-[var(--header-v2-border)] bg-white text-[var(--header-v2-text-dark)] focus:outline-none"
      />
      <ul className="overflow-y-auto flex-1">
        {filtered.map((o) => (
          <li key={o}>
            <button
              type="button"
              onClick={() => onSelect(o)}
              className="w-full text-left px-3 py-1.5 text-sm text-[var(--header-v2-text-dark)] hover:bg-[var(--header-v2-hover-bg)] transition-colors"
            >
              {o}
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-3 py-2 text-sm text-[var(--header-v2-text-color)]">Не найдено</li>
        )}
      </ul>
    </div>
  );
};

/* ─── Quick Search ─── */

interface QuickSearchProps {
  brandOptions: string[];
  getModelsForBrand: (brand: string) => { value: string; label: string }[];
}

const QuickSearch: React.FC<QuickSearchProps> = ({ brandOptions, getModelsForBrand }) => {
  const [tab, setTab] = useState<'all' | 'korea' | 'china'>('all');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [showBrands, setShowBrands] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const brandRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) setShowBrands(false);
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setShowModels(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const modelOptions = brand ? getModelsForBrand(brand).map((m) => m.value) : [];

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (brand.trim()) params.set('brand', brand.trim());
    if (model.trim()) params.set('model', model.trim());
    if (priceFrom) params.set('priceFrom', priceFrom);
    if (priceTo) params.set('priceTo', priceTo);
    if (tab === 'korea') params.set('source', 'K');
    else if (tab === 'china') params.set('source', 'C');
    params.set('sortBy', 'date_desc');
    params.set('page', '1');
    window.location.href = `https://auto.tamx.ru/catalog?${params.toString()}`;
  };

  const tabClass = (active: boolean) =>
    cn(
      'px-3 py-1.5 text-xs font-medium rounded-sm cursor-pointer transition-colors',
      active
        ? 'bg-[var(--header-v2-brand)] text-white'
        : 'text-[var(--header-v2-text-color)] hover:text-[var(--header-v2-text-dark)]',
    );

  const inputCls =
    'w-full h-9 px-3 text-sm border border-[var(--header-v2-border)] rounded-sm bg-white text-[var(--header-v2-text-dark)] focus:outline-none focus:ring-1 focus:ring-[var(--header-v2-brand)]';

  return (
    <div>
      <h4 className="text-base font-semibold text-[var(--header-v2-text-dark)] mb-2">Быстрый поиск</h4>
      <div className="flex gap-1 mb-3">
        <button type="button" className={tabClass(tab === 'all')} onClick={() => setTab('all')}>Все</button>
        <button type="button" className={tabClass(tab === 'korea')} onClick={() => setTab('korea')}>Корея</button>
        <button type="button" className={tabClass(tab === 'china')} onClick={() => setTab('china')}>Китай</button>
      </div>
      <div className="flex flex-col gap-2">
        {/* Brand picker */}
        <div ref={brandRef} className="relative">
          <input
            type="text"
            readOnly
            placeholder="Марка"
            value={brand}
            onClick={() => { setShowBrands(true); setShowModels(false); setBrandSearch(''); }}
            className={cn(inputCls, 'cursor-pointer')}
          />
          {showBrands && (
            <PickerDropdown
              options={brandOptions}
              search={brandSearch}
              onSearch={setBrandSearch}
              placeholder="Поиск марки…"
              onSelect={(v) => {
                setBrand(v);
                setModel('');
                setShowBrands(false);
              }}
            />
          )}
        </div>

        {/* Model picker */}
        <div ref={modelRef} className="relative">
          <input
            type="text"
            readOnly
            placeholder="Модель"
            value={model}
            onClick={() => {
              if (brand) { setShowModels(true); setShowBrands(false); setModelSearch(''); }
            }}
            className={cn(inputCls, brand ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed')}
          />
          {showModels && brand && (
            <PickerDropdown
              options={modelOptions}
              search={modelSearch}
              onSearch={setModelSearch}
              placeholder="Поиск модели…"
              onSelect={(v) => {
                setModel(v);
                setShowModels(false);
              }}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Цена от"
            value={priceFrom}
            onChange={(e) => setPriceFrom(e.target.value.replace(/\D/g, ''))}
            className={inputCls}
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder="Цена до"
            value={priceTo}
            onChange={(e) => setPriceTo(e.target.value.replace(/\D/g, ''))}
            className={inputCls}
          />
        </div>
        <button type="button" className="header-v2-cta-btn h-9 w-full text-sm" onClick={handleSearch}>
          Показать предложения
        </button>
      </div>
    </div>
  );
};

/* ─── Buy Mega-Menu ─── */

interface BuyMegaMenuProps {
  brandOptions: string[];
  getModelsForBrand: (brand: string) => { value: string; label: string }[];
}

const BuyMegaMenu: React.FC<BuyMegaMenuProps> = ({ brandOptions, getModelsForBrand }) => (
  <div className="header-v2-dropdown min-w-[740px] grid grid-cols-[180px_1fr_220px] gap-6">
    <div>
      <h4 className="text-base font-semibold text-[var(--header-v2-text-dark)] mb-2">Разделы</h4>
      <ul className="space-y-1.5">
        {BUY_SECTIONS.map((s) => (
          <li key={s.label}>
            {s.disabled ? (
              <span className="text-[var(--color-text-disabled)] flex items-center gap-1.5 text-base">
                {s.label}
                {s.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[var(--color-surface-secondary)] rounded text-[var(--header-v2-text-color)]">
                    {s.badge}
                  </span>
                )}
              </span>
            ) : (
              <a href={s.href} className="header-v2-mega-link">
                {s.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
    <div>
      <h4 className="text-base font-semibold text-[var(--header-v2-text-dark)] mb-2">Популярное</h4>
      <div className="flex flex-wrap gap-1.5">
        {POPULAR_TAGS.map((t) => (
          <a key={t.label} href={t.href} className="header-v2-mega-tag">
            {t.label}
          </a>
        ))}
      </div>
    </div>
    <QuickSearch brandOptions={brandOptions} getModelsForBrand={getModelsForBrand} />
  </div>
);

/* ─── Services dropdown ─── */

const ServicesMenu: React.FC = () => (
  <div className="header-v2-dropdown min-w-[200px]">
    <ul className="space-y-1.5">
      {SERVICES_LINKS.map((s) => (
        <li key={s.label}>
          <a href={s.href} className="header-v2-mega-link block py-1">
            {s.label}
          </a>
        </li>
      ))}
    </ul>
  </div>
);

/* ─── Mobile side panel ─── */

interface MobilePanelProps {
  open: boolean;
  onClose: () => void;
}

const MobilePanel: React.FC<MobilePanelProps> = ({ open, onClose }) => {
  const [search, setSearch] = useState('');

  if (!open) return null;

  const filtered = search.trim()
    ? MOBILE_MENU_LINKS.filter((l) => l.label.toLowerCase().includes(search.toLowerCase()))
    : MOBILE_MENU_LINKS;

  return (
    <div className="header-v2-mobile-overlay">
      <div className="header-v2-mobile-panel">
        {/* Title + Close */}
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-lg font-bold text-[var(--header-v2-text-dark)]">Меню</span>
          <button type="button" onClick={onClose} className="p-1">
            <Icon name="close" size="lg" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="flex items-center border border-[var(--header-v2-border)] rounded-sm overflow-hidden">
            <span className="pl-3 text-[var(--header-v2-text-color)]">
              <Icon name="search" size="sm" />
            </span>
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 h-10 px-3 text-sm bg-transparent text-[var(--header-v2-text-dark)] focus:outline-none"
            />
          </div>
        </div>

        {/* Links */}
        <nav>
          {filtered.map((link) => (
            <a key={link.label} href={link.href} className="header-v2-mobile-panel-link">
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />
    </div>
  );
};

/* ─── Main component ─── */

interface HeaderV2Props {
  className?: string;
}

const HeaderV2: React.FC<HeaderV2Props> = ({ className }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const { brandOptions, getModelsForBrand } = useHierarchicalFilters();
  const brandNames = brandOptions.map((b) => b.value);

  return (
    <>
      <header className={cn('w-full fixed top-0 left-0 right-0 z-[var(--z-sticky)] bg-[var(--color-surface)]', className)}>
        {/* ─── Block 1: Top Bar ─── */}
        <div className="header-v2-topbar">
          <div className="max-w-[1512px] mx-auto px-4 lg:px-16 flex items-center justify-between h-14">
            {/* Left group: burger (mobile) + logo + city */}
            <div className="flex items-center gap-3">
              {/* Burger — mobile only, LEFT of logo */}
              <button
                type="button"
                className="lg:hidden header-v2-burger"
                onClick={() => setMobileOpen(true)}
              >
                <Icon name="menu" size="md" />
              </button>

              {/* Logo */}
              <a
                href="https://tamx.ru/"
                className="font-[var(--header-v2-font-family)] text-base font-bold text-[var(--header-v2-text-dark)] no-underline hover:no-underline whitespace-nowrap"
              >
                АвтоДилер Тарасов
              </a>

              {/* City — desktop, next to logo */}
              <button
                type="button"
                onClick={() => setMapOpen(true)}
                className="hidden lg:flex items-center gap-1 text-sm text-[var(--header-v2-text-color)] hover:text-[var(--header-v2-brand)] transition-colors"
              >
                <Icon name="location" size="xs" />
                <span>Новосибирск</span>
                <Icon name="chevronDown" size="xs" />
              </button>
            </div>

            {/* Right group: phone + auth + CTA */}
            <div className="flex items-center gap-3">
              {/* Phone — desktop only */}
              <a href="tel:+79537773456" className="hidden lg:inline-flex header-v2-topbar-pill">
                <Icon name="phone" size="xs" />
                +7 (953) 777-34-56
              </a>

              {/* Auth — always visible */}
              <a href="https://tamx.ru/page-login/" className="header-v2-topbar-pill">
                <Icon name="user-circle" size="sm" />
                <span className="hidden sm:inline">Авторизация</span>
              </a>

              {/* CTA — always visible */}
              <button
                type="button"
                className="header-v2-cta-btn"
                onClick={() => setLeadOpen(true)}
              >
                <span className="hidden sm:inline">Заказать машину</span>
                <span className="sm:hidden text-xs">Заказать машину</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Block 2: Navbar (desktop) ─── */}
        <nav className="header-v2-navbar hidden lg:block border-b border-[var(--header-v2-border)]">
          <div className="max-w-[1512px] mx-auto px-4 lg:px-16 flex items-center h-12 gap-5">
            <Dropdown
              trigger={
                <button type="button" className="header-v2-nav-link flex items-center gap-1">
                  Купить <Icon name="chevronDown" size="xs" />
                </button>
              }
              open={buyOpen}
              onToggle={setBuyOpen}
              panelClassName="mt-2"
            >
              <BuyMegaMenu brandOptions={brandNames} getModelsForBrand={getModelsForBrand} />
            </Dropdown>

            <Dropdown
              trigger={
                <button type="button" className="header-v2-nav-link flex items-center gap-1">
                  Сервисы <Icon name="chevronDown" size="xs" />
                </button>
              }
              open={servicesOpen}
              onToggle={setServicesOpen}
              panelClassName="mt-2"
            >
              <ServicesMenu />
            </Dropdown>

            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="header-v2-nav-link">
                {link.label}
              </a>
            ))}

            <div className="flex-1" />

            {/* Social icons */}
            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="header-v2-social-icon"
                >
                  <Icon name={s.name} size="sm" />
                </a>
              ))}
            </div>
          </div>
        </nav>
      </header>
      {/* Spacer to offset fixed header: topbar 56px mobile, topbar+navbar 104px desktop */}
      <div className="h-14 lg:h-[104px]" />

      {/* ─── Mobile slide-out panel ─── */}
      <MobilePanel open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* ─── Modals ─── */}
      <LeadModal
        open={leadOpen}
        onClose={() => setLeadOpen(false)}
        car={LEAD_CAR_STUB}
        title="Заказать машину"
        pageLabel="Header"
        btnLabel="Заказать машину"
        hideCarInfo
      />
      <MapModal open={mapOpen} onClose={() => setMapOpen(false)} />
    </>
  );
};

export default HeaderV2;
