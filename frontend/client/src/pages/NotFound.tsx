import React from 'react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-primary mb-4">
          Страница не найдена
        </h1>
        <p className="text-secondary mb-6 max-w-md mx-auto">
          Запрашиваемая страница не существует или была перемещена.
        </p>
        <a 
          href="/catalog" 
          className="btn btn-primary inline-flex items-center"
        >
          Перейти к каталогу
        </a>
      </div>
    </div>
  );
}
