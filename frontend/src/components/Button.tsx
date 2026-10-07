import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'onAnimationStart' | 'onAnimationEnd' | 'onDrag' | 'onDragStart' | 'onDragEnd'
  > {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const base =
  'relative inline-flex cursor-pointer items-center justify-center transition-shadow disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0a0a0a]/40';

const sizes: Record<Size, string> = {
  md: 'gap-2 rounded-lg px-4 py-2 text-sm font-semibold',
  sm: 'gap-1 rounded-md px-2 py-1 text-xs font-medium',
};

const variants: Record<Variant, string> = {
  primary: 'neon-black',
  secondary:
    'border border-[#e5e5e5] bg-white text-[#0a0a0a] shadow-sm transition-colors hover:border-[#0a0a0a] hover:bg-[#fafafa]',
  danger:
    'border border-[#0a0a0a] bg-white text-[#0a0a0a] shadow-sm transition-colors hover:bg-[#0a0a0a] hover:text-white',
  ghost: 'text-[#0a0a0a]/70 transition-colors hover:bg-[#f0f0f0] hover:text-[#0a0a0a]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { y: -1, scale: 1.01 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className={`animate-spin rounded-full border-2 border-current border-t-transparent ${
            size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
          }`}
        />
      )}
      {children}
    </motion.button>
  );
}
