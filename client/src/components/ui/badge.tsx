import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline';
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps): React.ReactElement {
  const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    outline: 'bg-transparent text-slate-700 border-slate-300',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
