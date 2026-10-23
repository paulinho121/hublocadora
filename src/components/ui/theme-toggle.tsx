import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme';

/** Alterna entre tema claro (padrão) e escuro. */
export function ThemeToggle({ className = '', onBrand = false }: { className?: string; onBrand?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Usar tema claro' : 'Usar tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      className={`h-10 w-10 shrink-0 flex items-center justify-center transition-colors ${onBrand
        ? 'rounded-full bg-white/15 text-white hover:bg-white/25'
        : 'rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white hover:border-zinc-700'} ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
