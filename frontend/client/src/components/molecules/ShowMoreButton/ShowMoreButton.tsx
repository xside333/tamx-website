import React from 'react';
import Button from '../../atoms/Button/Button';

interface ShowMoreButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const ShowMoreButton: React.FC<ShowMoreButtonProps> = ({ onClick, loading = false, disabled = false, className, children }) => {
  return (
    <div className={className}>
      <Button
        variant="secondary"
        size="md"
        onClick={onClick}
        loading={loading}
        disabled={disabled}
        className="w-full md:w-auto"
      >
        {children || 'Показать еще'}
      </Button>
    </div>
  );
};

export default ShowMoreButton;
