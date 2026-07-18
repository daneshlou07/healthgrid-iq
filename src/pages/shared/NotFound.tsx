import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-navy-800 mb-2">Page Not Found</h1>
        <p className="text-sm text-surface-500 mb-6">
          The page you're looking for doesn't exist or you don't have permission to access it.
        </p>
        <Link to="/dashboard" className="btn-primary inline-flex items-center gap-2">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
