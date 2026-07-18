import React from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  children: React.ReactNode;
}

export default function LoadingButton({ loading, variant = 'primary', children, disabled, className = '', ...props }: Props) {
  const base = variant === 'primary' ? 'btn-primary' :
               variant === 'secondary' ? 'btn-secondary' :
               variant === 'danger' ? 'btn-danger' :
               'btn-success';

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${base} ${className} relative disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </span>
      )}
      <span className={loading ? 'invisible' : ''}>{children}</span>
    </button>
  );
}
