import { Car } from '../../../types';
import { cn, formatPrice, formatMileage, getFuelLabel } from '../../../lib/utils';
import { Icon } from '../../atoms';

interface FavoritesPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  favoriteCars: Car[];
  onCarClick: (carId: string) => void;
  onRemoveFromFavorites: (carId: string) => void;
  className?: string;
}

const FavoritesPopover: React.FC<FavoritesPopoverProps> = ({
  isOpen,
  onClose,
  favoriteCars,
  onCarClick,
  onRemoveFromFavorites,
  className,
}) => {
  if (!isOpen) return null;

  const handleCarClick = (car: Car) => {
    onCarClick(car.id);
    onClose();
  };

  const handleRemoveClick = (e: React.MouseEvent, carId: string) => {
    e.stopPropagation();
    onRemoveFromFavorites(carId);
  };

  const popoverClasses = cn(
    'w-96 max-w-[calc(100vw-20px)] md:w-96 max-h-96 overflow-auto',
    'bg-surface border border-muted rounded-xl shadow-lg',
    'z-dropdown',
    'transform transition-all duration-fast',
    isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none',
    className
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[999]"
        onClick={onClose}
      />

      {/* Popover */}
      <div className={popoverClasses} style={{ position: 'fixed' }}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-primary font-bold text-lg">Избранное</h3>
            <button
              onClick={onClose}
              className="text-secondary hover:text-primary transition-fast"
            >
              <Icon name="close" size="sm" />
            </button>
          </div>

          {favoriteCars.length === 0 ? (
            <div className="text-center py-8">
              <Icon name="heart" size="lg" className="mx-auto mb-2 text-muted" />
              <p className="text-muted text-sm">Нет избранных объявлений</p>
            </div>
          ) : (
            <div className="space-y-3">
              {favoriteCars.map((car) => (
                <div
                  key={car.id}
                  className="relative border border-muted rounded-lg p-3 cursor-pointer hover:bg-surface-secondary transition-fast group"
                  onClick={() => handleCarClick(car)}
                >
                  {car.unavailable && (
                    <div className="absolute inset-0 rounded-lg bg-black/40 z-10 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">Недоступно</span>
                    </div>
                  )}
                  <div className="flex space-x-3">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      <img
                        src={car.photos[0]}
                        alt={car.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    </div>

                    {/* Car info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-primary font-medium text-sm mb-1 truncate">
                        {car.name}
                      </h4>
                      
                      <div className="text-xs text-secondary mb-2">
                        {car.year}, {formatMileage(car.mileage)}, {getFuelLabel(car.fuel)}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-accent font-bold text-sm">
                          {formatPrice(car.price)}
                        </span>
                        <span className="text-secondary text-xs">
                          {car.location}
                        </span>
                      </div>
                    </div>

                    {/* Remove button */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={(e) => handleRemoveClick(e, car.id)}
                        className="w-8 h-8 rounded-full bg-surface hover:bg-muted transition-fast flex items-center justify-center opacity-0 group-hover:opacity-100"
                      >
                        <Icon name="close" size="xs" className="text-secondary" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FavoritesPopover;
