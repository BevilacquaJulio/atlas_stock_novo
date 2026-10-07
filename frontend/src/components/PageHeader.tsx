import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mb-6 flex flex-wrap items-end justify-between gap-3"
    >
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0a0a0a]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-[#0a0a0a]/55">{subtitle}</p>
        )}
      </div>
      {action}
    </motion.div>
  );
}
