import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Camera, ChevronRight, Clock, FolderPlus, FolderCheck, CalendarCheck, CalendarX } from 'lucide-react';
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
      toast.info(`${item.name} removido do pedido`);
    } else {
      addItem(item);
      toast.success(`${item.name} adicionado ao pedido!`, {
        action: { label: 'Ver pedido', onClick: openDrawer },
      });
    }
  };

  // Um único selo: disponibilidade nas datas escolhidas (ou hoje, se não houver datas)
  const unavailable = isAvailableForDates === false || (isAvailableForDates === null && isFullyRented);
  const statusLabel = isAvailableForDates === null
    ? (isFullyRented ? 'Esgotado' : `${availableQty} ${availableQty === 1 ? 'disponível' : 'disponíveis'}`)
    : (isAvailableForDates ? 'Disponível nas suas datas' : 'Ocupado nas suas datas');

  // No máximo uma linha de contexto abaixo do preço
  const infoLine = rentedQuantity > 0
    ? `${totalStock > 1 ? `${rentedQuantity} ${rentedQuantity === 1 ? 'locado' : 'locados'} agora` : 'Locado agora'}${formattedReturn ? ` · volta ${formattedReturn}` : ''}`
    : upcomingQuantity > 0
      ? `${upcomingQuantity} ${upcomingQuantity === 1 ? 'reservado' : 'reservados'}${formattedUpcoming ? ` a partir de ${formattedUpcoming}` : ''}`
      : null;
  const city = [item.location_base, item.state_uf].filter(Boolean).join(' · ');

  return (
    <Card className="group overflow-hidden clay-card flex flex-col h-full transition-all duration-300 ease-out hover:-translate-y-1">
      {/* ─── Foto ──────────────────────────────────────────────────── */}
      <div
        onClick={handleViewDetails}
        className="relative w-full aspect-[4/3] overflow-hidden bg-zinc-900 shrink-0 cursor-pointer"
      >
        {/* Shimmer até a primeira imagem carregar */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${loadedSet.has(0) ? 'opacity-0' : 'opacity-100'}`}>
          <div className="w-full h-full bg-zinc-900 relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
          </div>
        </div>

        {images.length > 0 ? (
          images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={item.name}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              onLoad={() => markLoaded(i)}
              className={`absolute inset-0 w-full h-full object-contain p-4 transition-all duration-700 ease-in-out ${i === activeIdx && loadedSet.has(i)
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-105'}`}
            />
          ))
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="h-10 w-10 text-zinc-500" />
          </div>
        )}

        {/* Selo único + favorito */}
        <div className="absolute top-3 inset-x-3 z-10 flex items-start justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border backdrop-blur-md ${unavailable
              ? 'bg-zinc-950/90 border-red-500/30 text-red-400'
              : 'bg-zinc-950/90 border-emerald-500/30 text-emerald-400'}`}>
            {isAvailableForDates === null
              ? <span className={`w-1.5 h-1.5 rounded-full ${unavailable ? 'bg-red-500' : 'bg-emerald-400'}`} />
              : unavailable ? <CalendarX className="w-3 h-3" /> : <CalendarCheck className="w-3 h-3" />}
            {statusLabel}
          </span>
          <div onClick={e => e.stopPropagation()}>
            <FavoriteButton equipmentId={item.id} />
          </div>
        </div>

        {/* Bolinhas da galeria */}
        {hasMultiple && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, i) => (
              <span key={i} className={`block h-1 rounded-full transition-all duration-500 ${i === activeIdx ? 'w-4 bg-zinc-400' : 'w-1 bg-zinc-700'}`} />
            ))}
          </div>
        )}
      </div>

      {/* ─── Nome, preço e cidade ──────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <h4
          onClick={handleViewDetails}
          className="text-sm font-bold leading-snug text-zinc-100 group-hover:text-primary transition-colors duration-200 line-clamp-2 cursor-pointer"
        >
          {item.name}
        </h4>

        <div className="flex items-baseline justify-between gap-2">
          <p className="text-zinc-100">
            <span className="text-lg font-bold tracking-tight">{price}</span>
            <span className="text-xs text-zinc-500 font-medium"> /dia</span>
          </p>
          {city && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500 font-medium truncate">
              <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{city}</span>
            </span>
          )}
        </div>

        {infoLine && (
          <p className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
            <Clock className="w-3 h-3 shrink-0" /> {infoLine}
          </p>
        )}

        <div className="flex-1" />

        {/* Ações */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={handleToggleProject}
            disabled={unavailable}
            title={isAvailableForDates === false ? 'Ocupado nas suas datas' : undefined}
            className={`flex-1 h-10 text-xs font-semibold gap-1.5 rounded-xl transition-all duration-200 ${inCart
                ? 'bg-primary/10 text-primary border border-primary/25 hover:bg-red-500/8 hover:text-red-400 hover:border-red-500/25'
                : 'bg-zinc-900 text-zinc-200 border border-zinc-800 hover:bg-zinc-800'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {inCart
              ? <><FolderCheck className="h-3.5 w-3.5" /> No pedido</>
              : unavailable
                ? <><CalendarX className="h-3.5 w-3.5" /> Indisponível</>
                : <><FolderPlus className="h-3.5 w-3.5" /> Adicionar ao pedido</>}
          </Button>

          <Button
            size="sm"
            onClick={handleViewDetails}
            aria-label="Ver detalhes"
            className="h-10 w-10 shrink-0 p-0 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all duration-200"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
