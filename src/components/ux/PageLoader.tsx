import React from 'react';

/**
 * Full-page loading spinner used as the Suspense fallback for lazy-loaded routes.
 */
export default function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-navy-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
