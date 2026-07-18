import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-12 h-12 bg-surface-100 rounded-xl flex items-center justify-center mb-4 text-surface-400">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-sm font-semibold text-surface-700 mb-1">{title}</h3>
      {description && <p className="text-xs text-surface-500 max-w-xs mb-4">{description}</p>}
      {action && <button onClick={action.onClick} className="btn-primary text-xs">{action.label}</button>}
    </div>
  );
}
