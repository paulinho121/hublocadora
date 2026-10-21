import { useState, useEffect, useCallback } from 'react';
import {
  X, Minus, Plus, Trash2, Clapperboard, CalendarDays, Package,
  CheckCircle2, Loader2, AlertCircle, FolderOpen, Truck, MapPin,
  User as UserIcon, ArrowRight, Sparkles, ShoppingBag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, addDays, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { BookingService } from '@/services/BookingService';
import { useCreateProject, createOutboundShipment } from '@/hooks/useProjects';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';

// ─── Availability per item ────────────────────────────────────────────────────

type AvailStatus = 'idle' | 'checking' | 'ok' | 'conflict';
type AvailMap = Record<string, AvailStatus>;

// ─── Checkout result ──────────────────────────────────────────────────────────

interface BookingResult {
  name: string;
  success: boolean;
  error?: string;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectDrawer() {
  const {
    state, removeItem, updateQuantity, setDates, setProjectName,
    openDrawer, closeDrawer, clearCart, isInCart, totalDays, estimatedTotal,
  } = useProject();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Volta do cadastro/login (link do e-mail ou Google) com ?pedido=abrir: reabre o carrinho
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('pedido') !== 'abrir') return;
    params.delete('pedido');
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    if (user) openDrawer();
  }, [location.search, user]); // eslint-disable-line react-hooks/exhaustive-deps
  const { company } = useTenant();
  const queryClient = useQueryClient();
  const createProject = useCreateProject();

  // ── local UI state ──────────────────────────────────────────────────────────
  const [availMap, setAvailMap]         = useState<AvailMap>({});
  // Unidades livres de cada item em todo o período escolhido
  const [freeMap, setFreeMap]           = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults]           = useState<BookingResult[] | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryContact, setDeliveryContact] = useState('');

  // ── auto-fill company address when switching to delivery ───────────────────
  useEffect(() => {
    if (deliveryMethod === 'delivery' && !deliveryAddress && company) {
      const parts = [
        company.address_street,
        company.address_number,
        company.address_neighborhood,
        company.address_city && company.address_state
          ? `${company.address_city} - ${company.address_state}`
          : company.address_city || company.address_state,
      ].filter(Boolean);
      setDeliveryAddress(parts.join(', '));
    }
  }, [deliveryMethod, company]);

  // ── check availability whenever items or dates change ──────────────────────
  const checkAvailability = useCallback(async () => {
    if (state.items.length === 0) { setAvailMap({}); return; }

    // Mark all as checking
    setAvailMap(prev => {
      const next: AvailMap = { ...prev };
      state.items.forEach(i => { next[i.equipment.id] = 'checking'; });
      return next;
    });

    await Promise.all(
      state.items.map(async (item) => {
        try {
          const free = await BookingService.getFreeUnits(
            item.equipment.id,
            state.startDate,
            state.endDate,
            item.equipment.stock_quantity,
          );
          setFreeMap(prev => ({ ...prev, [item.equipment.id]: free }));
          setAvailMap(prev => ({ ...prev, [item.equipment.id]: item.quantity <= free ? 'ok' : 'conflict' }));
        } catch {
          setAvailMap(prev => ({ ...prev, [item.equipment.id]: 'conflict' }));
        }
      }),
    );
  }, [state.items, state.startDate, state.endDate]);

  useEffect(() => { checkAvailability(); }, [checkAvailability]);

  // ── guard: start date must not be after end date ───────────────────────────
  const handleStartDateChange = (v: string) => {
    const start = v;
    let end = state.endDate;
    if (!isBefore(startOfDay(parseISO(start)), startOfDay(parseISO(end)))) {
      end = format(addDays(parseISO(start), 1), 'yyyy-MM-dd');
    }
    setDates(start, end);
  };

  const handleEndDateChange = (v: string) => {
    let end = v;
    if (!isBefore(startOfDay(parseISO(state.startDate)), startOfDay(parseISO(end)))) {
      end = format(addDays(parseISO(state.startDate), 1), 'yyyy-MM-dd');
    }
    setDates(state.startDate, end);
  };

  // ── checkout ───────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!user) {
      // O carrinho fica salvo no aparelho; depois do cadastro a pessoa volta com ele aberto
      closeDrawer();
      navigate('/register', { state: { from: { pathname: '/', search: '?pedido=abrir' }, intent: 'booking' } });
      return;
    }

    const conflicts = state.items.filter(i => availMap[i.equipment.id] === 'conflict');
    if (conflicts.length > 0) {
      toast.error(`${conflicts.length} item(ns) indisponível(is) no período selecionado.`);
      return;
    }
    if (deliveryMethod === 'delivery' && !deliveryAddress.trim()) {
      toast.error('Informe o endereço de entrega.'); return;
    }
    if (deliveryMethod === 'delivery' && !deliveryContact.trim()) {
      toast.error('Informe o responsável pelo recebimento.'); return;
    }

    setIsSubmitting(true);
    const projectLabel = state.projectName.trim() || 'Projeto via HUB';
    const out: BookingResult[] = [];

    // 1. Create the project record first
    let projectId: string | null = null;
    try {
      const proj = await createProject.mutateAsync({
        name:             projectLabel,
        renter_id:        user.id,
        delivery_method:  deliveryMethod,
        delivery_address: deliveryMethod === 'delivery' ? deliveryAddress.trim() : null,
        delivery_contact: deliveryMethod === 'delivery' ? deliveryContact.trim() : null,
        start_date:       state.startDate,
        end_date:         state.endDate,
      });
      projectId = proj.id;
    } catch (err: any) {
      toast.error('Erro ao criar projeto. Tente novamente.');
      setIsSubmitting(false);
      return;
    }

    // 2. Create one booking per item, linked to the project
    for (const item of state.items) {
      try {
        const booking = await BookingService.createBooking({
          equipment_id:         item.equipment.id,
          company_id:           item.equipment.company_id,
          renter_id:            user.id,
          project_id:           projectId,
          start_date:           state.startDate,
          end_date:             state.endDate,
          total_amount:         item.equipment.daily_rate * item.quantity * totalDays,
          status:               'pending',
          quantity:             item.quantity,
          delivery_method:      deliveryMethod,
          delivery_address:     deliveryMethod === 'delivery' ? deliveryAddress.trim() : null,
          delivery_contact:     deliveryMethod === 'delivery' ? deliveryContact.trim() : null,
          notes:                `Projeto: ${projectLabel}`,
          subrental_company_id: null,
          origin_branch_id:     null,
        });

        // 3. Create outbound shipment record for this booking
        try {
          await createOutboundShipment({
            project_id: projectId!,
            booking_id: booking.id,
            company_id: item.equipment.company_id,
          });
        } catch {
          // shipment creation is non-critical — log but don't fail the booking
          console.warn('Shipment record could not be created for booking', booking.id);
        }

        out.push({ name: item.equipment.name, success: true });
      } catch (err: any) {
        out.push({ name: item.equipment.name, success: false, error: err?.message });
      }
    }

    const ok   = out.filter(r => r.success).length;
    const fail = out.filter(r => !r.success).length;

    if (ok > 0) {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-active-bookings'] });
    }

    setResults(out);
    setIsSubmitting(false);

    if (fail === 0) clearCart();
  };

  const allOk = Object.values(availMap).length > 0 &&
    Object.values(availMap).every(s => s === 'ok');
  const hasConflict = Object.values(availMap).some(s => s === 'conflict');
  const isChecking  = Object.values(availMap).some(s => s === 'checking');

  // ── backdrop + panel ───────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {state.isDrawerOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm"
            onClick={closeDrawer}
          />

          {/* Panel — slides from right */}
          <motion.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 38 }}
            className="fixed right-0 top-0 bottom-0 z-[120] w-full sm:w-[500px] flex flex-col bg-zinc-950 border-l border-zinc-800/80 shadow-[−20px_0_60px_rgba(0,0,0,0.6)]"
          >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clapperboard className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-zinc-500">Locação em conjunto</p>
                  <h2 className="text-sm font-black uppercase tracking-wider text-white leading-none mt-0.5">
                    Meu Pedido
                  </h2>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* ── Scrollable body ──────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">

              {/* Success screen */}
              {results && (
                <div className="p-6 flex flex-col gap-4">
                  <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">
                      Pedido enviado!
                    </h3>
                    <p className="text-zinc-500 text-xs mt-1">
                      Acompanhe as reservas no seu painel
                    </p>
                  </div>

                  {results.map((r) => (
                    <div
                      key={r.name}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${
                        r.success
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-red-500/5 border-red-500/20'
                      }`}
                    >
                      {r.success
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        : <AlertCircle  className="w-4 h-4 text-red-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{r.name}</p>
                        {!r.success && (
                          <p className="text-[11px] text-red-400 mt-0.5">{r.error ?? 'Erro desconhecido'}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  <Button
                    className="w-full h-12 rounded-2xl bg-primary text-white font-semibold text-xs mt-2"
                    onClick={() => { setResults(null); closeDrawer(); }}
                  >
                    Fechar
                  </Button>
                </div>
              )}

              {/* Main form */}
              {!results && (
                <div className="p-6 flex flex-col gap-6">

                  {/* Project name */}
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 mb-2">
                      Nome da produção (opcional)
                    </label>
                    <input
                      type="text"
                      value={state.projectName}
                      onChange={e => setProjectName(e.target.value)}
                      placeholder="Ex: Curta-metragem, Comercial de Verão…"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {/* Period */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarDays className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-semibold text-zinc-500">
                        Período da locação
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
                          Início
                        </label>
                        <input
                          type="date"
                          value={state.startDate}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          onChange={e => handleStartDateChange(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
                          Devolução
                        </label>
                        <input
                          type="date"
                          value={state.endDate}
                          min={format(addDays(parseISO(state.startDate), 1), 'yyyy-MM-dd')}
                          onChange={e => handleEndDateChange(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-2 font-semibold">
                      {totalDays} {totalDays === 1 ? 'diária' : 'diárias'} ·{' '}
                      {format(parseISO(state.startDate), "d 'de' MMM", { locale: ptBR })}
                      {' → '}
                      {format(parseISO(state.endDate), "d 'de' MMM", { locale: ptBR })}
                    </p>
                  </div>

                  {/* Items list */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[11px] font-semibold text-zinc-500">
                          Equipamentos ({state.items.length})
                        </span>
                      </div>
                      {state.items.length > 0 && (
                        <button
                          onClick={() => { clearCart(); setResults(null); }}
                          className="text-[11px] font-semibold text-zinc-400 hover:text-red-400 transition-colors"
                        >
                          Limpar tudo
                        </button>
                      )}
                    </div>

                    {state.items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 border border-dashed border-zinc-800 rounded-2xl text-center gap-4 px-6">
                        <FolderOpen className="w-10 h-10 text-zinc-500" />
                        <div>
                          <p className="text-xs font-semibold text-zinc-400 ">
                            Pedido vazio
                          </p>
                          <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
                            Volte ao marketplace e clique em{' '}
                            <span className="text-primary font-black">+ Pedido</span>{' '}
                            em cada equipamento que quiser locar.
                          </p>
                        </div>
                        <button
                          onClick={closeDrawer}
                          className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl px-5 py-2.5 text-[11px] font-semibold transition-all"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          Ir ao marketplace
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {state.items.map((item) => {
                          const status = availMap[item.equipment.id] ?? 'idle';
                          const free = freeMap[item.equipment.id];
                          const img    = item.equipment.images?.[0];
                          const subtotal = item.equipment.daily_rate * item.quantity * totalDays;

                          return (
                            <motion.div
                              key={item.equipment.id}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              className={`relative flex gap-3 p-3 rounded-2xl border transition-colors ${
                                status === 'conflict'
                                  ? 'border-red-500/30 bg-red-500/5'
                                  : status === 'ok'
                                    ? 'border-zinc-800 bg-zinc-900/40'
                                    : 'border-zinc-800/50 bg-zinc-900/20'
                              }`}
                            >
                              {/* Thumbnail */}
                              <div className="w-16 h-16 rounded-xl bg-zinc-800/60 overflow-hidden shrink-0 flex items-center justify-center">
                                {img
                                  ? <img src={img} alt={item.equipment.name} className="w-full h-full object-contain p-1" />
                                  : <Package className="w-6 h-6 text-zinc-400" />}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                  <p className="text-sm font-bold text-white leading-tight line-clamp-2">
                                    {item.equipment.name}
                                  </p>

                                  {/* Availability badge */}
                                  <div className="mt-1">
                                    {status === 'checking' && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500">
                                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Verificando…
                                      </span>
                                    )}
                                    {status === 'ok' && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {free !== undefined
                                          ? `${free} de ${item.equipment.stock_quantity} disponíve${free === 1 ? 'l' : 'is'} no período`
                                          : 'Disponível'}
                                      </span>
                                    )}
                                    {status === 'conflict' && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400">
                                        <AlertCircle className="w-3 h-3" />
                                        {free
                                          ? `Só ${free} disponíve${free === 1 ? 'l' : 'is'} no período — diminua a quantidade`
                                          : 'Indisponível neste período'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Quantity + price */}
                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center gap-1.5 bg-zinc-800/60 rounded-lg p-0.5">
                                    <button
                                      onClick={() => updateQuantity(item.equipment.id, item.quantity - 1)}
                                      disabled={item.quantity <= 1}
                                      className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-zinc-700 disabled:opacity-30 transition-all text-white"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-xs font-black text-white w-5 text-center">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={() => updateQuantity(item.equipment.id, item.quantity + 1)}
                                      disabled={item.quantity >= (free ?? item.equipment.stock_quantity)}
                                      className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-zinc-700 disabled:opacity-30 transition-all text-white"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <span className="text-xs font-black text-white tabular-nums">
                                    {brl(subtotal)}
                                  </span>
                                </div>
                              </div>

                              {/* Remove */}
                              <button
                                onClick={() => removeItem(item.equipment.id)}
                                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Delivery */}
                  {state.items.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Truck className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[11px] font-semibold text-zinc-500">
                          Retirada / Entrega
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {(['pickup', 'delivery'] as const).map(method => (
                          <button
                            key={method}
                            onClick={() => setDeliveryMethod(method)}
                            className={`py-2.5 rounded-xl border text-[11px] font-semibold transition-all ${
                              deliveryMethod === method
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
                            }`}
                          >
                            {method === 'pickup' ? '📍 Retirada' : '🚚 Entrega'}
                          </button>
                        ))}
                      </div>

                      {deliveryMethod === 'delivery' && (
                        <div className="flex flex-col gap-2">
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                            <input
                              type="text"
                              value={deliveryAddress}
                              onChange={e => setDeliveryAddress(e.target.value)}
                              placeholder="Endereço de entrega"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50 transition-all"
                            />
                          </div>
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                            <input
                              type="text"
                              value={deliveryContact}
                              onChange={e => setDeliveryContact(e.target.value)}
                              placeholder="Responsável pelo recebimento"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50 transition-all"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer (sticky) ───────────────────────────────────────────── */}
            {!results && state.items.length > 0 && (
              <div className="shrink-0 border-t border-zinc-800/80 p-6 bg-zinc-950">
                {/* Total */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-500">
                      Total estimado
                    </p>
                    <p className="text-2xl font-display font-bold text-white tracking-tight">
                      {brl(estimatedTotal)}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {state.items.length} {state.items.length === 1 ? 'equipamento' : 'equipamentos'} · {totalDays} {totalDays === 1 ? 'diária' : 'diárias'}
                    </p>
                  </div>

                  {hasConflict && (
                    <div className="flex items-center gap-1.5 text-red-400 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] font-semibold ">Conflito</span>
                    </div>
                  )}
                  {allOk && !isChecking && (
                    <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] font-semibold ">Tudo livre</span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                {!user ? (
                  <Button
                    className="w-full h-14 rounded-2xl bg-primary text-white font-semibold text-xs shadow-lg shadow-primary/20"
                    onClick={handleCheckout}
                  >
                    Cadastre-se para finalizar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    className={`w-full h-14 rounded-2xl font-semibold text-xs transition-all ${
                      allOk && !isSubmitting
                        ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                    onClick={handleCheckout}
                    disabled={isSubmitting || !allOk || hasConflict || isChecking}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando reservas…</>
                    ) : isChecking ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando…</>
                    ) : hasConflict ? (
                      <>Resolva os conflitos de data</>
                    ) : (
                      <>Finalizar Pedido <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
