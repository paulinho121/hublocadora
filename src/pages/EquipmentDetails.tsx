import { useParams, useNavigate } from 'react-router-dom';
import { useEquipment } from '@/hooks/useEquipments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  Star,
  MapPin,
  Calendar,
  ShieldCheck,
  MessageSquare,
  Package,
  ArrowRight,
  Info,
  Loader2,
  Camera,
  Building2,
  CalendarSearch,
  ChevronDown,
  FileText,
  ChevronUp,
  Plus,
  Minus,
  CheckCircle2,
  Hash,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { useEquipmentAvailability } from '@/hooks/useAvailability';
import { AvailabilityCalendar } from '@/components/marketplace/AvailabilityCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { ReviewService } from '@/services/ReviewService';
import { useQuery } from '@tanstack/react-query';
import { Equipment } from '@/types/database';
import { SuggestedEquipments } from '@/components/marketplace/SuggestedEquipments';
import { EquipmentGallery } from '@/components/marketplace/EquipmentGallery';
import { CompanyInfoCard } from '@/components/marketplace/CompanyInfoCard';

// ─── helpers ──────────────────────────────────────────────────────────────────

// Rótulos dos detalhes técnicos (as chaves vêm em inglês do cadastro)
const FEATURE_LABELS: Record<string, string> = {
  brand: 'Marca', model: 'Modelo', weight: 'Peso', power: 'Potência', mount: 'Encaixe',
  resolution: 'Resolução', sensor: 'Sensor', color_temperature: 'Temperatura de cor', battery: 'Bateria',
};

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const conditionLabels: Record<string, string> = {
  excellent:   'Impecável',
  good:        'Bom Estado',
  fair:        'Marcas de Uso',
  maintenance: 'Em Manutenção',
};
const conditionColors: Record<string, string> = {
  excellent:   'text-emerald-400 bg-emerald-500/10',
  good:        'text-blue-400 bg-blue-500/10',
  fair:        'text-amber-400 bg-amber-500/10',
  maintenance: 'text-red-400 bg-red-500/10',
};

// ─── Inline booking panel ──────────────────────────────────────────────────────

