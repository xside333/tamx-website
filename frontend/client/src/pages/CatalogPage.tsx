import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Button, Icon } from '../components/atoms';
import { SortSelect, FloatingFavoritesButton, Pagination, LeadModal } from '../components/molecules';
import { HeaderV2, Footer, CarGrid, FiltersAside, ModelGrid } from '../components/organisms';
import { useCars, useFavorites, useMobile, useCatalogModels } from '../hooks';
import { Filters, FiltersPatch, SortOption, Car } from '../types';
import { transformUrlParamsToFilters, transformFiltersToUrlParams } from '../lib/apiTransforms';

type CatalogMode = 'ads' | 'models';

const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const isMobile = useMobile();
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadTitle, setLeadTitle] = useState<string | undefined>();
  const [leadBtn, setLeadBtn] = useState<string | undefined>();
  const openLead = (title: string, btn: string) => { setLeadTitle(title); setLeadBtn(btn); setLeadOpen(true); };

  // Режим: объявления или модели
  const [catalogMode, setCatalogMode] = useState<CatalogMode>(() => {
    return (searchParams.get('mode') as CatalogMode) || 'ads';
  });

  // Сохранённое состояние для кнопки "Назад" при переходе из моделей в объявления
  const [modelsBackState, setModelsBackState] = useState<{
    filters: Filters;
    page: number;
  } | null>(null);

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

  // Проверяем, заблокирован ли режим моделей (generation, type или model выбраны)
  const isModelsModeBlocked = !!(
    appliedFilters.generation ||
    (appliedFilters.types && appliedFilters.types.length > 0) ||
    appliedFilters.model
  );
  const isPendingModelsModeBlocked = !!(
    pendingFilters.generation ||
    (pendingFilters.types && pendingFilters.types.length > 0) ||
    pendingFilters.model
  );

  // Если активен режим моделей и пришли blocking-фильтры — автоматически переключаемся
  useEffect(() => {
    if (catalogMode === 'models' && isModelsModeBlocked) {
      setCatalogMode('ads');
    }
  }, [isModelsModeBlocked, catalogMode]);

  const {
    favoriteCarIds,
    toggleFavorite,
    removeFromFavorites,
    isFavorite,
  } = useFavorites();

  // Запрос объявлений (режим ads)
  const {
    data: carsData,
    isLoading: carsLoading,
    error: carsError,
    refetch: refetchCars,
  } = useCars({
    filters: appliedFilters,
    sort,
    page,
    enabled: catalogMode === 'ads',
  });

  // Запрос моделей: счётчик всегда, полный список — только в режиме models
  const {
    data: modelsData,
    isLoading: modelsLoading,
    error: modelsError,
    refetch: refetchModels,
    totalModels: totalModelsCount,
    totalAds: totalAdsFromModels,
  } = useCatalogModels({
    filters: appliedFilters,
    page,
    pageSize: 12,
    loadItems: catalogMode === 'models',
  });

  // Синхронизация URL с фильтрами
  useEffect(() => {
    const params = transformFiltersToUrlParams(appliedFilters);
    params.set('sortBy', sort);
    params.set('page', page.toString());
    params.set('mode', catalogMode);

    setSearchParams(params, { replace: true });
  }, [appliedFilters, sort, page, catalogMode, setSearchParams]);

  // Восстановление позиции скролла при возврате из детальной страницы
  useEffect(() => {
    const restoreScrollPosition = () => {
      const scrollPosition = sessionStorage.getItem('catalogScrollPosition');
      const returnTime = sessionStorage.getItem('catalogReturnTime');

      if (scrollPosition && returnTime) {
        const timeDiff = Date.now() - parseInt(returnTime);
        if (timeDiff < 10 * 60 * 1000) {
          setTimeout(() => {
            window.scrollTo({ top: parseInt(scrollPosition), behavior: 'auto' });
          }, 100);
        }

        sessionStorage.removeItem('catalogScrollPosition');
        sessionStorage.removeItem('catalogReturnTime');
      }
    };

    restoreScrollPosition();
  }, []);

  // Обработчики
  const handleCardClick = (carId: string, e?: React.MouseEvent) => {
    sessionStorage.setItem('catalogScrollPosition', window.scrollY.toString());
    sessionStorage.setItem('catalogReturnTime', Date.now().toString());

    const carUrl = `/car/${carId}`;

    if (isMobile) {
      window.location.href = carUrl;
    } else {
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
    setPage(1);
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
    setModelsBackState(null);
  };

  const handleResetFilterGroup = (group: string) => {
    const resetUpdates: Partial<Filters> = {};

    switch (group) {
      case 'car':
        resetUpdates.source = undefined;
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
  };

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetry = () => {
    if (catalogMode === 'ads') {
      refetchCars();
    } else {
      refetchModels();
    }
  };

  const handleModeSwitch = (mode: CatalogMode) => {
    if (mode === catalogMode) return;
    setCatalogMode(mode);
    setPage(1);
    if (mode === 'models') setModelsBackState(null);
  };

  const handleModelClick = (brand: string, model: string) => {
    setModelsBackState({ filters: appliedFilters, page });

    const newFilters: Filters = {
      ...appliedFilters,
      brand,
      model,
      models: [model],
    };
    setAppliedFilters(newFilters);
    setPendingFilters(newFilters);
    setCatalogMode('ads');
    setPage(1);
  };

  const handleBackToModels = () => {
    if (!modelsBackState) return;
    setAppliedFilters(modelsBackState.filters);
    setPendingFilters(modelsBackState.filters);
    setPage(modelsBackState.page);
    setCatalogMode('models');
    setModelsBackState(null);
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

  const hasFiltersChanged = JSON.stringify(pendingFilters) !== JSON.stringify(appliedFilters);

  const cars = carsData?.cars || [];
  // totalAds: из объявлений если режим ads, иначе из ответа моделей (он всегда знает totalAds)
  const totalAds = carsData?.total ?? totalAdsFromModels;
  const adsTotalPages = carsData?.totalPages || 1;
  const modelsTotalPages = modelsData?.totalPages || 1;
  const currentTotalPages = catalogMode === 'ads' ? adsTotalPages : modelsTotalPages;

  const isLoading = catalogMode === 'ads' ? carsLoading : modelsLoading;
  const currentError = catalogMode === 'ads' ? carsError?.message : modelsError?.message;

  return (
    <div className="min-h-screen bg-bg">
      <HeaderV2 />

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
              totalCount={totalAds}
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
                  totalCount={totalAds}
                  loading={carsLoading}
                />
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">

            {/* Header: title + mode switcher + sort */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="heading-1 mb-2">Каталог объявлений</h1>

                {/* Mode Switcher */}
                <div className="flex items-center gap-2 flex-wrap">
                  {modelsBackState && catalogMode === 'ads' && (
                    <button
                      className="catalog-back-btn"
                      onClick={handleBackToModels}
                      disabled={isLoading}
                    >
                      <Icon name="chevron-left" size="sm" />
                      <span>Назад</span>
                    </button>
                  )}
                  <div className="catalog-mode-switcher">
                    <button
                      className={cn(
                        'catalog-mode-switcher__btn',
                        catalogMode === 'ads' && 'catalog-mode-switcher__btn--active'
                      )}
                      onClick={() => handleModeSwitch('ads')}
                      disabled={isLoading}
                    >
                      {totalAds > 0
                        ? `${totalAds.toLocaleString('ru-RU')} объявлений`
                        : 'Объявления'}
                    </button>
                    <button
                      className={cn(
                        'catalog-mode-switcher__btn',
                        catalogMode === 'models' && 'catalog-mode-switcher__btn--active'
                      )}
                      onClick={() => handleModeSwitch('models')}
                      disabled={isLoading || isPendingModelsModeBlocked}
                      title={
                        isPendingModelsModeBlocked
                          ? 'Недоступно при выборе поколения или комплектации'
                          : undefined
                      }
                    >
                      {totalModelsCount > 0
                        ? `${totalModelsCount.toLocaleString('ru-RU')} моделей`
                        : 'Модели'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Desktop sort (right side) — only in ads mode */}
              {catalogMode === 'ads' && (
                <div className="hidden lg:flex gap-4">
                  <SortSelect
                    value={sort}
                    onChange={handleSortChange}
                    disabled={carsLoading}
                  />
                </div>
              )}
            </div>

            {/* Mobile Filters Button */}
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

            {/* Mobile sort — only in ads mode */}
            {catalogMode === 'ads' && (
              <div className="lg:hidden mb-4">
                <SortSelect
                  value={sort}
                  onChange={handleSortChange}
                  disabled={carsLoading}
                />
              </div>
            )}

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

            {/* Content: Car Grid or Model Grid */}
            {catalogMode === 'ads' ? (
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
            ) : (
              <ModelGrid
                models={modelsData?.items || []}
                loading={modelsLoading}
                error={modelsError?.message}
                onModelClick={handleModelClick}
                onRetry={handleRetry}
              />
            )}

            {/* Pagination */}
            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalPages={currentTotalPages}
                onPageChange={handlePageChange}
                disabled={isLoading}
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
        favoriteIds={favoriteCarIds}
        onCarClick={handleFavoriteCarClick}
        onRemoveFromFavorites={removeFromFavorites}
      />
    </div>
  );
};

export default CatalogPage;
