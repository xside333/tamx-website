import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCar } from '../lib/api';
import { transformApiCarToCar } from '../lib/apiTransforms';
import { cn, formatPrice, formatMileage, computeDefaultMonthlyPayment } from '../lib/utils';
import { Header, Footer, CarCard, PhotoGallery } from '../components/organisms';
import { ErrorBoundary } from '../components/organisms/CarGrid/ErrorBoundary';
import { Icon, Button } from '../components/atoms';
import { Hint } from '../components/molecules';
import { CreditCalculator, FavoriteToggle, FloatingFavoritesButton, LeadModal, TradeInButton } from '../components/molecules';

import { Badge } from '../components/atoms';
import { useCars, useMobile, useFavorites } from '../hooks';
import { filterAndSortDetailPhotos } from '../lib/photoUtils';
import { PriceCalculationPopover } from '../components/molecules/PriceCalculationPopover/PriceCalculationPopover';
import { CarInfo } from '../components/molecules';
import { DeliveryToCity } from '../components/molecules/DeliveryToCity';
import { LocationSection } from '../components/molecules/LocationSection';
import { RelatedCars } from '../components/organisms/RelatedCars';
import {
  getCarTitle,
  getCarLocation,
  getCarProductionDate,
  getAccidentStatus,
  getFinalPrice,
  getEncarPrice,
  getEncarLink,
  getEngineDisplacement,
  getAccidentCostKRW,
  getAccidentCostRUB,
  processDetailPhotos,
  type CarDetailData
} from '../lib/carDetailTransforms';

/**
 * Страница детального просмотра автомобиля
 * URL: /car/:id
 */
const CarDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { favoriteCars, removeFromFavorites, markUnavailable, toggleFavorite, isFavorite } = useFavorites();
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadTitle, setLeadTitle] = useState<string | undefined>();
  const [leadBtn, setLeadBtn] = useState<string | undefined>();
  const [creditDetails, setCreditDetails] = useState<{
    downPayment: number;
    loanAmount: number;
    termMonths: number;
    monthlyPayment: number;
  } | undefined>();

  // Если нет ID в URL, редиректим в каталог
  if (!id) {
    return <Navigate to="/catalog" replace />;
  }

  // Загружаем данные автомобиля
  const {
    data: carData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['car', id],
    queryFn: () => getCar(id),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Detect 404 Not Found from API error once query settled
  const isNotFound = !!error && error instanceof Error && /HTTP Error:\s*404/.test(error.message);

  // Mark car as unavailable only once, outside of render path
  useEffect(() => {
    if (isNotFound && id) {
      try { markUnavailable(id); } catch {}
    }
  }, [isNotFound, id, markUnavailable]);

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex flex-col detail-page">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="heading-1 mb-4">Автомобиль не найден</h1>
            <a href="/catalog" className="text-accent hover:underline">
              Вернуться в каталог
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading || !carData) {
    return (
      <div className="min-h-screen bg-bg flex flex-col detail-page">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-primary">Загрузка...</div>
        </main>
        <Footer />
      </div>
    );
  }

  const car = transformApiCarToCar(carData);

  const onOpenLead = (title: string, btn: string, credit?: { downPayment: number; loanAmount: number; termMonths: number; monthlyPayment: number; }) => {
    setLeadTitle(title);
    setLeadBtn(btn);
    setCreditDetails(credit);
    setLeadOpen(true);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg flex flex-col detail-page">
        <Header />

        <main className="px-4 lg:px-16 pt-2 pb-3 lg:py-8">
          <div className="max-w-[1512px] mx-auto space-y-6">
          {/* Car Title Section */}
          <CarTitleSection car={car} carData={carData} isFavoriteFn={isFavorite} toggleFavorite={toggleFavorite} onOpenLead={(title, btn) => { setLeadTitle(title); setLeadBtn(btn); setLeadOpen(true); }} />

        {/* Main Content: Photo Gallery */}
        <PhotoGallery car={car} carData={carData} />

        {/* Specifications Section */}
        <SpecificationsSection car={car} carData={carData} />

        {/* Search Banner */}
        <SearchBanner onOrder={() => onOpenLead('Заявка на подбор авто', 'Заказать подбор')} />

        {/* Credit Calculator Section */}
        <CreditCalculator
          price={getFinalPrice(carData)}
          onOpenLead={({ title, btn, downPayment, loanAmount, termMonths, monthlyPayment }) =>
            onOpenLead(title, btn, { downPayment, loanAmount, termMonths, monthlyPayment })
          }
        />

        {/* Delivery Section */}
        <DeliveryToCity />

        {/* Location Section */}
        <LocationSection />

        {/* Related Cars */}
        <RelatedCars
          currentCarId={car.id}
          currentPrice={getFinalPrice(carData)}
          onFavoriteToggle={toggleFavorite}
          favoriteCarIds={favoriteCars.map(c => c.id)}
        />
        </div>
      </main>

      {/* Lead modal */}
      <LeadModal
        open={leadOpen}
        onClose={() => setLeadOpen(false)}
        car={{
          id: car.id,
          name: getCarTitle(carData),
          price: getFinalPrice(carData),
          link: (typeof window !== 'undefined' ? window.location.href : `/car/${car.id}`),
          statusLabel: car.status?.label || null,
        }}
        title={leadTitle}
        pageLabel="Детальная"
        btnLabel={leadBtn}
        hideCarInfo={leadBtn === 'Заказать подбор'}
        creditDetails={creditDetails}
      />

      <Footer />
      {/* Floating Favorites Button (bottom-right) */}
      <FloatingFavoritesButton
        favoriteCars={favoriteCars}
        onCarClick={(carId: string) => {
          if (carId !== id) navigate(`/car/${carId}`);
        }}
        onRemoveFromFavorites={removeFromFavorites}
      />
    </div>
    </ErrorBoundary>
  );
};

