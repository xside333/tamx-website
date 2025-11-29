import React from 'react';
import { Button } from '../../atoms';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError?: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Ошибка перехвачена ErrorBoundary
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({ error, resetError }) => (
  <div className="text-center py-16">
    <div className="w-24 h-24 mx-auto mb-6 bg-status-error/10 rounded-full flex items-center justify-center">
      <svg className="w-12 h-12 text-status-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-primary mb-2">Что-то пошло не так</h3>
    <div className="text-secondary mb-6 max-w-md mx-auto">
      <p className="text-sm">
        {error?.message || 'Произошла неожиданная ошибка при отображении компонента'}
      </p>
    </div>
    {resetError && (
      <Button 
        onClick={resetError}
        variant="primary"
      >
        Попробовать снова
      </Button>
    )}
  </div>
);

// Keep the ErrorState component for backward compatibility and non-boundary error states
interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  title?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  error, 
  onRetry, 
  title = "Ошибка загрузки" 
}) => (
  <div className="text-center py-16">
    <div className="w-24 h-24 mx-auto mb-6 bg-status-error/10 rounded-full flex items-center justify-center">
      <svg className="w-12 h-12 text-status-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-primary mb-2">{title}</h3>
    <div className="text-secondary mb-6 max-w-md mx-auto">
      <p className="text-sm">{error}</p>
    </div>
    {onRetry && (
      <Button 
        onClick={onRetry}
        variant="primary"
      >
        Повторить попытку
      </Button>
    )}
  </div>
);

export default ErrorBoundary;
