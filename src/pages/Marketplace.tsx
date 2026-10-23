import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEquipments } from '@/hooks/useEquipments';
import { Button } from '@/components/ui/button';
import AnimatedGlowingSearchBar from '@/components/ui/animated-glowing-search-bar';
import { MapPin, Package, Calendar } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { Equipment } from '@/types/database';
import { motion } from 'motion/react';
import { EquipmentCard } from '@/components/marketplace/EquipmentCard';
import { useProject } from '@/contexts/ProjectContext';
import { todayStr, weekdayShort, formatShootDays } from '@/lib/schedule';
import { ShootDaysPicker } from '@/components/marketplace/ShootDaysPicker';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Returns true if booking [bStart, bEnd] overlaps with project window [pStart, pEnd] */
function dateOverlaps(bStart: string, bEnd: string, pStart: string, pEnd: string) {
  return bStart <= pEnd && bEnd >= pStart;
}

const SORT_LABELS = { available: 'Disponíveis', 'price-asc': 'Menor preço', 'price-desc': 'Maior preço' } as const;

/** "2026-10-22" → "22/10" */
const shortDay = (d: string) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '—');

// Campo nativo invisível que cobre o cartão inteiro (abre o seletor de data/lista do aparelho)
const overlayInput = 'absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base';
const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
  try { e.currentTarget.showPicker?.(); } catch { /* navegador sem showPicker: o toque já abre */ }
};