const CarTitleSection: React.FC<{ car: any; carData: CarDetailData; isFavoriteFn: (id: string) => boolean; toggleFavorite: (car: any) => void; onOpenLead: (title: string, btn: string) => void }> = ({ car, carData, isFavoriteFn, toggleFavorite, onOpenLead }) => {
  const [isPricePopoverOpen, setIsPricePopoverOpen] = useState(false);
  const price = getFinalPrice(carData);
  const title = getCarTitle(carData);
  const location = getCarLocation(carData);
  const mileage = carData.meta?.mileage || 0;
  const isMobile = useMobile();

  const statusType = car.status?.type as string | undefined;
  const monthsToPass = car.status?.monthsUntilPassable as number | undefined;

  let statusTitle = car.status?.label || '';
  let statusTooltip = '';
  if (typeof monthsToPass === 'number' && monthsToPass > 0) {
    const simulatedTotal = (carData as any)?.simulated?.usdt?.total || 0;
    statusTitle = `${formatPrice(Math.round(simulatedTotal))} через ${monthsToPass} мес.`;
    statusTooltip = `Через ${monthsToPass} месяца автомобиль станет проходным и будет оформляться по льготной ставке. Сейчас для него действует высокая таможенная пошлина.`;
  } else if (statusType === 'rate-3-5') {
    statusTooltip = 'Автомобиль считается “проходным” и попадает под льготную ставку таможенной пошлины.';
  } else if (statusType === 'rate-5-plus') {
    statusTooltip = 'Для этого автомобиля действует повышенная таможенная пошлина, так как его возраст превышает 5 лет.';
  } else if (statusType === 'rate-0-3') {
    statusTitle = 'Не проходное (моложе 3 лет)';
    statusTooltip = 'Автомобиль моложе 3 лет. Сейчас такие авто не считаются “проходными” — ввоз возможен только по повышенной таможенной пошлине.';
  }

  return (
    <section className="bg-surface rounded-lg lg:rounded-[32px] p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex-1">
          <h1 className="heading-1 mb-3 lg:mb-2 whitespace-normal break-words">
            {title}
          </h1>
          {isMobile ? (
            null
          ) : (
            <span className="text-secondary text-base lg:text-[20px] font-bold">
              {getCarProductionDate(carData)}
            </span>
          )}
        </div>
        
        <div className="flex flex-row items-stretch space-x-3 w-full lg:w-auto">
          <div className="text-left lg:text-right relative w-full lg:w-auto">
            <div className="flex items-center justify-start lg:justify-end">
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setIsPricePopoverOpen((v) => !v)}
                className="text-primary text-xl lg:text-[30px] font-bold hover:text-accent transition-colors"
              >
                {formatPrice(price)}
              </button>
              <button
                aria-label="Показать расчёт стоимости"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setIsPricePopoverOpen((v) => !v)}
                className="ml-2 w-6 h-6 bg-surface-secondary rounded-full border border-muted flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Icon name="chevronDown" size="sm" className={cn("text-primary transition-transform duration-200", isPricePopoverOpen && "rotate-180")} />
              </button>
              <button
                className="ml-3 text-accent text-sm lg:text-base font-medium whitespace-nowrap hover:underline"
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const el = document.getElementById('credit-calculator');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                {`от ${formatPrice(computeDefaultMonthlyPayment(price)).replace(' ₽', ' ₽/месяц')}`}
              </button>
              {!isMobile && (
                <>
                  {/* divider */}
                  <div className="mx-3 h-6 w-px bg-muted" aria-hidden />
                  {/* favorite toggle */}
                  <div>
                    <FavoriteToggle car={car} isFavorite={isFavoriteFn(car.id)} onToggle={toggleFavorite} />
                  </div>
                </>
              )}
            </div>

            {isMobile && car.status && (
              <div className="mt-4 flex items-center">
                <Hint content={statusTooltip}>
                  <div>
                    <Badge variant={car.status.type} className="px-4 py-2">
                      {statusTitle}
                    </Badge>
                  </div>
                </Hint>
                <div className="mx-3 h-6 w-px bg-muted" aria-hidden />
                <FavoriteToggle car={car} isFavorite={isFavoriteFn(car.id)} onToggle={toggleFavorite} />
              </div>
            )}

            {isMobile && (
              <div className="mt-5 lg:mt-4 tradein-mobile-full w-full lg:w-auto">
                <TradeInButton
                  fullWidth
                  label="Рассчитать трейд-ин"
                  onClick={() => onOpenLead('Рассчитать трейд-ин', 'Рассчитать трейд-ин')}
                />
              </div>
            )}

            <PriceCalculationPopover
              isOpen={isPricePopoverOpen}
              onClose={() => setIsPricePopoverOpen(false)}
              carData={carData}
              placement={isMobile ? 'bottom' : 'inline'}
            />
          </div>
        </div>
      </div>
      
      <div className="mt-0 pt-0 lg:mt-6 lg:pt-6 lg:border-t lg:border-muted flex flex-col lg:flex-row lg:flex-wrap lg:gap-y-5 items-start lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {!isMobile && car.status && (
          <Hint content={statusTooltip}>
            <div>
              <Badge variant={car.status.type} className="px-4 lg:px-8 py-2 lg:py-4">
                {statusTitle}
              </Badge>
            </div>
          </Hint>
        )}

        {/* Desktop buttons */}
        <div className="hidden lg:flex flex-wrap gap-x-5 gap-y-3 w-full lg:w-auto">
          <Hint content={'Мы можем забрать ваш старый автомобиль в счет стоимости этого авто.'}>
            <TradeInButton
              label="Трейд-ин"
              className="lg:w-[160px] lg:flex-none lg:h-[56px]"
              onClick={() => onOpenLead('Рассчитать трейд-ин', 'Рассчитать трейд-ин')}
            />
          </Hint>
          <Hint content={
            'Полный осмотр автомобиля нашим экспертом возможен уже сегодня. Услуга предоставляется на платной основе.'
          }>
            <Button
              variant="secondary"
              className="flex-1 sm:flex-none px-4 lg:px-6 py-3 lg:py-4 lg:h-[56px] text-sm lg:text-base"
              onClick={() => onOpenLead('Заказать осмотр этого авто', 'Заказать осмотр этого авто')}
            >
              Заказать осмотр этого авто
            </Button>
          </Hint>
          <Button
            variant="secondary"
            className="flex-1 sm:flex-none px-4 lg:px-6 py-3 lg:py-4 lg:h-[56px] text-sm lg:text-base"
            onClick={() => {
              const el = document.getElementById('credit-calculator');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            Оформить кредит
          </Button>
          <Button
            variant="primary"
            className="flex-1 sm:flex-none px-4 lg:px-5 py-3 lg:py-4 text-sm lg:text-base"
            onClick={() => onOpenLead('Заявка на покупку авто', 'Купить')}
          >
            Купить
          </Button>
        </div>

        {/* Mobile sticky action bar */}
        {isMobile && (
          <div className="fixed inset-x-0 z-50 bottom-safe-10">
            <div>
              <div className="bg-surface shadow-md p-3 flex gap-x-5 gap-y-3">
                <Button
                  variant="secondary"
                  className="flex-1 text-sm h-[50px]"
                  onClick={() => onOpenLead('Заказать осмотр этого авто', 'Заказать осмотр')}
                >
                  Заказать осмотр
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 text-sm h-[50px]"
                  onClick={() => {
                    const el = document.getElementById('credit-calculator');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  Оформить кредит
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 text-sm h-[50px]"
                  onClick={() => onOpenLead('Заявка на покупку авто', 'Купить')}
                >
                  Купить
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};



const SpecificationsSection: React.FC<{ car: any; carData: CarDetailData }> = ({ car, carData }) => {
  const [activeTab, setActiveTab] = useState('specs');
  const accidentStatus = getAccidentStatus(carData);
  const isAccidentFree = accidentStatus === 'Без ДТП';

  return (
    <section className="bg-surface rounded-lg lg:rounded-[32px] p-4 lg:p-8">
      <div className="border-b border-divider mb-6 lg:mb-8">
        <div className="flex space-x-4 lg:space-x-8 mb-4 overflow-x-auto">
          <button
            className={cn(
              "detail-tab text-sm font-medium tracking-wide pb-4 transition-colors whitespace-nowrap",
              activeTab === 'specs'
                ? "text-primary border-b-4 border-accent"
                : "text-secondary opacity-50 hover:opacity-100 hover:text-primary"
            )}
            onClick={() => setActiveTab('specs')}
          >
            Информация об авто
          </button>
          <button
            className={cn(
              "detail-tab text-sm font-medium tracking-wide pb-4 transition-colors whitespace-nowrap",
              activeTab === 'accidents'
                ? "text-primary border-b-4 border-accent"
                : "text-secondary opacity-50 hover:opacity-100 hover:text-primary"
            )}
            onClick={() => setActiveTab('accidents')}
          >
            Информация о ДТП
          </button>
        </div>
      </div>

      {activeTab === 'specs' && (
        <CarInfo carData={carData} />
      )}

      {activeTab === 'accidents' && (
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <Icon name={isAccidentFree ? "check-circle" : "alert-triangle"}
                  size="md"
                  className={isAccidentFree ? "text-green-500" : "text-yellow-500"} />
            <span className="text-primary">
              {accidentStatus}
            </span>
          </div>
          {!isAccidentFree && (
            <div className="text-secondary space-y-2">
              <div>Количество ДТП: {carData.meta?.myaccidentcnt || 0}</div>
              <div>Стоимость ущерба: {getAccidentCostKRW(carData)} / {getAccidentCostRUB(carData)}</div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const SpecRow: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-secondary text-sm font-medium">{label}</span>
    <span className="text-primary text-sm font-medium">{value}</span>
  </div>
);

const SearchBanner: React.FC<{ onOrder?: () => void }> = ({ onOrder }) => (
  <section className="cta-banner">
    <div className="cta-banner-content">
      <div className="cta-banner-icon">
        <img src="/cta-car.webp" alt="Car" className="w-auto h-full object-contain" />
      </div>
      <div className="space-y-1">
        <h2 className="cta-banner-text heading-2">Ищете, но всё не то?</h2>
        <p className="cta-banner-text heading-2">Мы бесплатно подберем нужное авто</p>
      </div>
    </div>
    
    <Button variant="secondary" className="bg-white text-primary border-none hover:bg-surface-secondary btn-equal" onClick={onOrder}>
      Заказать подбор
    </Button>
  </section>
);

const HorizontalCreditCalculator: React.FC = () => {
  const [firstPayment, setFirstPayment] = useState(1072510);
  const [loanTerm, setLoanTerm] = useState(5);

  return (
    <section className="bg-surface rounded-lg lg:rounded-[32px] p-4 lg:p-8">
      <div className="mb-6 lg:mb-8">
        <h2 className="heading-2 mb-4">
          Быстрый и простой онлайн-кредит
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-primary text-sm lg:text-base">Одобрение от 10 минут</span>
          </div>
          <button className="text-accent text-sm lg:text-base hover:underline flex items-center space-x-1">
            <span>Подробнее</span>
            <Icon name="arrow-right" size="sm" className="text-accent" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Left: Form controls */}
        <div className="border border-muted rounded-lg lg:rounded-[24px] p-4 lg:p-8 space-y-6 lg:space-y-8">
          <div>
            <label className="text-secondary text-sm mb-4 block">Первоначальный взнос</label>
            <div className="relative">
              <input
                type="range"
                min="100000"
                max="2045000"
                value={firstPayment}
                onChange={(e) => setFirstPayment(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-secondary text-sm mt-2">
                <span>100 000 ₽</span>
                <span>2 045 000 ₽</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-secondary text-sm mb-4 block">Срок кредита</label>
            <div className="relative">
              <input
                type="range"
                min="1"
                max="8"
                value={loanTerm}
                onChange={(e) => setLoanTerm(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-secondary text-sm mt-2">
                <span>1 Месяц</span>
                <span>8 лет</span>
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
              <div className="text-primary text-lg lg:text-[20px] font-bold">{formatPrice(firstPayment)}</div>
            </div>

            <div>
              <div className="text-secondary text-base font-medium mb-2">Платеж</div>
              <div className="text-primary text-lg lg:text-[20px] font-bold">от 34 370 ₽/мес</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
            <Button variant="primary" className="flex-1 px-4 lg:px-8 py-3 lg:py-4">
              Получить одобрение
            </Button>
            <Button variant="secondary" className="flex-1 px-4 lg:px-8 py-3 lg:py-4 border-accent">
              Узнать подробнее
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};




export default CarDetailPage;