function InlineBookingPanel({ equipment }: { equipment: Equipment }) {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const { state: proj, addItem, setDates: setProjectDates, openDrawer } = useProject();

  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  // Datas: as que já estão no pedido (carrinho), se ainda forem válidas
  const cartDatesValid = !!proj.startDate && proj.startDate >= today;
  const [startDate, setStartDate] = useState(cartDatesValid ? proj.startDate : today);
  const [endDate,   setEndDate]   = useState(cartDatesValid ? proj.endDate : format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const inCartQty = proj.items.find(i => i.equipment.id === equipment.id)?.quantity;
  const [quantity,  setQty]       = useState(inCartQty ?? 1);
  const [showCal,   setShowCal]   = useState(false);
  const [isAdded,   setIsAdded]   = useState(false);

  const { data: avail, isLoading: loadingAvail } = useEquipmentAvailability(
    id || '', startDate, endDate,
  );

  const totalDays   = Math.max(1, differenceInDays(parseISO(endDate), parseISO(startDate)));
  const totalAmount = equipment.daily_rate * quantity * totalDays;
  const maxQty      = avail?.available ?? equipment.stock_quantity ?? 1;
  const canBook     = avail?.isAvailable && quantity <= maxQty;

  const handleStart = (val: string) => {
    if (!val) return;
    setStartDate(val);
    if (val >= endDate) setEndDate(format(addDays(parseISO(val), 1), 'yyyy-MM-dd'));
  };

  // Carrinho: o item entra no pedido; o envio às locadoras acontece em "Finalizar pedido".
  // As datas valem para o pedido inteiro.
  const handleAddToOrder = () => {
    if (!canBook) return;
    addItem(equipment, quantity);
    setProjectDates(startDate, endDate);
    setIsAdded(true);
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (isAdded) {
    const cartCount = proj.items.length;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-14 px-4 text-center bg-emerald-500/5 border border-emerald-500/20 rounded-2xl"
      >
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-xl font-black uppercase tracking-tighter mb-2 text-white">
          Item adicionado!
        </h3>
        <p className="text-sm text-zinc-400 max-w-xs mb-2">
          {cartCount > 1
            ? `Seu pedido tem ${cartCount} equipamentos. Continue locando ou finalize para enviar às locadoras.`
            : 'Continue locando ou finalize o pedido para enviar à locadora.'}
        </p>
        <p className="text-[11px] font-semibold text-emerald-400 mb-6">
          {format(parseISO(startDate), "d 'de' MMM", { locale: ptBR })}
          {' → '}
          {format(parseISO(endDate), "d 'de' MMM", { locale: ptBR })}
          {' · '}{quantity}× · {brl(totalAmount)}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="rounded-xl border-zinc-700 text-zinc-300 font-semibold text-[11px] h-12 px-6"
          >
            Continuar locando
          </Button>
          <Button
            onClick={openDrawer}
            className="rounded-xl font-semibold text-[11px] h-12 px-6"
          >
            Finalizar pedido <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── Dates ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/40">
        <div className="grid grid-cols-2 divide-x divide-zinc-800">
          {/* Start date */}
          <label className="flex flex-col gap-1 px-4 py-3.5 cursor-pointer hover:bg-zinc-900/60 transition-colors">
            <span className="text-[11px] font-semibold text-zinc-500">
              Retirada
            </span>
            <input
              type="date"
              value={startDate}
              min={today}
              onChange={e => handleStart(e.target.value)}
              className="bg-transparent text-sm font-black text-white focus:outline-none cursor-pointer w-full"
            />
          </label>

          {/* End date */}
          <label className="flex flex-col gap-1 px-4 py-3.5 cursor-pointer hover:bg-zinc-900/60 transition-colors">
            <span className="text-[11px] font-semibold text-zinc-500">
              Devolução
            </span>
            <input
              type="date"
              value={endDate}
              min={startDate || tomorrow}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-sm font-black text-white focus:outline-none cursor-pointer w-full"
            />
          </label>
        </div>

        {/* Days count + availability */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800 bg-zinc-950/40">
          <span className="text-[11px] font-semibold text-zinc-500">
            {totalDays} {totalDays === 1 ? 'diária' : 'diárias'}
          </span>
          {loadingAvail ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          ) : avail ? (
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${avail.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={`text-[11px] font-semibold ${avail.isAvailable ? 'text-emerald-400' : 'text-red-400'}`}>
                {avail.isAvailable
                  ? `${avail.available} disponíve${avail.available === 1 ? 'l' : 'is'}`
                  : 'Indisponível'}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Availability calendar (expandable) ────────────────────────────── */}
      <button
        onClick={() => setShowCal(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700 text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 transition-all"
      >
        <span className="flex items-center gap-2">
          <CalendarSearch className="w-3.5 h-3.5 text-primary" />
          Ver disponibilidade no calendário
        </span>
        {showCal ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {showCal && id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pt-1">
              <AvailabilityCalendar
                equipmentId={id}
                stockQuantity={equipment.stock_quantity || 1}
                selectedStart={startDate}
                selectedEnd={endDate}
                onRangeChange={(s, e) => { setStartDate(s); setEndDate(e); }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quantity (only if stock > 1) ───────────────────────────────────── */}
      {(equipment.stock_quantity ?? 1) > 1 && (
        <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-zinc-500 mb-0.5">
              Quantidade
            </span>
            <span className="text-[11px] text-zinc-400">
              Máx {avail?.available ?? equipment.stock_quantity} unid.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button aria-label="Diminuir quantidade"
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center transition-colors disabled:opacity-30"
              disabled={quantity <= 1}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-lg font-black text-white w-6 text-center tabular-nums">
              {quantity}
            </span>
            <button aria-label="Aumentar quantidade"
              onClick={() => setQty(q => Math.min(maxQty, q + 1))}
              className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center transition-colors disabled:opacity-30"
              disabled={quantity >= maxQty}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Cost summary ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/60 px-4 py-4 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span>{quantity}× · {brl(equipment.daily_rate)}/dia · {totalDays} {totalDays === 1 ? 'diária' : 'diárias'}</span>
          <span className="text-zinc-300 font-bold">{brl(totalAmount)}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <span className="text-xs font-semibold text-white">Total</span>
          <span className="text-xl font-black text-white tabular-nums">{brl(totalAmount)}</span>
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <div className="pt-1">
        <motion.button
          whileHover={canBook ? { scale: 1.01, y: -1 } : {}}
          whileTap={canBook ? { scale: 0.99 } : {}}
          onClick={handleAddToOrder}
          disabled={!canBook || loadingAvail}
          className={`w-full h-14 rounded-2xl font-black uppercase tracking-tighter text-base flex items-center justify-center gap-2 transition-all ${canBook
                        ? 'bg-primary text-white shadow-[0_8px_24px_rgba(234,88,12,0.35)] hover:bg-primary/90'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
        >
          {!loadingAvail && !avail?.isAvailable ? (
            'Indisponível no período'
          ) : inCartQty ? (
            <>Atualizar no pedido <ArrowRight className="w-4 h-4" /></>
          ) : (
            <>Adicionar ao pedido <ArrowRight className="w-4 h-4" /></>
          )}
        </motion.button>
        <p className="text-[11px] text-zinc-500 text-center mt-2">
          Nada é cobrado agora. Você revisa e envia em “Finalizar pedido”.
        </p>
      </div>

      {/* ── Trust badges ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Locadora verificada pelo CineHub
        </span>
      </div>
    </div>
  );
}

// ─── Mobile booking bar ────────────────────────────────────────────────────────
// No celular o painel de reserva fica bem abaixo das fotos e da descrição.
// Esta barra mantém preço + ação sempre à mão e some quando o painel aparece.

function MobileBookingBar({ dailyRate, targetRef }: { dailyRate: number; targetRef: React.RefObject<HTMLDivElement | null> }) {
  const { user } = useAuth();
  const [panelVisible, setPanelVisible] = useState(false);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setPanelVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetRef]);

  if (panelVisible) return null;

  return (
    <div
      className="lg:hidden fixed left-3 right-3 z-40 flex items-center justify-between gap-3 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl pl-4 pr-2 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-4 fade-in duration-200"
      // Logado, a barra de navegação inferior ocupa o rodapé: fica logo acima dela
      style={{ bottom: `calc(env(safe-area-inset-bottom) + ${user ? 84 : 12}px)` }}
    >
      <div className="leading-tight">
        <span className="text-lg font-black text-white tabular-nums">{brl(dailyRate)}</span>
        <span className="text-xs font-bold text-zinc-500"> /dia</span>
      </div>
      <button
        onClick={() => targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        className="h-12 px-5 rounded-xl bg-primary text-white font-black uppercase tracking-tight text-sm flex items-center gap-2 shadow-[0_8px_24px_rgba(234,88,12,0.35)] active:scale-[0.98] transition-transform"
      >
        Adicionar ao pedido <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function EquipmentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: equipment, isLoading, error } = useEquipment(id || '');
  const [showDescription, setShowDescription] = useState(false);
  const bookingPanelRef = useRef<HTMLDivElement>(null);

  // Ao abrir uma sugestão, a página é a mesma: fecha a descrição e volta para o topo
  useEffect(() => {
    setShowDescription(false);
    window.scrollTo({ top: 0 });
  }, [id]);

  const { data: reviews } = useQuery({
    queryKey: ['reviews', id],
    // Visitantes sem login não têm acesso às avaliações — mostra a página sem elas
    queryFn: () => ReviewService.getByEquipment(id || '').catch(() => []),
    enabled: !!id,
  });
  const specs = Object.entries(equipment?.features ?? {})
    .filter(([key, value]) => key !== 'suggested_ids' && value !== null && value !== '' && typeof value !== 'object');
  const avgRating = reviews?.length
    ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length
    : null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-zinc-500 font-semibold text-[11px] animate-pulse">
          Carregando equipamento...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-20 text-center space-y-6">
        <div className="h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <Info className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tighter">Erro de Conexão</h2>
        <p className="text-zinc-500 max-w-md mx-auto">
          Não conseguimos carregar as especificações deste item.
        </p>
        <div className="flex justify-center gap-4">
          <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl font-semibold text-xs">
            Tentar Novamente
          </Button>
          <Button onClick={() => navigate('/')} className="rounded-xl font-semibold text-xs">
            Ir para Marketplace
          </Button>
        </div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h2 className="text-2xl font-bold">Equipamento não encontrado</h2>
        <Button onClick={() => navigate('/')} className="mt-4">Voltar para o Marketplace</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-44 lg:pb-12">

      {/* ── Sticky top bar ──────────────────────────────────────────────────── */}
      {/* Gruda logo abaixo do Navbar (h-16 / md:h-20 + safe area), e não por cima dele */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+4rem)] md:top-[calc(env(safe-area-inset-top)+5rem)] z-40 bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between max-w-6xl">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 h-11 -ml-2 px-2 rounded-xl text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-tighter">Voltar</span>
          </button>
          <div className="flex items-center gap-3">
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 lg:gap-12 items-start">

          {/* ── Left: images + info ───────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Galeria: desliza no celular, setas no computador, tela cheia ao tocar */}
            <EquipmentGallery
              images={equipment.images || []}
              name={equipment.name}
              badge={
                <Badge className="bg-primary/90 backdrop-blur-md text-white border-none font-black uppercase tracking-tighter px-3 py-1">
                  {equipment.category}
                </Badge>
              }
            />

            {/* Equipment info */}
            <div>
              {/* Tags row */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${conditionColors[equipment.condition] ?? 'bg-zinc-800 text-zinc-400'}`}>
                  {conditionLabels[equipment.condition] ?? 'N/A'}
                </span>
                <div className="flex items-center gap-1.5 text-zinc-300 text-[11px] font-semibold bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-xl">
                  {equipment.company?.logo_url
                    ? <img src={equipment.company.logo_url} alt="" className="w-4 h-4 rounded-md object-cover shrink-0" />
                    : <Building2 className="w-3 h-3 text-primary shrink-0" />}
                  <span>{equipment.company?.name ?? 'Matriz'}</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-300 text-[11px] font-semibold bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-xl">
                  <MapPin className="w-3 h-3 text-primary" />
                  <span>
                    {equipment.location_base ?? equipment.company?.address_city ?? 'Fortaleza'}
                    {' - '}
                    {equipment.state_uf ?? equipment.company?.address_state ?? 'CE'}
                  </span>
                </div>
              </div>

              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-tight md:leading-none mb-4">
                {equipment.name}
              </h1>
              {equipment.description && (
                <>
                  <button
                    onClick={() => setShowDescription(v => !v)}
                    aria-expanded={showDescription}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700 text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" />
                      Descrição
                    </span>
                    {showDescription ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <AnimatePresence>
                    {showDescription && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="text-zinc-400 text-sm md:text-base leading-relaxed font-medium pt-4 px-1">
                          {equipment.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>

            {/* Technical specs */}
            {specs.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" /> Detalhes Técnicos
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {specs.map(([key, value]) => (
                    <div key={key} className="bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
                      <p className="text-[11px] font-semibold text-zinc-500 mb-1">{FEATURE_LABELS[key.toLowerCase()] ?? key}</p>
                      <p className="font-bold text-zinc-300">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sobre a locadora */}
            <CompanyInfoCard company={equipment.company} />
          </div>

          {/* ── Right: booking panel (sticky on desktop) ───────────────────── */}
          {/* Desktop: abaixo do Navbar (5rem) + barra Voltar (3.5rem) + folga */}
          <div ref={bookingPanelRef} className="lg:sticky lg:top-[calc(env(safe-area-inset-top)+9.5rem)] lg:self-start space-y-4 scroll-mt-32">
            {/* Price header */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-semibold text-zinc-500 mb-1">
                  Preço da Diária
                </p>
                <span className="text-4xl font-black tracking-tighter text-white">
                  {brl(equipment.daily_rate)}
                </span>
                <span className="text-zinc-500 text-sm font-bold ml-1">/dia</span>
              </div>
              {/* Nota real das avaliações; sem avaliações, não mostra nada */}
              {avgRating !== null && (
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-black">{avgRating.toFixed(1)}</span>
                  <span className="text-xs font-bold text-zinc-500">({reviews!.length})</span>
                </div>
              )}
            </div>

            {/* Inline booking form */}
            <InlineBookingPanel key={equipment.id} equipment={equipment} />

            <SuggestedEquipments equipment={equipment} />
          </div>
        </div>
      </div>

      <MobileBookingBar dailyRate={equipment.daily_rate} targetRef={bookingPanelRef} />
    </div>
  );
}
