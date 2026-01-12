import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  description?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

/**
 * Componente card metrica con accessibilità
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  trend,
  trendValue,
  icon,
  description,
  onClick,
  ariaLabel
}) => {
  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-slate-600 bg-slate-50'
  };

  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 p-4 ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : -1}
      onKeyPress={
        onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined
      }
      aria-label={ariaLabel || `${title}: ${value}${unit ? ` ${unit}` : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-slate-500 uppercase font-semibold">{title}</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">
            {value}
            {unit && <span className="text-sm text-slate-500 ml-1">{unit}</span>}
          </p>
        </div>
        {icon && <div className="text-2xl opacity-50">{icon}</div>}
      </div>

      {description && <p className="text-xs text-slate-600 mb-2">{description}</p>}

      {trend && trendValue && (
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${trendColors[trend]}`}>
          <span>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
};

interface DashboardGridProps {
  columns?: number;
  children: React.ReactNode;
}

/**
 * Grid responsive per dashboard
 */
export const DashboardGrid: React.FC<DashboardGridProps> = ({ columns = 4, children }) => {
  const colClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4'
  };

  return (
    <div className={`grid gap-4 grid-cols-1 md:${colClass[columns as keyof typeof colClass] || 'grid-cols-4'} `}>
      {children}
    </div>
  );
};
