// ─── Slider ──────────────────────────────────────────────────────────
import { type InputHTMLAttributes, forwardRef } from 'react';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  showValue?: boolean;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, showValue = true, className = '', id, value, ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="flex flex-col gap-1.5">
        {(label || showValue) && (
          <div className="flex items-center justify-between">
            {label && (
              <label htmlFor={inputId} className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {label}
              </label>
            )}
            {showValue && (
              <span className="text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
                {value}
              </span>
            )}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type="range"
          value={value}
          className={`
            h-2 w-full cursor-pointer appearance-none rounded-full
            bg-neutral-200 accent-brand-500
            dark:bg-neutral-700
            ${className}
          `.trim()}
          {...props}
        />
      </div>
    );
  },
);
Slider.displayName = 'Slider';
