import React from 'react';

interface ProgressBarProps {
  percentage: number;
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  label,
  sublabel,
  size = 'md',
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));

  return (
    <div className="w-full">
      {(label || sublabel) && (
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
          <span className="text-slate-700">{label}</span>
          <span className="tabular-nums font-semibold text-navy-900">
            {sublabel ?? `${clamped}%`}
          </span>
        </div>
      )}
      <div
        className={`w-full overflow-hidden rounded-full bg-slate-200 ${
          size === 'sm' ? 'h-2' : 'h-2.5'
        }`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-teal-600 transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
