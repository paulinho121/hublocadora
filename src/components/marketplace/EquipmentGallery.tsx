import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';

/**
 * Galeria do equipamento: desliza com o dedo no celular, setas no computador,
 * miniaturas e tela cheia (toque na foto).
 */
export function EquipmentGallery({ images, name, badge }: { images: string[]; name: string; badge?: React.ReactNode }) {
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const count = images.length;

  // Troca de equipamento (sugestões abrem na mesma página): volta para a primeira foto
  useEffect(() => {
    setActive(0);
    trackRef.current?.scrollTo({ left: 0 });
  }, [images.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (i: number) => {
    const next = (i + count) % count;
    setActive(next);
    const track = trackRef.current;
    if (track) track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
  };

  // Atualiza a foto ativa enquanto a pessoa desliza
  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== active) setActive(i);
  };

  // Tela cheia: setas do teclado e Esc
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
      if (e.key === 'ArrowRight') setActive(a => (a + 1) % count);
      if (e.key === 'ArrowLeft') setActive(a => (a - 1 + count) % count);
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [fullscreen, count]);

  // Ao sair da tela cheia, a galeria mostra a mesma foto
  useEffect(() => {
    if (!fullscreen) {
      const track = trackRef.current;
      if (track) track.scrollTo({ left: active * track.clientWidth });
    }
  }, [fullscreen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (count === 0) {
    return (
      <div className="aspect-[4/3] rounded-2xl bg-zinc-900 border border-zinc-800 relative flex flex-col items-center justify-center gap-2 text-zinc-500">
        <Camera className="w-14 h-14" />
        <span className="text-sm">Sem fotos</span>
        {badge && <div className="absolute top-4 left-4">{badge}</div>}
      </div>
    );
  }

  const arrowClass = 'hidden md:flex absolute top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-zinc-950/80 border border-zinc-800 items-center justify-center text-zinc-200 hover:bg-zinc-900 transition-colors';

  return (
    <div className="space-y-3">
      <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 relative group" role="region" aria-roledescription="galeria" aria-label={`Fotos de ${name}`}>
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="h-full flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, i) => (
            <button
              key={src + i}
              onClick={() => { setActive(i); setFullscreen(true); }}
              className="h-full w-full shrink-0 snap-center cursor-zoom-in"
              aria-label={`Ampliar foto ${i + 1} de ${count}`}
            >
              <img src={src} alt={`${name} — foto ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} className="w-full h-full object-contain p-6" />
            </button>
          ))}
        </div>

        {badge && <div className="absolute top-4 left-4 pointer-events-none">{badge}</div>}

        {count > 1 && (
          <>
            <button onClick={() => goTo(active - 1)} className={`${arrowClass} left-3`} aria-label="Foto anterior">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => goTo(active + 1)} className={`${arrowClass} right-3`} aria-label="Próxima foto">
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-zinc-950/80 border border-zinc-800 text-[11px] font-semibold text-zinc-200 tabular-nums" aria-live="polite">
              {active + 1}/{count}
            </span>
          </>
        )}
        <span className="pointer-events-none absolute bottom-3 left-3 h-8 w-8 rounded-full bg-zinc-950/80 border border-zinc-800 hidden md:flex items-center justify-center text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
          <Expand className="h-4 w-4" />
        </span>
      </div>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((src, i) => (
            <button
              key={src + i}
              onClick={() => goTo(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={active === i}
              className={`w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 shrink-0 bg-zinc-900 transition-all ${active === i ? 'border-primary' : 'border-zinc-800 opacity-60 hover:opacity-100'}`}
            >
              <img src={src} alt="" className="w-full h-full object-contain p-1" />
            </button>
          ))}
        </div>
      )}

      {/* Portal no body: um ancestral animado (transform) prenderia o "fixed" dentro da página */}
      {fullscreen && createPortal(
        <div className="palette-original fixed inset-0 z-[200] bg-black/95 flex flex-col" role="dialog" aria-modal="true" aria-label={`Fotos de ${name}`}>
          <div className="flex items-center justify-between px-4 h-14 shrink-0" style={{ marginTop: 'env(safe-area-inset-top)' }}>
            <span className="text-sm font-semibold text-white/80 tabular-nums">{active + 1}/{count}</span>
            <button onClick={() => setFullscreen(false)} className="h-11 w-11 rounded-full flex items-center justify-center text-white hover:bg-white/10" aria-label="Fechar fotos">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 relative flex items-center justify-center min-h-0 px-2" onClick={() => setFullscreen(false)}>
            <img src={images[active]} alt={`${name} — foto ${active + 1}`} className="max-h-full max-w-full object-contain" onClick={e => e.stopPropagation()} />
            {count > 1 && (
              <>
                <button onClick={e => { e.stopPropagation(); setActive(a => (a - 1 + count) % count); }} className="absolute left-2 md:left-6 h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20" aria-label="Foto anterior">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button onClick={e => { e.stopPropagation(); setActive(a => (a + 1) % count); }} className="absolute right-2 md:right-6 h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20" aria-label="Próxima foto">
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
          <div className="h-6 shrink-0" style={{ marginBottom: 'env(safe-area-inset-bottom)' }} />
        </div>,
        document.body,
      )}
    </div>
  );
}
