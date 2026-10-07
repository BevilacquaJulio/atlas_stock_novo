import type { ReactNode } from 'react';
import { IconSearch } from './icons';

export function ListToolbar({
  search,
  onSearchChange,
  placeholder = 'Buscar…',
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-56">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#0a0a0a]/35">
          <IconSearch width={18} height={18} />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded-lg border border-[#e5e5e5] bg-white py-2 pl-10 pr-3 text-sm text-[#0a0a0a] shadow-sm outline-none transition-all placeholder:text-[#0a0a0a]/35 hover:border-[#a3a3a3] focus:border-[#0a0a0a] focus:ring-4 focus:ring-[#0a0a0a]/10"
        />
      </div>
      {children}
    </div>
  );
}

export function TableContainer({ children }: { children: ReactNode }) {
  return (
    <div className="obsidian-scroll overflow-x-auto rounded-xl border border-[#e5e5e5] bg-white shadow-[var(--shadow-soft)]">
      <table className="w-full min-w-[640px] text-left text-sm">
        {children}
      </table>
    </div>
  );
}
