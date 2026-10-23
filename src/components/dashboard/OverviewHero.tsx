import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Topo da Visão geral no estilo de app de banco: faixa na cor da marca com o
 * número principal (dá para esconder) e atalhos em pílula logo abaixo.
 */

const HIDE_KEY = 'cinehub-hide-values';

function readHidden() {
  try { return localStorage.getItem(HIDE_KEY) === '1'; } catch { return false; }
}

interface HeroAction {
  label: string;
  onClick: () => void;
}

interface OverviewHeroProps {
  label: string;
  value: string;
  sub?: string;
  actions: HeroAction[];
}

export function OverviewHero({ label, value, sub, actions }: OverviewHeroProps) {
  const [hidden, setHidden] = useState(readHidden);

  const toggle = () => {
    setHidden(h => {
      try { localStorage.setItem(HIDE_KEY, h ? '0' : '1'); } catch { /* sem armazenamento: só nesta tela */ }
      return !h;
    });
  };

  return (
    <section
      aria-label={label}
      className="relative overflow-hidden bg-gradient-to-b from-[#2b2b30] to-[#1c1c20] text-white [--color-white:#fff] [--color-black:#000] -mx-4 -mt-4 px-5 pt-4 pb-16 md:mx-0 md:mt-0 md:pb-8 md:rounded-3xl md:px-8 md:pt-8"
    >
      {/* Sombra suave só embaixo: dá profundidade sem criar emenda com o cabeçalho */}
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-black/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="relative max-w-lg mx-auto md:max-w-none text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-2">
          <p className="text-sm font-medium text-white/85">{label}</p>
          <button
            onClick={toggle}
            aria-label={hidden ? 'Mostrar valores' : 'Esconder valores'}
            aria-pressed={hidden}
            className="h-8 w-8 -my-1 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10"
          >
            {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <p className="mt-1 text-3xl md:text-4xl font-bold tracking-tight tabular-nums" aria-live="polite">
          {hidden ? 'R$ ••••••' : value}
        </p>
        {sub && <p className="mt-1 text-xs text-white/75">{hidden ? '••••' : sub}</p>}

        {actions.length > 0 && (
          <div className="mt-5 flex justify-center md:justify-start gap-2 flex-wrap">
            {actions.map(a => (
              <button
                key={a.label}
                onClick={a.onClick}
                className="h-10 px-4 rounded-full bg-white/15 text-sm font-semibold text-white hover:bg-white/25 active:bg-white/30 backdrop-blur-sm transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
