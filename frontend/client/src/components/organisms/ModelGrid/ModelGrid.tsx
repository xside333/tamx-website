import React from 'react';
import { cn } from '../../../lib/utils';
import { CatalogModelItem } from '../../../lib/api';
import { ModelCard } from '../ModelCard';

interface ModelGridProps {
  models: CatalogModelItem[];
  loading?: boolean;
  error?: string;
  onModelClick?: (brand: string, model: string) => void;
  onRetry?: () => void;
  className?: string;
}

const ModelGridSkeleton: React.FC = () => (
  <div className="model-grid">
    {Array.from({ length: 12 }).map((_, i) => (
      <div key={i} className="model-card model-card--skeleton">
        <div className="model-card__photos">
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className="model-card__photo-cell skeleton" />
          ))}
        </div>
        <div className="model-card__body">
          <div className="skeleton model-card__skeleton-title" />
          <div className="skeleton model-card__skeleton-price" />
          <div className="skeleton model-card__skeleton-specs" />
          <div className="skeleton model-card__skeleton-count" />
        </div>
      </div>
    ))}
  </div>
);

const ModelGrid: React.FC<ModelGridProps> = ({
  models,
  loading,
  error,
  onModelClick,
  onRetry,
  className,
}) => {
  if (loading) {
    return <ModelGridSkeleton />;
  }

  if (error) {
    return (
      <div className="model-grid__error">
        <p className="text-secondary">Не удалось загрузить список моделей</p>
        {onRetry && (
          <button className="btn btn-secondary mt-4" onClick={onRetry}>
            Попробовать снова
          </button>
        )}
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="model-grid__empty">
        <p className="text-secondary">Модели не найдены. Попробуйте изменить фильтры.</p>
      </div>
    );
  }

  return (
    <div className={cn('model-grid', className)}>
      {models.map((model) => (
        <ModelCard
          key={`${model.brand}|${model.model}`}
          model={model}
          onClick={onModelClick}
        />
      ))}
    </div>
  );
};

export default ModelGrid;
