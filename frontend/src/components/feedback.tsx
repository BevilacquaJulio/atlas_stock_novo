import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 py-12 text-sm text-[#0a0a0a]/55"
    >
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-[#0a0a0a]/15 border-t-[#0a0a0a]"
      />
      {label}
    </div>
  );
}

type AlertKind = 'error' | 'success' | 'info';

const alertStyles: Record<AlertKind, string> = {
  error: 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca] border-l-4 border-l-[#dc2626]',
  success: 'bg-white text-[#0a0a0a] border-[#404040] border-l-4',
  info: 'bg-white text-[#0a0a0a] border-[#d4d4d4] border-l-4',
};

function AlertIcon({ kind }: { kind: AlertKind }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (kind === 'success') {
    return (
      <svg {...common}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  if (kind === 'error') {
    return (
      <svg {...common}>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </svg>
  );
}

export function Alert({
  kind = 'info',
  children,
}: {
  kind?: AlertKind;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -6, height: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      role={kind === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 overflow-hidden rounded-lg border px-4 py-3 text-sm shadow-sm ${alertStyles[kind]}`}
    >
      <span className="mt-0.5 shrink-0">
        <AlertIcon kind={kind} />
      </span>
      <div className="flex-1">{children}</div>
    </motion.div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#d4d4d4] bg-white/60 py-12 text-center"
    >
      <p className="text-base font-semibold text-[#0a0a0a]">{title}</p>
      {description && <p className="text-sm text-[#0a0a0a]/55">{description}</p>}
      {action}
    </motion.div>
  );
}
