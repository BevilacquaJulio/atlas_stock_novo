import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useDashboard } from '../features/dashboard/dashboard.hooks';
import type { DashboardAlerta } from '../features/dashboard/dashboard.types';
import { IconBell } from './icons';

const ALERT_ROUTES: Record<string, string> = {
  compras: '/compras',
  despesas: '/financeiro',
  estoque: '/cadastros/produtos',
};

function alertTone(severidade: DashboardAlerta['severidade']) {
  return severidade === 'warning'
    ? 'border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]'
    : 'border-[#e5e5e5] bg-[#fafafa] text-[#0a0a0a]';
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const query = useDashboard();

  const alertas = query.data?.alertas ?? [];
  const count = alertas.length;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onPointer);
    return () => window.removeEventListener('mousedown', onPointer);
  }, [open]);

  return (
    <div ref={rootRef} className="relative mr-2">
      <button
        type="button"
        aria-label={
          count > 0
            ? `${count} notificação${count > 1 ? 'ões' : ''}`
            : 'Notificações'
        }
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        <IconBell width={18} height={18} aria-hidden="true" />
        {count > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[0.625rem] font-bold text-white ring-2 ring-[#0a0a0a]">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-[var(--shadow-lift)] ring-1 ring-black/5"
          >
            <div className="border-b border-[#e5e5e5] px-4 py-3">
              <p className="text-sm font-semibold text-[#0a0a0a]">Notificações</p>
              <p className="text-xs text-[#0a0a0a]/45">
                Alertas operacionais do sistema
              </p>
            </div>

            <div className="obsidian-scroll max-h-80 overflow-y-auto p-2">
              {query.isLoading ? (
                <p className="px-3 py-6 text-center text-sm text-[#0a0a0a]/45">
                  Carregando…
                </p>
              ) : count === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-[#0a0a0a]/45">
                  Nenhuma notificação no momento.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {alertas.map((alerta) => {
                    const to = ALERT_ROUTES[alerta.tipo] ?? '/';
                    return (
                      <li key={alerta.tipo}>
                        <Link
                          to={to}
                          onClick={() => setOpen(false)}
                          className={`block rounded-lg border px-3 py-2.5 text-sm transition-colors hover:border-[#0a0a0a]/20 ${alertTone(alerta.severidade)}`}
                        >
                          <span className="font-medium">{alerta.mensagem}</span>
                          <span className="mt-1 block text-xs opacity-70">
                            Toque para abrir
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {count > 0 && (
              <div className="border-t border-[#e5e5e5] p-2">
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-center text-xs font-semibold text-[#0a0a0a]/65 transition-colors hover:bg-[#f0f0f0] hover:text-[#0a0a0a]"
                >
                  Ver dashboard completo
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
