import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, differenceInDays, format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { CalendarPlus, CheckCircle2, Loader2, MapPin, PackageCheck, RotateCcw, Store, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useDeliveries } from '@/hooks/useDeliveries';

/**
 * Logística reversa do pedido: devolução (cliente leva ou pede coleta) e prorrogação
 * (cliente pede, locadora aprova). As regras ficam no banco (V41): as ações do cliente
 * passam por funções RPC, e a locadora avança a devolução etapa por etapa.
 */

type Extension = {
  id: string;
  current_end_date: string;
  new_end_date: string;
  extra_days: number;
  extra_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
};

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const ddmm = (d: string) => format(parseISO(d), 'dd/MM');

const sectionClass = 'bg-zinc-900/30 border border-zinc-900 rounded-3xl p-5 md:p-8 space-y-5';
const optionClass = (active: boolean) =>
  `flex items-start gap-3 p-4 rounded-2xl border text-left transition-colors ${
    active ? 'bg-primary/10 border-primary/40' : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
  }`;

export function OrderReturnPanel({ order }: { order: any }) {
  const queryClient = useQueryClient();
  const isRenter = order._direction === 'sent';
  const [mode, setMode] = useState<'idle' | 'return' | 'extend'>('idle');
  const [method, setMethod] = useState<'dropoff' | 'pickup'>('dropoff');
  const [address, setAddress] = useState<string>(order.delivery_address || '');
  const [newEnd, setNewEnd] = useState(format(addDays(parseISO(order.end_date), 1), 'yyyy-MM-dd'));
  const [busy, setBusy] = useState(false);

  const { data: deliveries } = useDeliveries({ bookingId: order.id });
  const delivery: any = deliveries?.[0];
  const reverse: string = delivery?.reverse_logistics_status || 'not_started';
  const returnStarted = !['not_started', 'cancelled'].includes(reverse);

  // Sem a migration V41 a tabela não existe: o painel só esconde a parte de prorrogação
  const { data: extensions } = useQuery({
    queryKey: ['booking-extensions', order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_extensions')
        .select('*')
        .eq('booking_id', order.id)
        .order('created_at', { ascending: false });
      if (error) return [] as Extension[];
      return (data || []) as Extension[];
    },
  });
  const pendingExt = extensions?.find(e => e.status === 'pending');
  const lastDecided = extensions?.find(e => e.status === 'approved' || e.status === 'rejected');

  // Atualiza sozinho quando a outra parte responde
  useEffect(() => {
    const channel = supabase
      .channel(`booking-extensions-${order.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_extensions', filter: `booking_id=eq.${order.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['booking-extensions', order.id] });
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [order.id, queryClient]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    queryClient.invalidateQueries({ queryKey: ['booking-extensions', order.id] });
    queryClient.invalidateQueries({ queryKey: ['booking-extensions-pending'] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };

  const run = async (fn: () => PromiseLike<{ error: any }>, success: string) => {
    setBusy(true);
    try {
      const { error } = await fn();
      if (error) throw error;
      toast.success(success);
      setMode('idle');
      refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível concluir. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  const canExtend = ['approved', 'active'].includes(order.status) && !returnStarted && !pendingExt;
  const canReturn = order.status === 'active' && !returnStarted;
  const relevant = ['approved', 'active', 'completed'].includes(order.status) || returnStarted || (extensions?.length ?? 0) > 0;
  if (!relevant) return null;

  const extraDays = Math.max(0, differenceInDays(parseISO(newEnd), parseISO(order.end_date)));
  const extraAmount = (order.equipment?.daily_rate || 0) * extraDays * (order.quantity || 1);

  // ── Situação da devolução, em texto ──
  const returnStatusText = (() => {
    const pickup = delivery?.return_method === 'pickup';
    switch (reverse) {
      case 'requested':
        return pickup
          ? `Coleta pedida em ${delivery?.reverse_logistics_address || 'endereço informado'}. Aguardando a locadora.`
          : isRenter
            ? 'Devolução pedida: leve o equipamento até a locadora. Ela confirma o recebimento por aqui.'
            : 'O cliente vai trazer o equipamento até a locadora.';
      case 'collecting':
      case 'in_transit':
        return isRenter ? 'A locadora está a caminho para coletar o equipamento.' : 'Coleta em andamento.';
      case 'returned':
        return isRenter ? 'Equipamento recebido pela locadora, em conferência.' : 'Equipamento recebido. Confira e encerre a locação.';
      case 'completed':
        return 'Devolução concluída. Locação encerrada.';
      default:
        return null;
    }
  })();

  // ── Ações da locadora na devolução ──
  const advanceReturn = (next: string, success: string) =>
    run(async () => {
      const res = await supabase.from('deliveries').update({ reverse_logistics_status: next }).eq('id', delivery.id);
      if (res.error || next !== 'completed') return res;
      return supabase.from('bookings').update({ status: 'completed' }).eq('id', order.id);
    }, success);

  const providerReturnActions = () => {
    if (!delivery) return null;
    const pickup = delivery.return_method === 'pickup';
    if (reverse === 'requested' && pickup) {
      return (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button disabled={busy} onClick={() => advanceReturn('collecting', 'Coleta iniciada.')} className="h-12 rounded-xl font-semibold text-[11px] gap-2">
            <Truck className="h-4 w-4" /> Saí para coletar
          </Button>
          <Button disabled={busy} variant="outline" onClick={() => advanceReturn('returned', 'Recebimento confirmado.')} className="h-12 rounded-xl border-zinc-700 font-semibold text-[11px] ">
            Já recebi o equipamento
          </Button>
        </div>
      );
    }
    if (reverse === 'requested' || reverse === 'collecting' || reverse === 'in_transit') {
      return (
        <Button disabled={busy} onClick={() => advanceReturn('returned', 'Recebimento confirmado.')} className="h-12 rounded-xl font-semibold text-[11px] gap-2">
          <PackageCheck className="h-4 w-4" /> Confirmar recebimento
        </Button>
      );
    }
    if (reverse === 'returned') {
      return (
        <Button disabled={busy} onClick={() => advanceReturn('completed', 'Locação encerrada.')} className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-[11px] gap-2">
          <CheckCircle2 className="h-4 w-4" /> Conferido — encerrar locação
        </Button>
      );
    }
    return null;
  };

  return (
    <div className={sectionClass}>
      <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
        <RotateCcw className="h-4 w-4 text-primary" /> Devolução e prorrogação
      </h3>

      {/* ── Prorrogação pendente ── */}
      {pendingExt && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <p className="text-sm text-amber-200">
            {isRenter ? 'Você pediu prorrogação' : 'O cliente pediu prorrogação'} até{' '}
            <strong>{ddmm(pendingExt.new_end_date)}</strong> · +{pendingExt.extra_days} {pendingExt.extra_days === 1 ? 'diária' : 'diárias'} · <strong>{brl(pendingExt.extra_amount)}</strong>
          </p>
          {isRenter ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">Aguardando a resposta da locadora.</p>
              <Button disabled={busy} variant="ghost" size="sm" onClick={() => run(() => supabase.rpc('cancel_booking_extension', { p_extension_id: pendingExt.id }), 'Pedido de prorrogação cancelado.')} className="h-10 text-zinc-400 text-[11px] font-bold">
                Cancelar pedido
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 justify-end">
              <Button disabled={busy} variant="ghost" onClick={() => run(() => supabase.rpc('decide_booking_extension', { p_extension_id: pendingExt.id, p_approve: false }), 'Prorrogação recusada.')} className="h-11 text-destructive font-semibold text-[11px] ">
                Recusar
              </Button>
              <Button disabled={busy} onClick={() => run(() => supabase.rpc('decide_booking_extension', { p_extension_id: pendingExt.id, p_approve: true }), 'Prorrogação aprovada.')} className="h-11 bg-emerald-600 hover:bg-emerald-500 font-semibold text-[11px] rounded-xl px-6">
                Aprovar
              </Button>
            </div>
          )}
        </div>
      )}

      {!pendingExt && lastDecided && (
        <p className="text-xs text-zinc-500">
          {lastDecided.status === 'approved'
            ? `Prorrogação até ${ddmm(lastDecided.new_end_date)} aprovada (+${brl(lastDecided.extra_amount)}).`
            : `A prorrogação até ${ddmm(lastDecided.new_end_date)} foi recusada.`}
        </p>
      )}

      {/* ── Devolução em andamento ── */}
      {returnStatusText && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
          <p className="text-sm text-indigo-100">{returnStatusText}</p>
          {isRenter && reverse === 'requested' && (
            <Button disabled={busy} variant="ghost" size="sm" onClick={() => run(() => supabase.rpc('cancel_booking_return', { p_booking_id: order.id }), 'Devolução cancelada.')} className="h-10 text-zinc-400 text-[11px] font-bold">
              Cancelar devolução
            </Button>
          )}
          {!isRenter && providerReturnActions()}
        </div>
      )}

      {/* ── Cliente: opções ── */}
      {isRenter && mode === 'idle' && (canReturn || canExtend) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {canReturn && (
            <Button onClick={() => setMode('return')} className="h-12 rounded-xl font-semibold text-[11px] gap-2">
              <RotateCcw className="h-4 w-4" /> Devolver equipamento
            </Button>
          )}
          {canExtend && (
            <Button variant="outline" onClick={() => setMode('extend')} className="h-12 rounded-xl border-zinc-700 font-semibold text-[11px] gap-2">
              <CalendarPlus className="h-4 w-4" /> Prorrogar locação
            </Button>
          )}
        </div>
      )}

      {/* ── Cliente: formulário de devolução ── */}
      {isRenter && mode === 'return' && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">Como o equipamento vai voltar para a locadora?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button onClick={() => setMethod('dropoff')} className={optionClass(method === 'dropoff')}>
              <Store className="h-5 w-5 text-primary shrink-0" />
              <span>
                <span className="block text-sm font-black text-white">Vou levar até a locadora</span>
                <span className="block text-xs text-zinc-500">A locadora confirma quando receber.</span>
              </span>
            </button>
            <button onClick={() => setMethod('pickup')} className={optionClass(method === 'pickup')}>
              <Truck className="h-5 w-5 text-primary shrink-0" />
              <span>
                <span className="block text-sm font-black text-white">Quero que busquem</span>
                <span className="block text-xs text-zinc-500">A locadora coleta no endereço informado.</span>
              </span>
            </button>
          </div>
          {method === 'pickup' && (
            <div className="relative">
              <MapPin className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Endereço completo para a coleta"
                className="w-full h-12 bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50"
              />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setMode('idle')} className="h-11 text-zinc-400 text-[11px] font-bold">Voltar</Button>
            <Button
              disabled={busy || (method === 'pickup' && !address.trim())}
              onClick={() => run(() => supabase.rpc('request_booking_return', { p_booking_id: order.id, p_method: method, p_address: method === 'pickup' ? address.trim() : null }), 'Devolução solicitada. A locadora foi avisada.')}
              className="h-11 rounded-xl font-semibold text-[11px] px-6"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar devolução'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Cliente: formulário de prorrogação ── */}
      {isRenter && mode === 'extend' && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">
            Hoje a devolução é em <strong className="text-zinc-200">{ddmm(order.end_date)}</strong>. Até quando você quer ficar?
          </p>
          <input
            type="date"
            value={newEnd}
            min={format(addDays(parseISO(order.end_date), 1), 'yyyy-MM-dd')}
            onChange={e => e.target.value && setNewEnd(e.target.value)}
            className="w-full sm:w-64 h-12 bg-zinc-950 border border-zinc-800 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-primary/50"
          />
          {extraDays > 0 && (
            <p className="text-sm text-zinc-300">
              +{extraDays} {extraDays === 1 ? 'diária' : 'diárias'} · <strong>{brl(extraAmount)}</strong>
              <span className="text-zinc-500"> (a locadora precisa aprovar)</span>
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setMode('idle')} className="h-11 text-zinc-400 text-[11px] font-bold">Voltar</Button>
            <Button
              disabled={busy || extraDays <= 0}
              onClick={() => run(() => supabase.rpc('request_booking_extension', { p_booking_id: order.id, p_new_end_date: newEnd }), 'Pedido de prorrogação enviado à locadora.')}
              className="h-11 rounded-xl font-semibold text-[11px] px-6"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pedir prorrogação'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Locadora: nada pendente ── */}
      {!isRenter && !pendingExt && !returnStatusText && (
        <p className="text-sm text-zinc-500">
          Quando o cliente pedir a devolução ou a prorrogação, você responde por aqui.
        </p>
      )}
    </div>
  );
}
