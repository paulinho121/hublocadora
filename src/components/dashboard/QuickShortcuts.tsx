import type { LucideIcon } from 'lucide-react';

/** Grade de atalhos (4 por linha), como os botões de um app de banco */

export interface Shortcut {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  badge?: number;
}

export function QuickShortcuts({ items }: { items: Shortcut[] }) {
  return (
    <nav aria-label="Atalhos" className="grid grid-cols-4 gap-2">
      {items.map(({ id, label, icon: Icon, onClick, badge }) => (
        <button
          key={id}
          onClick={onClick}
          className="relative flex flex-col items-center justify-center gap-2 min-h-[84px] px-1 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-sm hover:border-zinc-700 active:bg-zinc-900 transition-colors"
        >
          <Icon className="h-5 w-5 text-zinc-200" aria-hidden />
          <span className="text-[11px] font-semibold leading-tight text-zinc-200 text-center">{label}</span>
          {!!badge && badge > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center" aria-label={`${badge} pendentes`}>
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
