import React from 'react';
import { cn, formatPrice } from '../../../lib/utils';
import { CatalogModelItem } from '../../../lib/api';

interface ModelCardProps {
  model: CatalogModelItem;
  onClick?: (brand: string, model: string) => void;
  className?: string;
}

const PLACEHOLDER = '/placeholder.svg';

const ModelCard: React.FC<ModelCardProps> = ({ model, onClick, className }) => {
  const photos = model.photos_preview.length > 0
    ? model.photos_preview
    : [PLACEHOLDER, PLACEHOLDER, PLACEHOLDER, PLACEHOLDER];

  const gridPhotos = Array.from({ length: 4 }, (_, i) => photos[i] || PLACEHOLDER);

  const yearRange = model.year_min && model.year_max
    ? `${model.year_min} - ${model.year_max}`
    : model.year_min || model.year_max || null;

  const priceRange = (() => {
    if (model.price_min && model.price_max) {
      return `${formatPrice(model.price_min)} - ${formatPrice(model.price_max)}`;
    }
    if (model.price_min) return `от ${formatPrice(model.price_min)}`;
    if (model.price_max) return `до ${formatPrice(model.price_max)}`;
    return null;
  })();

  const displacementRange = (() => {
    if (model.displacement_min && model.displacement_max) {
      if (model.displacement_min === model.displacement_max) {
        return `${model.displacement_min} л`;
      }
      return `${model.displacement_min}-${model.displacement_max} л`;
    }
    if (model.displacement_min) return `${model.displacement_min} л`;
    if (model.displacement_max) return `${model.displacement_max} л`;
    return null;
  })();

  const hpRange = (() => {
    if (model.hp_min && model.hp_max) {
      if (model.hp_min === model.hp_max) return `${model.hp_min} л.с.`;
      return `${model.hp_min}-${model.hp_max} л.с.`;
    }
    if (model.hp_min) return `${model.hp_min} л.с.`;
    if (model.hp_max) return `${model.hp_max} л.с.`;
    return null;
  })();

  const specParts = [
    displacementRange,
    model.fuel_types && model.fuel_types.length > 0
      ? model.fuel_types.join(', ')
      : null,
    hpRange,
  ].filter(Boolean);

  const handleClick = () => {
    onClick?.(model.brand, model.model);
  };

  return (
    <article
      className={cn('model-card', className)}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      aria-label={`${model.brand} ${model.model}`}
    >
      <div className="model-card__photos">
        {gridPhotos.map((src, idx) => (
          <div key={idx} className="model-card__photo-cell">
            <img
              src={src}
              alt={idx === 0 ? `${model.brand} ${model.model}` : ''}
              className="model-card__photo-img"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
            />
          </div>
        ))}
      </div>

      <div className="model-card__body">
        <h3 className="model-card__title">
          {model.brand} {model.model}
          {yearRange && (
            <span className="model-card__years">, {yearRange}</span>
          )}
        </h3>

        {priceRange && (
          <p className="model-card__price">{priceRange}</p>
        )}

        {specParts.length > 0 && (
          <p className="model-card__specs">
            {[displacementRange, model.fuel_types?.length > 0 ? model.fuel_types.join(', ') : null].filter(Boolean).join('; ')}
            {hpRange && (
              <><br />{hpRange}</>
            )}
          </p>
        )}

        <p className="model-card__count">
          {model.ads_count.toLocaleString('ru-RU')} объявлений
        </p>
      </div>
    </article>
  );
};

export default ModelCard;
