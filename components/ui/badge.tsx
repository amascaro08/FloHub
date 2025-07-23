import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
  children: React.ReactNode;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors';
    
    const variantClasses = {
      default: 'bg-[var(--primary-color)] text-white',
      secondary: 'bg-[var(--neutral-200)] text-[var(--neutral-700)] dark:bg-gray-700 dark:text-gray-200',
      destructive: 'bg-red-500 text-white',
      outline: 'border border-[var(--neutral-300)] text-[var(--neutral-700)] dark:border-gray-600 dark:text-gray-200',
      success: 'bg-green-500 text-white'
    };

    return (
      <div
        className={cn(
          baseClasses,
          variantClasses[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };