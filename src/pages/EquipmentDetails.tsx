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
  Truck,
  Store,
  Building2,
  CalendarSearch,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  CheckCircle2,
  FolderPlus,
  StickyNote,
  Hash,
} from 'lucide-react';
import { useState } from 'react';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { useEquipmentAvailability } from '@/hooks/useAvailability';
import { useCreateBooking } from '@/hooks/useBookings';
import { AvailabilityCalendar } from '@/components/marketplace/AvailabilityCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { ReviewService } from '@/services/ReviewService';
import { useQuery } from '@tanstack/react-query';
import { Equipment } from '@/types/database';

// ─── helpers ──────────────────────────────────────────────────────────────────

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
  const { user }     = useAuth();
  const { state: proj, addItem, setDates: setProjectDates, openDrawer } = useProject();

  const createBooking = useCreateBooking();

  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  // Pre-fill from project context if user already set dates in the marketplace bar
  const [startDate, setStartDate] = useState(proj.startDate || today);
  const [endDate,   setEndDate]   = useState(proj.endDate   || format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [quantity,  setQty]       = useState(1);
  const [method,    setMethod]    = useState<'pickup' | 'delivery'>('pickup');
  const [address,   setAddress]   = useState('');
  const [contact,   setContact]   = useState('');
  const [notes,     setNotes]     = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [showCal,   setShowCal]   = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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

  const handleBook = async () => {
    if (!user) { navigate('/login'); return; }
    if (!canBook) return;
    if (method === 'delivery' && !address.trim()) {
      toast.error('Informe o endereço de entrega.');
      return;
    }
    try {
      await createBooking.mutateAsync({
        equipment_id:         equipment.id,
        renter_id:            user.id,
        company_id:           equipment.company_id,
        start_date:           startDate,
        end_date:             endDate,
        total_amount:         totalAmount,
        status:               'pending',
        notes:                notes || null,
        quantity,
        delivery_method:      method,
        delivery_address:     method === 'delivery' ? address || null : null,
        delivery_contact:     method === 'delivery' ? contact || null : null,
        project_id:           null,
        subrental_company_id: null,
        origin_branch_id:     null,
      });
      setIsSuccess(true);
    } catch {
      toast.error('Erro ao realizar a reserva. Tente novamente.');
    }
  };

  const handleAddToProject = () => {
    addItem(equipment);
    setProjectDates(startDate, endDate);
    toast.success(`${equipment.name} adicionado ao projeto!`, {
      action: { label: 'Ver projeto', onClick: openDrawer },
    });
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center
                   bg-emerald-500/5 border border-emerald-500/20 rounded-3xl"
      >
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-xl font-black uppercase tracking-tighter mb-2 text-white">
          Reserva Enviada!
        </h3>
        <p className="text-sm text-zinc-400 max-w-xs mb-2">
          Sua solicitação foi enviada à locadora. Você receberá uma confirmação em breve.
        </p>
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-6">
          {format(parseISO(startDate), "d 'de' MMM", { locale: ptBR })}
          {' → '}
          {format(parseISO(endDate), "d 'de' MMM", { locale: ptBR })}
          {' · '}{quantity}× · {brl(totalAmount)}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard?tab=bookings')}
            className="rounded-xl border-zinc-700 text-zinc-300 font-black uppercase text-[10px] tracking-widest h-10 px-6"
          >
            Ver Pedidos
          </Button>
          <Button
            onClick={() => navigate('/')}
            className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-6"
          >
            Continuar Explorando
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
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Retirada
            </span>
            <input
              type="date"
              value={startDate}
              min={today}
              onChange={e => handleStart(e.target.value)}
              className="bg-transparent text-sm font-black text-white focus:outline-none
                         cursor-pointer [color-scheme:dark] w-full"
            />
          </label>

          {/* End date */}
          <label className="flex flex-col gap-1 px-4 py-3.5 cursor-pointer hover:bg-zinc-900/60 transition-colors">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Devolução
            </span>
            <input
              type="date"
              value={endDate}
              min={startDate || tomorrow}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-sm font-black text-white focus:outline-none
                         cursor-pointer [color-scheme:dark] w-full"
            />
          </label>
        </div>

        {/* Days count + availability */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800 bg-zinc-950/40">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            {totalDays} {totalDays === 1 ? 'diária' : 'diárias'}
          </span>
          {loadingAvail ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          ) : avail ? (
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${avail.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${avail.isAvailable ? 'text-emerald-400' : 'text-red-400'}`}>
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
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl
                   bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700
                   text-[10px] font-black uppercase tracking-widest text-zinc-500
                   hover:text-zinc-300 transition-all"
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
        <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl
                        bg-zinc-900/40 border border-zinc-800/60">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-0.5">
              Quantidade
            </span>
            <span className="text-[10px] text-zinc-600">
              Máx {avail?.available ?? equipment.stock_quantity} unid.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700
                         flex items-center justify-center transition-colors disabled:opacity-30"
              disabled={quantity <= 1}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-lg font-black text-white w-6 text-center tabular-nums">
              {quantity}
            </span>
            <button
              onClick={() => setQty(q => Math.min(maxQty, q + 1))}
              className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700
                         flex items-center justify-center transition-colors disabled:opacity-30"
              disabled={quantity >= maxQty}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Delivery method ────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/40">
        <p className="px-4 pt-3.5 pb-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Logística
        </p>
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          <button
            onClick={() => setMethod('pickup')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all
                        text-[10px] font-black uppercase tracking-widest
                        ${method === 'pickup'
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}
          >
            <Store className="w-3.5 h-3.5" />
            Retirar
          </button>
          <button
            onClick={() => setMethod('delivery')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all
                        text-[10px] font-black uppercase tracking-widest
                        ${method === 'delivery'
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}
          >
            <Truck className="w-3.5 h-3.5" />
            Receber
          </button>
        </div>

        {/* Delivery address fields */}
        <AnimatePresence>
          {method === 'delivery' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-2 border-t border-zinc-800 pt-3">
                <input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Endereço de entrega completo *"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5
                             text-xs text-white placeholder:text-zinc-600
                             focus:outline-none focus:border-primary/50"
                />
                <input
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder="Nome e telefone do responsável"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5
                             text-xs text-white placeholder:text-zinc-600
                             focus:outline-none focus:border-primary/50"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Notes (optional) ──────────────────────────────────────────────── */}
      <button
        onClick={() => setShowNotes(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl
                   bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700
                   text-[10px] font-black uppercase tracking-widest text-zinc-500
                   hover:text-zinc-300 transition-all"
      >
        <span className="flex items-center gap-2">
          <StickyNote className="w-3.5 h-3.5" />
          Observações {notes && <span className="text-primary">·  preenchido</span>}
        </span>
        {showNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {showNotes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Preciso dos cabos de 10m, entrega antes das 8h..."
              rows={3}
              className="w-full bg-zinc-900/40 border border-zinc-800 rounded-2xl px-4 py-3
                         text-xs text-white placeholder:text-zinc-600 resize-none
                         focus:outline-none focus:border-primary/50"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cost summary ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/60 px-4 py-4 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span>{quantity}× · {brl(equipment.daily_rate)}/dia · {totalDays} {totalDays === 1 ? 'diária' : 'diárias'}</span>
          <span className="text-zinc-300 font-bold">{brl(totalAmount)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span>Taxa de serviço HUB (15%)</span>
          <span className="text-zinc-400">Incluso</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <span className="text-xs font-black uppercase tracking-widest text-white">Total</span>
          <span className="text-xl font-black text-white tabular-nums">{brl(totalAmount)}</span>
        </div>
      </div>

      {/* ── CTAs ──────────────────────────────────────────────────────────── */}
      <div className="space-y-2 pt-1">
        <motion.button
          whileHover={canBook ? { scale: 1.01, y: -1 } : {}}
          whileTap={canBook ? { scale: 0.99 } : {}}
          onClick={handleBook}
          disabled={!canBook || createBooking.isPending || loadingAvail}
          className={`w-full h-14 rounded-2xl font-black uppercase tracking-tighter text-base
                      flex items-center justify-center gap-2 transition-all
                      ${canBook
                        ? 'bg-primary text-white shadow-[0_8px_24px_rgba(234,88,12,0.35)] hover:bg-primary/90'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
        >
          {createBooking.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : !user ? (
            <>Entrar para Reservar <ArrowRight className="w-4 h-4" /></>
          ) : !avail?.isAvailable ? (
            'Indisponível no período'
          ) : (
            <>Confirmar Reserva <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
          )}
        </motion.button>

        <button
          onClick={handleAddToProject}
          className="w-full h-11 rounded-2xl border border-zinc-700/60 bg-zinc-900/40
                     text-[11px] font-black uppercase tracking-widest text-zinc-400
                     hover:text-primary hover:border-primary/30 hover:bg-primary/5
                     flex items-center justify-center gap-2 transition-all"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          + Adicionar ao Projeto
        </button>
      </div>

      {/* ── Trust badges ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Proteção HUB
        </span>
        <span className="text-zinc-700">·</span>
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-600 fill-yellow-600" /> Avaliação 4.9
        </span>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function EquipmentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: equipment, isLoading, error } = useEquipment(id || '');
  const [activeImage, setActiveImage] = useState(0);

  const { data: reviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => ReviewService.getByEquipment(id || ''),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px] animate-pulse">
          Sincronizando com o Banco...
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
          <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl uppercase font-black text-xs">
            Tentar Novamente
          </Button>
          <Button onClick={() => navigate('/')} className="rounded-xl uppercase font-black text-xs">
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
    <div className="min-h-screen bg-black text-zinc-100 pb-24 md:pb-12">

      {/* ── Sticky top bar ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between max-w-6xl">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-tighter">Voltar</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-600 bg-zinc-900/60 px-3 py-1.5 rounded-xl border border-zinc-800">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Seguro Ativo
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 lg:gap-12 items-start">

          {/* ── Left: images + info ───────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Main image */}
            <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 relative">
              {equipment.images?.[activeImage] ? (
                <img
                  src={equipment.images[activeImage]}
                  alt={equipment.name}
                  className="w-full h-full object-contain p-6 animate-in fade-in duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                  <Camera className="w-20 h-20" />
                </div>
              )}
              {/* Category badge */}
              <div className="absolute top-4 left-4">
                <Badge className="bg-primary/90 backdrop-blur-md text-white border-none font-black uppercase tracking-tighter px-3 py-1">
                  {equipment.category}
                </Badge>
              </div>
            </div>

            {/* Thumbnail strip */}
            {equipment.images && equipment.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {equipment.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 shrink-0 transition-all
                      ${activeImage === idx ? 'border-primary scale-105' : 'border-zinc-800 opacity-50 hover:opacity-100'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Equipment info */}
            <div>
              {/* Tags row */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest ${conditionColors[equipment.condition] ?? 'bg-zinc-800 text-zinc-400'}`}>
                  {conditionLabels[equipment.condition] ?? 'N/A'}
                </span>
                <div className="flex items-center gap-1.5 text-zinc-300 text-[10px] font-black uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-xl">
                  {equipment.company?.logo_url
                    ? <img src={equipment.company.logo_url} alt="" className="w-4 h-4 rounded-md object-cover shrink-0" />
                    : <Building2 className="w-3 h-3 text-primary shrink-0" />}
                  <span>{equipment.company?.name ?? 'Matriz'}</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-300 text-[10px] font-black uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-xl">
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
              <p className="text-zinc-400 text-sm md:text-base leading-relaxed font-medium">
                {equipment.description}
              </p>
            </div>

            {/* Technical specs */}
            {equipment.features && Object.keys(equipment.features).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" /> Detalhes Técnicos
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(equipment.features).map(([key, value]) => (
                    <div key={key} className="bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
                      <p className="text-[11px] uppercase font-black text-zinc-500 tracking-widest mb-1">{key}</p>
                      <p className="font-bold text-zinc-300">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: booking panel (sticky on desktop) ───────────────────── */}
          <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
            {/* Price header */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">
                  Preço da Diária
                </p>
                <span className="text-4xl font-black tracking-tighter text-white">
                  {brl(equipment.daily_rate)}
                </span>
                <span className="text-zinc-500 text-sm font-bold ml-1">/dia</span>
              </div>
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-black">4.9</span>
              </div>
            </div>

            {/* Inline booking form */}
            <InlineBookingPanel equipment={equipment} />
          </div>
        </div>
      </div>
    </div>
  );
}
