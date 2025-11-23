import React from 'react';
import { cn } from '@/utils/cn';

const badgeVariants = {
  default: 'bg-primary/10 text-primary hover:text-accent',
  secondary: 'bg-secondary/10 text-secondary hover:text-accent',
  destructive: 'bg-destructive/10 text-destructive hover:text-accent',
  outline: 'bg-transparent text-foreground hover:text-accent',
};

export const Badge = React.forwardRef(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors',
          badgeVariants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';