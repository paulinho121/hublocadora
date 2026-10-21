import React, { useState, useEffect } from 'react';

interface AnimatedGlowingSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
}

// Sugestões genéricas (por tipo/marca): exemplos de modelos específicos que não estão
// no catálogo frustram quem busca
const PLACEHOLDERS = [
  'Busque por nome ou marca...',
  'Painel de LED...',
  'Aputure...',
  'Iluminação...',
  'Tripés e suportes...',
  'Áudio e microfones...',
];

const AnimatedGlowingSearchBar = ({
  value,
  onChange,
  onSearch,
}: AnimatedGlowingSearchBarProps) => {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (value) return; // Para animação enquanto o usuário digita

    const current = PLACEHOLDERS[placeholderIndex];

    if (isPaused) {
      const timeout = setTimeout(() => setIsPaused(false), 1800);
      return () => clearTimeout(timeout);
    }

    if (!isDeleting && displayText === current) {
      setIsPaused(true);
      setIsDeleting(true);
      return;
    }

    if (isDeleting && displayText === '') {
      setIsDeleting(false);
      setPlaceholderIndex(i => (i + 1) % PLACEHOLDERS.length);
      return;
    }

    const speed = isDeleting ? 30 : 55;
    const timeout = setTimeout(() => {
      setDisplayText(isDeleting
        ? current.slice(0, displayText.length - 1)
        : current.slice(0, displayText.length + 1)
      );
    }, speed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, isPaused, placeholderIndex, value]);

  // Reset animação quando o usuário limpa o campo
  useEffect(() => {
    if (!value) {
      setDisplayText('');
      setIsDeleting(false);
      setIsPaused(false);
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className="relative w-full group">
      {/* Placeholder animado — só aparece quando não há valor digitado e não está focado */}
      {!value && (
        <div className="group-focus-within:opacity-0 transition-opacity pointer-events-none absolute left-12 md:left-14 right-24 top-1/2 -translate-y-1/2 flex items-center gap-[2px] overflow-hidden z-[1]">
          <span className="text-sm md:text-base text-zinc-500 font-medium whitespace-nowrap">
            {displayText}
          </span>
          <span className="inline-block w-[2px] h-[16px] bg-primary/70 animate-pulse rounded-full ml-[1px]" />
        </div>
      )}

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder=""
        aria-label="Buscar equipamento"
        className="w-full h-[52px] md:h-[56px] rounded-xl bg-zinc-950 border border-zinc-800 text-white pl-12 md:pl-14 pr-24 text-sm md:text-base shadow-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-colors"
      />

      {/* Ícone de busca */}
      <svg className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      {/* Botão buscar */}
      <button
        type="button"
        onClick={onSearch}
        className="absolute top-1/2 -translate-y-1/2 right-1.5 h-10 md:h-11 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        Buscar
      </button>
    </div>
  );
};

export default AnimatedGlowingSearchBar;
