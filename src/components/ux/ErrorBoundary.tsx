import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props { children: ReactNode; level?: 'page' | 'component'; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  resetError = () => { this.setState({ hasError: false, error: null }); };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className={`flex flex-col items-center justify-center text-center ${this.props.level === 'page' ? 'py-24' : 'py-10'}`}>
        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4 border border-red-200">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-sm font-semibold text-surface-700 mb-1">Something went wrong</h3>
        <p className="text-xs text-surface-500 max-w-xs mb-4">{this.state.error?.message || 'An unexpected error occurred.'}</p>
        <button onClick={this.resetError} className="btn-secondary text-xs flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Retry</button>
      </div>
    );
  }
}
