import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass rounded-[24px] p-8 max-w-md text-center space-y-4">
              <div className="text-4xl">⚠️</div>
              <h2 className="text-xl font-semibold">Something went wrong</h2>
              <p className="text-text-muted text-sm">{this.state.error?.message}</p>
              <Button onClick={() => window.location.reload()}>Reload Page</Button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
