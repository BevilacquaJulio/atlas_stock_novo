import { motion } from 'framer-motion';
import { IconLogout } from './icons';
import type { Cargo } from '../features/auth/auth.types';

const CARGO_LABEL: Record<Cargo, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE: 'Gerente',
  OPERADOR: 'Operador',
};

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface UserSessionBarProps {
  nome: string;
  cargo: Cargo;
  onLogout: () => void;
  /** Versão compacta para telas estreitas ou rodapé do drawer. */
  compact?: boolean;
  /** `dark` no header obsidiana; `light` no drawer mobile. */
  variant?: 'dark' | 'light';
}

/**
 * Bloco de sessão do usuário — header Atlas Stock.
 * Avatar com brilho, cargo em selo técnico e saída discreta integrada.
 */
export function UserSessionBar({
  nome,
  cargo,
  onLogout,
  compact = false,
  variant = 'dark',
}: UserSessionBarProps) {
  const isDark = variant === 'dark';

  const shell = isDark
    ? 'bg-white/[0.07] ring-white/12'
    : 'border border-[#e5e5e5] bg-[#fafafa] shadow-[var(--shadow-soft)]';

  const nameCls = isDark ? 'text-white' : 'text-[#0a0a0a]';
  const cargoCls = isDark
    ? 'border-white/20 text-white/55'
    : 'border-[#d4d4d4] text-[#0a0a0a]/50';
  const dividerCls = isDark ? 'bg-white/12' : 'bg-[#e5e5e5]';
  const logoutCls = isDark
    ? 'text-white/60 hover:bg-white hover:text-[#0a0a0a] focus-visible:ring-white/30'
    : 'text-[#0a0a0a]/55 hover:bg-[#0a0a0a] hover:text-white focus-visible:ring-[#0a0a0a]/25';

  const avatarRing = isDark
    ? 'ring-white/20 bg-white/10 text-white'
    : 'ring-[#e5e5e5] bg-white text-[#0a0a0a]';

  return (
    <div
      className={`flex items-center gap-0.5 rounded-xl p-1 ring-1 ${shell}`}
    >
      <div
        className={`flex min-w-0 items-center gap-2.5 ${compact ? 'px-1.5 py-1' : 'px-2 py-1'}`}
      >
        <span className="relative shrink-0">
          {isDark && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-white/25 blur-[6px]"
            />
          )}
          <span
            className={`relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold tracking-tight ring-1 ${avatarRing}`}
            aria-hidden="true"
          >
            {getInitials(nome)}
          </span>
        </span>

        {!compact && (
          <div className="hidden min-w-0 sm:block">
            <p
              className={`truncate text-sm font-semibold leading-tight ${nameCls}`}
              title={nome}
            >
              {nome}
            </p>
            <span
              className={`mt-0.5 inline-flex rounded-full border px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-[0.12em] ${cargoCls}`}
            >
              {CARGO_LABEL[cargo]}
            </span>
          </div>
        )}
      </div>

      <span
        aria-hidden="true"
        className={`mx-0.5 hidden h-6 w-px shrink-0 sm:block ${dividerCls}`}
      />

      <motion.button
        type="button"
        onClick={onLogout}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${logoutCls} ${isDark ? 'focus-visible:ring-offset-[#0a0a0a]' : 'focus-visible:ring-offset-white'}`}
        aria-label="Sair da conta"
      >
        <IconLogout width={15} height={15} aria-hidden="true" />
        <span className={compact ? 'sr-only' : 'hidden md:inline'}>Sair</span>
      </motion.button>
    </div>
  );
}