export default function Marketplace() {
  const navigate = useNavigate();
  const { state: projectState, setShootDates, setShootDays } = useProject();
  const [showShootDays, setShowShootDays] = useState(false);
  const [search, setSearch] = useState('');
  // Filtros da barra de descoberta
  const [city, setCity] = useState<string>('');
  const [sortBy, setSortBy] = useState<'available' | 'price-asc' | 'price-desc'>('available');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>();
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | undefined>();
  
  const { data: rawEquipmentsPage, isLoading } = useEquipments({
    searchQuery: search,
    category: selectedCategory,
    brand: selectedBrand,
    subCategory: selectedSubCategory
  });
  const rawEquipments = rawEquipmentsPage?.items ?? [];

  // Busca os bookings ativos HOJE para todos os equipamentos (uma única query)
  // Usa RPC com SECURITY DEFINER para bypassar RLS — a query direta em bookings
  // é filtrada por usuário, fazendo items com reserva de outro usuário aparecerem
  // como disponíveis, permitindo dupla locação na mesma data.
  // Data local (toISOString daria o dia seguinte depois das 21h no Brasil)
  const today = todayStr();
  const { data: activeBookings } = useQuery({
    queryKey: ['marketplace-active-bookings', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_marketplace_active_bookings', { p_from_date: today });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  // Mapa de equipment_id → locado hoje (com próximo retorno) e reservas futuras (com próximo início)
  type BookingInfo = { rentedQuantity: number; nextReturnDate: string | null; upcomingQuantity: number; nextUpcomingStart: string | null };
  const bookingMap = useMemo(() => {
    const map = new Map<string, BookingInfo>();
    (activeBookings || []).forEach((b: any) => {
      const info = map.get(b.equipment_id)
        ?? { rentedQuantity: 0, nextReturnDate: null, upcomingQuantity: 0, nextUpcomingStart: null };
      if (b.start_date > today) {
        // Reserva futura: não ocupa unidades hoje, mas o cliente deve saber que existe
        info.upcomingQuantity += b.quantity || 0;
        if (!info.nextUpcomingStart || b.start_date < info.nextUpcomingStart) info.nextUpcomingStart = b.start_date;
      } else {
        info.rentedQuantity += b.quantity || 0;
        if (!info.nextReturnDate || b.end_date < info.nextReturnDate) info.nextReturnDate = b.end_date;
      }
      map.set(b.equipment_id, info);
    });
    return map;
  }, [activeBookings, today]);

  // ─── Consolidação "Pote Principal" ────────────────────────────────────────
  // Agrupa itens pelo nome, soma estoque e agrega dados de locação
  type ConsolidatedItem = Equipment & { _mergedIds: string[] } & BookingInfo;

  const equipments = useMemo<ConsolidatedItem[]>(() => {
    if (!rawEquipments) return [];

    const consolidated = new Map<string, ConsolidatedItem>();

    rawEquipments.forEach(item => {
      if (!item.name) return;
      const key = item.name.trim().toUpperCase();
      const bookingInfo = bookingMap.get(item.id);

      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!;
        existing.stock_quantity = (existing.stock_quantity || 0) + (item.stock_quantity || 0);
        existing._mergedIds.push(item.id);
        if (bookingInfo) {
          existing.rentedQuantity += bookingInfo.rentedQuantity;
          existing.upcomingQuantity += bookingInfo.upcomingQuantity;
          if (bookingInfo.nextReturnDate && (!existing.nextReturnDate || bookingInfo.nextReturnDate < existing.nextReturnDate)) {
            existing.nextReturnDate = bookingInfo.nextReturnDate;
          }
          if (bookingInfo.nextUpcomingStart && (!existing.nextUpcomingStart || bookingInfo.nextUpcomingStart < existing.nextUpcomingStart)) {
            existing.nextUpcomingStart = bookingInfo.nextUpcomingStart;
          }
        }
      } else {
        consolidated.set(key, {
          ...item,
          _mergedIds: [item.id],
          rentedQuantity: bookingInfo?.rentedQuantity ?? 0,
          nextReturnDate: bookingInfo?.nextReturnDate ?? null,
          upcomingQuantity: bookingInfo?.upcomingQuantity ?? 0,
          nextUpcomingStart: bookingInfo?.nextUpcomingStart ?? null,
        });
      }
    });

    return Array.from(consolidated.values());
  }, [rawEquipments, bookingMap]);

  // ─── Per-item availability for the project date window ───────────────────────
  // Re-computes whenever activeBookings or project dates change — no extra network calls
  // Unidades livres de cada item no período escolhido
  const freeForDatesMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!activeBookings || !projectState.startDate || !projectState.endDate) return map;
    equipments.forEach(item => {
      const bookedQty = (activeBookings as any[])
        .filter(b =>
          (item as any)._mergedIds?.includes(b.equipment_id) &&
          dateOverlaps(b.start_date, b.end_date, projectState.startDate, projectState.endDate),
        )
        .reduce((sum, b) => sum + (b.quantity || 0), 0);
      map.set(item.id, Math.max(0, (item.stock_quantity || 0) - bookedQty));
    });
    return map;
  }, [equipments, activeBookings, projectState.startDate, projectState.endDate]);

  const availabilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    freeForDatesMap.forEach((free, id) => map.set(id, free > 0));
    return map;
  }, [freeForDatesMap]);

  const availableCount = useMemo(
    () => Array.from(availabilityMap.values()).filter(Boolean).length,
    [availabilityMap],
  );

  // Gravação guardada no carrinho pode ter ficado no passado: recalcula a agenda
  useEffect(() => {
    if (projectState.shootStartDate < today) setShootDates(today, today);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cidades reais do catálogo (para o filtro "Onde?")
  const cityKey = (e: Equipment) => [e.location_base?.trim(), e.state_uf?.trim()].filter(Boolean).join(' · ');
  const cities = useMemo(
    () => [...new Set(equipments.map(cityKey).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [equipments],
  );

  // Lista em ordem fixa (antes era embaralhada a cada visita e limitada a 8)
  const displayedEquipments = useMemo(() => {
    const list = city ? equipments.filter(e => cityKey(e) === city) : [...equipments];
    if (sortBy === 'price-asc') return list.sort((a, b) => a.daily_rate - b.daily_rate);
    if (sortBy === 'price-desc') return list.sort((a, b) => b.daily_rate - a.daily_rate);
    // Disponíveis nas datas primeiro; depois por nome
    return list.sort((a, b) => {
      const av = availabilityMap.get(a.id) === false ? 1 : 0;
      const bv = availabilityMap.get(b.id) === false ? 1 : 0;
      return av - bv || a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [equipments, city, sortBy, availabilityMap]);

  // Carrossel do celular: ordem aleatória (sorteada uma vez por visita, para os cards não pularem),
  // ainda com os disponíveis primeiro. Se a pessoa escolher ordenar por preço, vale o preço.
  const [randomRank] = useState(() => new Map<string, number>());
  const carouselEquipments = useMemo(() => {
    if (sortBy !== 'available') return displayedEquipments;
    const rank = (id: string) => {
      if (!randomRank.has(id)) randomRank.set(id, Math.random());
      return randomRank.get(id)!;
    };
    return [...displayedEquipments].sort((a, b) => {
      const av = availabilityMap.get(a.id) === false ? 1 : 0;
      const bv = availabilityMap.get(b.id) === false ? 1 : 0;
      return av - bv || rank(a.id) - rank(b.id);
    });
  }, [displayedEquipments, sortBy, availabilityMap, randomRank]);

  const renderCard = (item: ConsolidatedItem) => (
    <EquipmentCard
      key={item.id}
      item={item}
      rentedQuantity={(item as any).rentedQuantity ?? 0}
      nextReturnDate={(item as any).nextReturnDate ?? null}
      upcomingQuantity={(item as any).upcomingQuantity ?? 0}
      nextUpcomingStart={(item as any).nextUpcomingStart ?? null}
      isAvailableForDates={availabilityMap.get(item.id) ?? null}
      freeForDates={freeForDatesMap.get(item.id) ?? null}
      projectDates={
        projectState.startDate && projectState.endDate
          ? { start: projectState.startDate, end: projectState.endDate }
          : null
      }
      onClick={() => navigate(`/equipment/${item.id}`)}
    />
  );

  const hasFilters = !!(search || city || selectedCategory);
  const clearFilters = () => {
    setSearch('');
    setCity('');
    setSelectedCategory(undefined);
    setSelectedBrand(undefined);
    setSelectedSubCategory(undefined);
  };

  const handleSearch = () => {
    if (equipments && equipments.length === 1) {
      navigate(`/equipment/${equipments[0].id}`);
    } else {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };


  return (
    <div className="flex flex-col items-center pb-8 w-full">

      {/* ── Topo: título + busca ─────────────────────────────────────────── */}
      <div className="relative w-full flex flex-col items-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-4 flex flex-col items-center text-center relative z-10"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tighter text-white mb-3 leading-[0.95]">
            Equipamento para o seu <span className="text-primary">set</span>.
          </h1>
          <p className="text-zinc-500 text-sm md:text-base font-medium mb-6 md:mb-8 max-w-xl">
            Alugue de locadoras parceiras e acompanhe a entrega em tempo real.
          </p>

          <div className="w-full max-w-3xl">
            <AnimatedGlowingSearchBar
              value={search}
              onChange={setSearch}
              onSearch={handleSearch}
              placeholder="Qual equipamento você precisa?"
            />
          </div>

          {/* ── Barra de descoberta: Quando? Onde? Ordenar ──
               O valor aparece num texto curto (22/10) e o campo nativo fica invisível por cima:
               ocupa pouco espaço no celular e continua abrindo o seletor do aparelho. */}
          <div className="w-full max-w-3xl mt-2.5 grid grid-cols-[2fr_1fr_1.3fr] md:grid-cols-4 gap-1.5 md:gap-2 text-left">
            {/* Dias de gravação: abre o calendário (os dias podem ser espaçados) */}
            <button
              type="button"
              onClick={() => setShowShootDays(v => !v)}
              aria-expanded={showShootDays}
              className={`md:col-span-2 flex flex-col gap-0.5 min-w-0 text-left bg-zinc-900/60 border rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 transition-colors ${showShootDays ? 'border-primary/50' : 'border-zinc-800 hover:border-zinc-700'}`}
            >
              <span className="text-[10px] md:text-[11px] font-semibold text-zinc-500 flex items-center gap-1 truncate"><span className="hidden md:inline-flex"><Calendar className="w-3 h-3 text-primary shrink-0" /></span>Dias de gravação</span>
              <span className="text-[13px] md:text-sm font-semibold text-white truncate">{formatShootDays(projectState.shootDates)}</span>
            </button>
            {[
              { label: 'Onde?', icon: <MapPin className="w-3 h-3 shrink-0" />, value: city ? city.split(' · ')[0] : 'Todas',
                input: (
                  <select aria-label="Cidade" value={city} onChange={e => setCity(e.target.value)} className={overlayInput}>
                    <option value="">Todas as cidades</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) },
              { label: 'Ordenar', icon: null, value: SORT_LABELS[sortBy],
                input: (
                  <select aria-label="Ordenar" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className={overlayInput}>
                    <option value="available">Disponíveis primeiro</option>
                    <option value="price-asc">Menor preço</option>
                    <option value="price-desc">Maior preço</option>
                  </select>
                ) },
            ].map(field => (
              <label key={field.label} className="relative flex flex-col gap-0.5 min-w-0 bg-zinc-900/60 border border-zinc-800 rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 cursor-pointer hover:border-zinc-700 focus-within:border-primary/50 transition-colors">
                <span className="text-[10px] md:text-[11px] font-semibold text-zinc-500 flex items-center gap-1 truncate"><span className="hidden md:inline-flex">{field.icon}</span>{field.label}</span>
                <span className="text-[13px] md:text-sm font-semibold text-white truncate">{field.value}</span>
                {field.input}
              </label>
            ))}
          </div>
          {showShootDays && (
            <div className="w-full max-w-3xl mt-2 text-left">
              <ShootDaysPicker
                value={projectState.shootDates}
                onChange={setShootDays}
                pickupDate={projectState.startDate}
                returnDate={projectState.endDate}
              />
              <div className="flex justify-end mt-2">
                <Button size="sm" onClick={() => setShowShootDays(false)} className="h-10 rounded-xl px-5 font-semibold">Pronto</Button>
              </div>
            </div>
          )}

          {/* Agenda calculada: o que é cobrado e quando o equipamento sai/volta */}
          <p className="w-full max-w-3xl mt-1.5 text-xs text-zinc-500 text-left">
            {(() => { const n = projectState.shootDates.length || 1; return `${n} ${n === 1 ? 'diária' : 'diárias'}`; })()}
            {' · '}retirada {weekdayShort(projectState.startDate)} · devolução {weekdayShort(projectState.endDate)}
          </p>
        </motion.div>
      </div>

      {/* ── Resultados ───────────────────────────────────────────────────── */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 mb-6 md:mb-20 mt-6">
        <div id="results-section" className="w-full scroll-mt-24">

          <div className="flex items-end justify-between gap-4 mb-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-xl md:text-2xl font-display font-black tracking-tighter uppercase">
                {hasFilters ? 'Resultados' : 'Equipamentos'}
              </h3>
              <p className="text-sm text-zinc-500 font-medium">
                {isLoading
                  ? 'Carregando...'
                  : `${displayedEquipments.length} ${displayedEquipments.length === 1 ? 'equipamento' : 'equipamentos'}${city ? ` em ${city}` : ''}`}
              </p>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 text-zinc-500 hover:text-white font-semibold text-xs">
                Limpar filtros
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[360px] rounded-2xl bg-zinc-900/40 border border-zinc-800 animate-pulse" />
              ))}
            </div>
          ) : displayedEquipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
                <Package className="h-7 w-7 text-zinc-500" />
              </div>
              <h3 className="text-lg font-bold mb-1">Nenhum equipamento encontrado</h3>
              <p className="text-sm text-zinc-500 max-w-xs mb-6">Tente outra busca, outra cidade ou limpe os filtros.</p>
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters} className="rounded-xl h-11 px-6 border-zinc-800 text-zinc-300">
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Celular: carrossel deslizando para o lado, em ordem aleatória */}
              <div className="sm:hidden -mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {carouselEquipments.map((item) => (
                  <div key={item.id} className="w-[82%] shrink-0 snap-start">
                    {renderCard(item)}
                  </div>
                ))}
              </div>

              {/* Tablet e computador: grade */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {displayedEquipments.map(renderCard)}
              </div>
            </>
          )}
        </div>
      </div>


    </div>
  );
}
