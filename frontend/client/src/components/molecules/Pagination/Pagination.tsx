import React from 'react';
import { cn } from '../../../lib/utils';
import { Button } from '../../atoms';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  className,
}) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);
    
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
  };

  const visiblePages = getVisiblePages();
  const showFirstPage = visiblePages[0] > 1;
  const showLastPage = visiblePages[visiblePages.length - 1] < totalPages;
  const showFirstEllipsis = visiblePages[0] > 2;
  const showLastEllipsis = visiblePages[visiblePages.length - 1] < totalPages - 1;

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {/* Previous button */}
      <Button
        variant="secondary"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || disabled}
        className="min-w-[80px]"
      >
        Назад
      </Button>

      {/* First page */}
      {showFirstPage && (
        <>
          <Button
            variant="secondary"
            onClick={() => onPageChange(1)}
            disabled={disabled}
          >
            1
          </Button>
          {showFirstEllipsis && (
            <span className="px-2 text-secondary">...</span>
          )}
        </>
      )}

      {/* Visible pages */}
      {visiblePages.map(page => (
        <Button
          key={page}
          variant={page === currentPage ? "primary" : "secondary"}
          onClick={() => onPageChange(page)}
          disabled={disabled}
          className="min-w-[40px]"
        >
          {page}
        </Button>
      ))}

      {/* Last page */}
      {showLastPage && (
        <>
          {showLastEllipsis && (
            <span className="px-2 text-secondary">...</span>
          )}
          <Button
            variant="secondary"
            onClick={() => onPageChange(totalPages)}
            disabled={disabled}
          >
            {totalPages}
          </Button>
        </>
      )}

      {/* Next button */}
      <Button
        variant="secondary"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || disabled}
        className="min-w-[80px]"
      >
        Вперед
      </Button>
    </div>
  );
};

export default Pagination;
