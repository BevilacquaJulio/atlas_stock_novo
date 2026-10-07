import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="cursor-pointer rounded-md p-1.5 text-[#0a0a0a]/55 transition-colors hover:bg-[#0a0a0a] hover:text-white"
    >
      {children}
    </motion.button>
  );
}
