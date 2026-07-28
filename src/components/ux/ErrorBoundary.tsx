import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; level?: 'page' | 'component'; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }

  resetError = () => {
    const isChunkError =
      this.state.error?.message?.toLowerCase().includes('failed to fetch dynamically imported module') ||
      this.state.error?.message?.toLowerCase().includes('importing a module script failed') ||
      this.state.error?.message?.toLowerCase().includes('loading chunk');

    if (isChunkError) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isChunkError =
      this.state.error?.message?.toLowerCase().includes('failed to fetch dynamically imported module') ||
      this.state.error?.message?.toLowerCase().includes('importing a module script failed') ||
      this.state.error?.message?.toLowerCase().includes('loading chunk');

    return (
      <div className={`flex flex-col items-center justify-center text-center ${this.props.level === 'page' ? 'py-24' : 'py-10'}`}>
        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 border border-amber-200">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
        </div>
        <h3 className="text-sm font-semibold text-surface-700 mb-1">
          {isChunkError ? 'New Update Available' : 'Something went wrong'}
        </h3>
        <p className="text-xs text-surface-500 max-w-xs mb-4">
          {isChunkError
            ? 'The application has been updated with a new deployment. Please click below to load the latest version.'
            : this.state.error?.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={this.resetError}
          className="btn-primary text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {isChunkError ? 'Refresh Page' : 'Retry'}
        </button>
      </div>
    );
  }
}
