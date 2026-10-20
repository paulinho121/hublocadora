import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Camera, ChevronRight, Clock, FolderPlus, FolderCheck, CalendarCheck, CalendarX, CalendarClock } from 'lucide-react';
import { Equipment } from '@/types/database';
import { FavoriteButton } from './FavoriteButton';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';

interface EquipmentCardProps {
  item: Equipment;
  onClick: () => void;
  rentedQuantity?: number;
  nextReturnDate?: string | null;
  /** Unidades já reservadas para datas futuras (não ocupam estoque hoje) */
  upcomingQuantity?: number;
  nextUpcomingStart?: string | null;
  /** null = project dates not yet set; true/false = available/unavailable for chosen dates */
  isAvailableForDates?: boolean | null;
  projectDates?: { start: string; end: string } | null;
}

export function EquipmentCard({
  item,
  onClick,
  rentedQuantity = 0,
  nextReturnDate = null,
  upcomingQuantity = 0,
  nextUpcomingStart = null,
  isAvailableForDates = null,
  projectDates = null,
}: EquipmentCardProps) {
  const navigate = useNavigate();
  const { addItem, removeItem, isInCart, openDrawer } = useProject();
  const inCart = isInCart(item.id);
  const images = item.images ?? [];
  const hasMultiple = images.length > 1;
  const [activeIdx, setActiveIdx] = useState(0);
  const [loadedSet, setLoadedSet] = useState<Set<number>>(() => new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const markLoaded = (i: number) =>
    setLoadedSet(prev => prev.has(i) ? prev : new Set([...prev, i]));

  useEffect(() => {
    if (!hasMultiple) return;
    timerRef.current = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % images.length);
    }, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [hasMultiple, images.length]);

  const totalStock      = item.stock_quantity || 0;
  const availableQty    = Math.max(0, totalStock - rentedQuantity);
  const isFullyRented   = availableQty === 0 && totalStock > 0;
  const dailyRate       = item.daily_rate;
  const price           = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dailyRate);

  const formattedReturn = nextReturnDate
    ? format(parseISO(nextReturnDate), "dd/MM", { locale: ptBR })
    : null;
  const formattedUpcoming = nextUpcomingStart
    ? format(parseISO(nextUpcomingStart), "dd/MM", { locale: ptBR })
    : null;

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/equipment/${item.id}`);
  };

  const handleToggleProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCart) {
      removeItem(item.id);
      toast.info(`${item.name} removido do projeto`);
    } else {
      addItem(item);
      toast.success(`${item.name} adicionado ao projeto!`, {
        action: { label: 'Ver projeto', onClick: openDrawer },
      });
    }
  };

  // Card border highlight when date availability is known
  const borderAccent =
    isAvailableForDates === true  ? 'hover:border-emerald-500/25' :
    isAvailableForDates === false ? 'border-red-500/10'           : '';

  return (
    <Card
      className={`group overflow-hidden clay-card flex flex-col h-full
        transition-all duration-300 ease-out
        hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50
        ${borderAccent}`}
    >
      {/* ─── Image area ──────────────────────────────────────────── */}
      <div
        onClick={handleViewDetails}
        className="relative w-full h-52 overflow-hidden bg-zinc-900 shrink-0 cursor-pointer"
      >
        {/* Shimmer placeholder — hidden once first image is loaded */}
        <div className={`absolute inset-0 transition-opacity duration-500
          ${loadedSet.has(0) ? 'opacity-0' : 'opacity-100'}`}>
          <div className="w-full h-full bg-zinc-900 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite]
                            bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
          </div>
        </div>

        {/* Product images */}
        {images.length > 0 ? (
          images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={item.name}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              onLoad={() => markLoaded(i)}
              className={`absolute inset-0 w-full h-full object-contain p-6
                transition-all duration-700 ease-in-out
                ${i === activeIdx && loadedSet.has(i)
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-105'}`}
            />
          ))
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="h-10 w-10 text-zinc-800" />
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-x-0 top-0    h-20 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

        {/* ── Top row: availability pill + heart ── */}
        <div className="absolute top-3 inset-x-3 z-10 flex items-start justify-between">
          {/* Availability pills: disponíveis + locados hoje */}
          <div className="flex flex-wrap items-center gap-1.5">
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
            backdrop-blur-md text-[9px] font-black uppercase tracking-widest border
            ${isFullyRented
              ? 'bg-zinc-950/90 border-red-500/30  text-red-400'
              : 'bg-zinc-950/80 border-emerald-500/25 text-emerald-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0
              ${isFullyRented ? 'bg-red-500' : 'bg-emerald-400 animate-pulse'}`}
            />
            {isFullyRented
              ? 'Esgotado'
              : `${availableQty} ${availableQty === 1 ? 'disponível' : 'disponíveis'}`}
          </div>
          {rentedQuantity > 0 && !isFullyRented && (
            <div className="flex items-center px-2.5 py-1.5 rounded-full backdrop-blur-md text-[9px] font-black uppercase tracking-widest border bg-zinc-950/80 border-amber-500/25 text-amber-400">
              {rentedQuantity} {rentedQuantity === 1 ? 'locado' : 'locados'}
            </div>
          )}
          </div>

          {/* Heart */}
          <div onClick={e => e.stopPropagation()}>
            <FavoriteButton equipmentId={item.id} />
          </div>
        </div>

        {/* ── Date availability chip (only when project dates set) ── */}
        {isAvailableForDates !== null && (
          <div className={`absolute z-10 flex items-center gap-1 px-2 py-1 rounded-full
            backdrop-blur-md text-[8px] font-black uppercase tracking-widest border
            transition-all duration-300 animate-in fade-in
            ${isAvailableForDates === true
              ? 'top-[2.75rem] left-3 bg-emerald-950/80 border-emerald-500/20 text-emerald-400'
              : 'top-[2.75rem] left-3 bg-red-950/80    border-red-500/20    text-red-400'}`}>
            {isAvailableForDates
              ? <><CalendarCheck className="w-2.5 h-2.5" /> Suas datas</>
              : <><CalendarX     className="w-2.5 h-2.5" /> Ocupado</>}
          </div>
        )}

        {/* ── Slide dots ── */}
        {hasMultiple && (
          <div className="absolute bottom-9 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, i) => (
              <span key={i} className={`block h-0.5 rounded-full transition-all duration-500
                ${i === activeIdx ? 'w-4 bg-white/80' : 'w-1 bg-white/20'}`}
              />
            ))}
          </div>
        )}

        {/* ── Bottom overlay: price + location ── */}
        <div className="absolute bottom-0 inset-x-0 z-10 px-4 py-3 flex items-end justify-between">
          <div className="flex flex-col leading-none">
            <span className="text-[8px] uppercase text-white/40 font-black tracking-[0.2em] mb-1">
              por diária
            </span>
            <span className="text-[1.35rem] font-display font-black text-white tracking-tight leading-none">
              {price}
            </span>
          </div>

          {item.state_uf && (
            <div className="flex items-center gap-1 bg-white/8 backdrop-blur-sm
                            border border-white/8 px-2 py-1 rounded-lg">
              <MapPin className="w-2.5 h-2.5 text-white/50" />
              <span className="text-[8px] font-black text-white/60 uppercase tracking-widest">
                {item.state_uf}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Card body ───────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 px-4 pt-4 pb-4 gap-0">

        {/* Name */}
        <h4
          onClick={handleViewDetails}
          className="text-[11px] font-black leading-snug uppercase tracking-widest
                     text-zinc-100 group-hover:text-primary transition-colors duration-200
                     line-clamp-2 cursor-pointer mb-2"
        >
          {item.name}
        </h4>

        {/* Rental status — only shown when relevant */}
        {rentedQuantity > 0 && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3 h-3 text-amber-500/70 shrink-0" />
            <span className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider leading-none">
              {totalStock > 1
                ? `${rentedQuantity} ${rentedQuantity === 1 ? 'locado' : 'locados'} agora`
                : 'Locado agora'}
              {formattedReturn && ` · retorno ${formattedReturn}`}
            </span>
          </div>
        )}
        {upcomingQuantity > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            <CalendarClock className="w-3 h-3 text-zinc-500 shrink-0" />
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider leading-none">
              {upcomingQuantity} {upcomingQuantity === 1 ? 'reservado' : 'reservados'}
              {formattedUpcoming && ` a partir de ${formattedUpcoming}`}
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* ── Action row ── */}
        <div className="flex gap-2 pt-3 border-t border-white/[0.05]">

          {/* + Projeto button */}
          <Button
            size="sm"
            onClick={handleToggleProject}
            disabled={isFullyRented || isAvailableForDates === false}
            title={isAvailableForDates === false ? 'Indisponível nas suas datas' : undefined}
            className={`flex-1 h-9 text-[9px] font-black uppercase tracking-widest gap-1.5 rounded-xl
              transition-all duration-200
              ${inCart
                ? 'bg-primary/10 text-primary border border-primary/25 hover:bg-red-500/8 hover:text-red-400 hover:border-red-500/25'
                : isAvailableForDates === true
                  ? 'bg-emerald-500/8 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 hover:border-emerald-500/30'
                  : 'bg-zinc-900 text-zinc-400 border border-white/6 hover:bg-zinc-800 hover:text-zinc-200 hover:border-white/12'
              } disabled:opacity-20 disabled:cursor-not-allowed`}
          >
            {inCart
              ? <><FolderCheck className="h-3 w-3" /> No projeto</>
              : isAvailableForDates === false
                ? <><CalendarX    className="h-3 w-3" /> Ocupado</>
                : <><FolderPlus   className="h-3 w-3" /> + Projeto</>}
          </Button>

          {/* Reserve → */}
          <Button
            size="sm"
            onClick={handleViewDetails}
            disabled={isFullyRented}
            className="h-9 w-9 shrink-0 p-0 bg-primary text-white rounded-xl
                       hover:bg-primary/90 transition-all duration-200 hover:-translate-y-0.5
                       shadow-lg shadow-primary/20
                       disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
