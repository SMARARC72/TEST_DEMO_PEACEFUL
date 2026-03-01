// ─── Card ────────────────────────────────────────────────────────────
import { type HTMLAttributes, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ glass, className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`
        rounded-xl border border-neutral-200 bg-white p-5 shadow-sm
        dark:border-neutral-700 dark:bg-neutral-800
        ${glass ? 'backdrop-blur-md bg-white/70 dark:bg-neutral-800/70' : ''}
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </div>
  ),
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`mb-3 flex items-center justify-between ${className}`} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', ...props }, ref) => (
    <h3 ref={ref} className={`text-lg font-semibold text-neutral-900 dark:text-neutral-50 ${className}`} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={className} {...props} />
  ),
);
CardContent.displayName = 'CardContent';
