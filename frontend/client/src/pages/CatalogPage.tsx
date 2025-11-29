import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Button, Icon } from '../components/atoms';
import { SortSelect, FloatingFavoritesButton, Pagination, LeadModal } from '../components/molecules';
import { Header, Footer, CarGrid, FiltersAside } from '../components/organisms';
import { useCars, useFavorites, useMobile } from '../hooks';
import { Filters, FiltersPatch, SortOption, Car } from '../types';
import { transformUrlParamsToFilters, transformFiltersToUrlParams } from '../lib/apiTransforms';

const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const isMobile = useMobile();
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadTitle, setLeadTitle] = useState<string | undefined>();
  const [leadBtn, setLeadBtn] = useState<string | undefined>();
  const openLead = (title: string, btn: string) => { setLeadTitle(title); setLeadBtn(btn); setLeadOpen(true); };
  
  // Состояние фильтров
  const [appliedFilters, setAppliedFilters] = useState<Filters>(() => 
    transformUrlParamsToFilters(searchParams)
  );
  const [pendingFilters, setPendingFilters] = useState<Filters>(appliedFilters);
  
  // Состояние сортировки и пагинации
  const [sort, setSort] = useState<SortOption>(() => {
    const sortFromUrl = searchParams.get('sortBy') as SortOption;
    return sortFromUrl || 'date_desc';
  });
  const [page, setPage] = useState(() => {
    const pageFromUrl = searchParams.get('page');
    return pageFromUrl ? parseInt(pageFromUrl) : 1;
  });

  const {
    favoriteCarIds,
    favoriteCars,
    toggleFavorite,
    removeFromFavorites,
    isFavorite,
  } = useFavorites();

  const {
    data: carsData,
    isLoading: carsLoading,
    error: carsError,
    refetch: refetchCars,
  } = useCars({
    filters: appliedFilters,
    sort,
    page,
  });

  // Синхронизация URL с фильтрами
  useEffect(() => {
    const params = transformFiltersToUrlParams(appliedFilters);
    params.set('sortBy', sort);
    params.set('page', page.toString());

    setSearchParams(params, { replace: true });
  }, [appliedFilters, sort, page, setSearchParams]);

  // Восстановление позиции скролла при возврате из детальной страницы
  useEffect(() => {
    const restoreScrollPosition = () => {
      const scrollPosition = sessionStorage.getItem('catalogScrollPosition');
      const returnTime = sessionStorage.getItem('catalogReturnTime');

      if (scrollPosition && returnTime) {
        const timeDiff = Date.now() - parseInt(returnTime);
        // Восстанавливаем позицию только если прошло не более 10 минут
        if (timeDiff < 10 * 60 * 1000) {
          setTimeout(() => {
            window.scrollTo({ top: parseInt(scrollPosition), behavior: 'auto' });
          }, 100); // Небольшая задержка для рендера страницы
        }

        // Очищаем сохраненную позицию
        sessionStorage.removeItem('catalogScrollPosition');
        sessionStorage.removeItem('catalogReturnTime');
      }
    };

    restoreScrollPosition();
  }, []);

  // Обработчики
  const handleCardClick = (carId: string, e?: React.MouseEvent) => {
    // Сохраняем позицию скролла для возврата из детальной страницы
    sessionStorage.setItem('catalogScrollPosition', window.scrollY.toString());
    sessionStorage.setItem('catalogReturnTime', Date.now().toString());

    const carUrl = `/car/${carId}`;

    if (isMobile) {
      // На мобильном - открываем в той же вкладке
      window.location.href = carUrl;
    } else {
      // На десктопе - открываем в новой вкладке
      if (e) {
        e.preventDefault();
      }
      window.open(carUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleFavoriteCarClick = (carId: string) => {
    handleCardClick(carId);
  };

  const handleFavoriteToggle = (car: Car) => {
    toggleFavorite(car);
  };

  const handleFiltersChange = (newFilters: FiltersPatch) => {
    setPendingFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters(pendingFilters);
    setPage(1); // Сбрасываем на первую страницу при применении фильтров
  };

  const handleResetFilters = () => {
    const emptyFilters: Filters = {
      models: [],
      types: [],
      fuels: [],
      colors: [],
      categories: [],
    };
    setPendingFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
    setSort('date_desc');
    // Don't update appliedFilters - only update when "Показать" button is clicked
  };

  const handleResetFilterGroup = (group: string) => {
    const resetUpdates: Partial<Filters> = {};

    switch (group) {
      case 'car':
        resetUpdates.brand = undefined;
        resetUpdates.model = undefined;
        resetUpdates.generation = undefined;
        resetUpdates.types = [];
        break;
      case 'price':
        resetUpdates.priceFrom = undefined;
        resetUpdates.priceTo = undefined;
        break;
      case 'year':
        resetUpdates.yearFrom = undefined;
        resetUpdates.yearTo = undefined;
        resetUpdates.monthFrom = undefined;
        resetUpdates.monthTo = undefined;
        break;
      case 'mileage':
        resetUpdates.mileageFrom = undefined;
        resetUpdates.mileageTo = undefined;
        break;
      case 'engine':
        resetUpdates.fuels = [];
        break;
      case 'color':
        resetUpdates.colors = [];
        break;
    }

    const newFilters = { ...pendingFilters, ...resetUpdates };
    setPendingFilters(newFilters);
    // Don't update appliedFilters - only update when "Показать" button is clicked
  };

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort);
    setPage(1); // Сбрасываем на первую страницу при изменении сортировки
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Прокручиваем к началу страницы
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetry = () => {
    refetchCars();
  };

  const toggleMobileFilters = () => {
    setIsMobileFiltersOpen(!isMobileFiltersOpen);
  };

  // Sticky mobile filters button visibility
  const mobileFiltersBtnRef = useRef<HTMLDivElement | null>(null);
  const [showStickyFilters, setShowStickyFilters] = useState(false);

  useEffect(() => {
    if (!isMobile || !mobileFiltersBtnRef.current) return;

    const target = mobileFiltersBtnRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setShowStickyFilters(!entry.isIntersecting);
      },
      { root: null, threshold: 0 }
    );

    observer.observe(target);
    return () => observer.unobserve(target);
  }, [isMobile]);

  // Lock body scroll while mobile filters modal is open
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isMobileFiltersOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const top = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (top) {
        const y = parseInt(top || '0') * -1;
        window.scrollTo(0, y);
      }
    }
  }, [isMobileFiltersOpen]);

  // Проверяем, есть ли изменения в фильтрах
  const hasFiltersChanged = JSON.stringify(pendingFilters) !== JSON.stringify(appliedFilters);

  const cars = carsData?.cars || [];
  const totalCount = carsData?.total || 0;
  const totalPages = carsData?.totalPages || 1;

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      
      <main className="container mx-auto py-4 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filters */}
          <div className="hidden lg:block lg:w-80 flex-shrink-0">
            <FiltersAside
              filters={pendingFilters}
              appliedFilters={appliedFilters}
              onFiltersChange={handleFiltersChange}
              onApplyFilters={handleApplyFilters}
              onResetFilters={handleResetFilters}
              onResetGroup={handleResetFilterGroup}
              totalCount={totalCount}
              loading={carsLoading}
            />
          </div>

          {/* Mobile Filters Overlay */}
          {isMobileFiltersOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/50">
              <div className="bg-surface h-full overflow-auto p-4 pb-0">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Фильтры</h2>
                  <Button variant="ghost" onClick={toggleMobileFilters}>
                    Закрыть
                  </Button>
                </div>
                <FiltersAside
                  filters={pendingFilters}
                  appliedFilters={appliedFilters}
                  onFiltersChange={handleFiltersChange}
                  onApplyFilters={() => {
                    handleApplyFilters();
                    toggleMobileFilters();
                  }}
                  onResetFilters={handleResetFilters}
                  onResetGroup={handleResetFilterGroup}
                  totalCount={totalCount}
                  loading={carsLoading}
                />
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">

            {/* Sort and Results Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="heading-1 mb-2">Каталог объявлений</h1>
                <p className="text-secondary">
                  Найдено {totalCount.toLocaleString()} объявлений
                </p>
              </div>
              {/* Desktop sort (right side) */}
              <div className="hidden lg:flex gap-4">
                <SortSelect
                  value={sort}
                  onChange={handleSortChange}
                  disabled={carsLoading}
                />
              </div>
            </div>

            {/* Mobile Filters Button (now above sort) */}
            <div className="lg:hidden mb-4" ref={mobileFiltersBtnRef}>
              <Button
                variant="secondary"
                onClick={toggleMobileFilters}
                className="filters-button w-full h-[52px] rounded-xl bg-white"
              >
                <Icon name="filter" size="sm" className="text-accent" />
                <span>Все фильтры</span>
              </Button>
            </div>

            {/* Mobile sort (below "Все фильтры") */}
            <div className="lg:hidden mb-4">
              <SortSelect
                value={sort}
                onChange={handleSortChange}
                disabled={carsLoading}
              />
            </div>

            {/* Sticky Filters FAB (mobile) */}
            {isMobile && !isMobileFiltersOpen && (
              <div
                className={cn(
                  "fixed z-50 left-1/2 -translate-x-1/2 bottom-safe-20 transition-normal",
                  showStickyFilters ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-4 opacity-0 pointer-events-none"
                )}
              >
                <Button
                  variant="primary"
                  onClick={toggleMobileFilters}
                  className="sticky-filters-button bg-accent text-on-accent h-[52px] rounded-xl shadow-md w-auto min-w-fit gap-2"
                >
                  <Icon name="filter" size="sm" className="text-on-accent" />
                  <span className="text-on-accent">Все фильтры</span>
                </Button>
              </div>
            )}

            {/* Car Grid */}
            <CarGrid
              cars={cars}
              loading={carsLoading}
              error={carsError?.message}
              onCardClick={handleCardClick}
              onFavoriteToggle={handleFavoriteToggle}
              favoriteCarIds={favoriteCarIds}
              onRetry={handleRetry}
              onBannerOrder={() => openLead('Заявка на подбор авто', 'Заказать подбор')}
            />

            {/* Pagination */}
            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                disabled={carsLoading}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Lead modal for catalog banner */}
      <LeadModal
        open={leadOpen}
        onClose={() => setLeadOpen(false)}
        car={{ id: 'catalog-banner', name: 'Подбор авто', price: 0, link: (typeof window !== 'undefined' ? window.location.href : '/catalog') }}
        title={leadTitle}
        pageLabel="Каталог"
        btnLabel={leadBtn}
        hideCarInfo={true}
      />

      {/* Floating Favorites Button */}
      <FloatingFavoritesButton
        favoriteCars={favoriteCars}
        onCarClick={handleFavoriteCarClick}
        onRemoveFromFavorites={removeFromFavorites}
      />
    </div>
  );
};

export default CatalogPage;
