import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 active:scale-95 disabled:opacity-50 disabled:pointer-events-none';
    
    const variantClasses = {
      default: 'bg-[var(--primary-color)] text-white hover:bg-[var(--primary-hover)] focus:ring-[var(--primary-color)] shadow-sm hover:shadow',
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'hover:bg-[var(--neutral-100)] text-[var(--neutral-700)] dark:hover:bg-gray-700 dark:text-gray-200',
      destructive: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-sm hover:shadow'
    };

    const sizeClasses = {
      default: 'px-4 py-2 rounded-lg text-sm',
      sm: 'px-3 py-1.5 rounded-md text-xs',
      lg: 'px-6 py-3 rounded-lg text-base'
    };

    return (
      <button
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };