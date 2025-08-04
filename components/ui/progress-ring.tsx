import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  label?: string;
  color?: 'primary' | 'warning' | 'success' | 'danger';
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max,
  size = 48,
  strokeWidth = 4,
  className,
  showLabel = true,
  label,
  color = 'primary',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const strokeDasharray = `${progress * circumference}, ${circumference}`;
  const percentage = Math.round(progress * 100);

  const colorClasses = {
    primary: 'stroke-primary',
    warning: 'stroke-orange-500',
    success: 'stroke-green-500',
    danger: 'stroke-red-500',
  };

  // Generate unique IDs for accessibility
  const labelId = React.useId();
  const describedById = label ? `${labelId}-desc` : undefined;

  return (
    <div 
      className={cn('relative flex items-center justify-center', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label || `Progress: ${percentage}% complete`}
      aria-describedby={describedById}
    >
      <svg className="transform -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          className="stroke-muted"
          strokeWidth={strokeWidth}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          className={cn(
            colorClasses[color], 
            'transition-all duration-300 ease-in-out [transition-property:stroke-dasharray,stroke]'
          )}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeDasharray={strokeDasharray}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-semibold text-foreground" id={labelId}>
            {value}/{max}
          </span>
          {label && (
            <span 
              className="text-[10px] text-muted-foreground leading-none" 
              id={describedById}
            >
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};