import { motion } from 'framer-motion';

export interface FilterTabOption<T extends string = string> {
  value: T;
  label: string;
}

interface FilterTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: FilterTabOption<T>[];
  /** Identificador único para o indicador animado (layoutId). */
  scope: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Abas de filtro horizontais — Atlas Stock.
 * Indicador deslizante com layoutId, igual à sidebar.
 */
export function FilterTabs<T extends string>({
  value,
  onChange,
  options,
  scope,
  className = '',
  'aria-label': ariaLabel = 'Filtros',
}: FilterTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`mb-4 inline-flex max-w-full flex-wrap gap-1.5 rounded-xl border border-[#e5e5e5] bg-white p-1.5 shadow-[var(--shadow-soft)] ${className}`}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value || '__all__'}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`relative my-0.5 cursor-pointer overflow-visible rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a]/25 ${
              isActive
                ? 'text-white'
                : 'text-[#0a0a0a]/65 hover:bg-[#f0f0f0] hover:text-[#0a0a0a]'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={`${scope}-filter-active`}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                className="neon-black absolute inset-0 rounded-lg"
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
