import { format, addDays } from 'date-fns';
import { formatShootDays } from '@/lib/schedule';
import {
  CheckCircle2, ClipboardCheck, PackageCheck, Truck, Store, Undo2, CalendarPlus,
  AlertTriangle, Inbox, Handshake, ChevronRight,
} from 'lucide-react';

/**
 * "Ações pendentes": o que a pessoa precisa fazer agora, em ordem de urgência.
 * Junta os pedidos recebidos (sou a locadora) e enviados (eu aluguei).
 */

type Tone = 'urgent' | 'normal';

interface Action {
  id: string;
  tone: Tone;
  icon: typeof Inbox;
  title: string;
  detail: string;
  /** Pedido a abrir: id do item ou o project_id (pedido com vários itens) */
  openKey: string;
}

interface PendingActionsProps {
  bookingsReceived: any[];
  bookingsRequested: any[];
  pendingExtensionIds?: Set<string>;
  tenantId?: string | null;
  onOpen: (key: string) => void;
}

const getDelivery = (b: any) => {
  const d = b.delivery || b.deliveries;
  return Array.isArray(d) ? d[0] : d || null;
};

const shortDate = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export function buildPendingActions({ bookingsReceived, bookingsRequested, pendingExtensionIds, tenantId }: Omit<PendingActionsProps, 'onOpen'>): Action[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const received = bookingsReceived;
  const actions: Action[] = [];

  // Pedidos com vários itens abrem o pedido completo
  const groupSize = new Map<string, number>();
  [...received, ...bookingsRequested].forEach(b => {
    if (b.project_id) groupSize.set(b.project_id, (groupSize.get(b.project_id) || 0) + 1);
  });
  const keyOf = (b: any) => (b.project_id && (groupSize.get(b.project_id) || 0) > 1 ? b.project_id : b.id);
  const client = (b: any) => b.renter?.company?.name || b.renter?.full_name || 'Cliente';
  const rental = (b: any) => b.owner_company?.name || 'Locadora';
  const name = (b: any) => b.equipment?.name || 'Equipamento';

  // ── Locadora ──────────────────────────────────────────────────────────────
  // 1. Aprovar pedidos (um por pedido, mesmo com vários itens)
  const pendingGroups = new Map<string, any[]>();
  received.filter(b => b.status === 'pending').forEach(b => {
    const k = keyOf(b);
    pendingGroups.set(k, [...(pendingGroups.get(k) || []), b]);
  });
  pendingGroups.forEach((items, key) => {
    const first = items[0];
    actions.push({
      id: `approve-${key}`,
      tone: first.start_date <= tomorrow ? 'urgent' : 'normal',
      icon: Inbox,
      title: 'Aprovar pedido',
      detail: `${client(first)} · ${items.length > 1 ? `${items.length} equipamentos` : name(first)} · ${first.shoot_dates?.length ? `grava ${formatShootDays(first.shoot_dates)}` : first.shoot_start_date ? `grava ${shortDate(first.shoot_start_date)}` : `${shortDate(first.start_date)} → ${shortDate(first.end_date)}`}`,
      openKey: key,
    });
  });

  received.forEach(b => {
    const d = getDelivery(b);
    const fulfiller = d?.fulfilling_company_id || d?.origin_branch_id;

    // 2. Sub-locação aguardando meu aceite
    if (d?.subrental_status === 'pending' && fulfiller === tenantId && b.company_id !== tenantId) {
      actions.push({ id: `sub-${b.id}`, tone: 'urgent', icon: Handshake, title: 'Aceitar sub-locação', detail: `${name(b)} · ${shortDate(b.start_date)}`, openKey: b.id });
    }

    // 3. Preparar e enviar o que já foi aprovado
    if (b.status === 'approved') {
      const st = d?.status || 'pending';
      const soon = b.start_date <= tomorrow;
      if (st === 'pending' || st === 'picking') {
        actions.push({ id: `pick-${b.id}`, tone: soon ? 'urgent' : 'normal', icon: ClipboardCheck, title: st === 'picking' ? 'Terminar a separação' : 'Separar equipamento', detail: `${name(b)} · sai ${b.start_date <= today ? 'hoje' : shortDate(b.start_date)}`, openKey: b.id });
      } else if (st === 'ready' && b.delivery_method === 'delivery') {
        actions.push({ id: `ship-${b.id}`, tone: soon ? 'urgent' : 'normal', icon: Truck, title: 'Despachar entrega', detail: `${name(b)} · ${client(b)}`, openKey: b.id });
      }
    }

    // 4. Devoluções
    const rev = d?.reverse_logistics_status;
    if (rev === 'requested') {
      actions.push({ id: `ret-${b.id}`, tone: 'normal', icon: Undo2, title: 'Organizar devolução', detail: `${name(b)} · ${client(b)}`, openKey: b.id });
    } else if (rev === 'returned' && b.status !== 'completed') {
      actions.push({ id: `check-${b.id}`, tone: 'normal', icon: PackageCheck, title: 'Conferir equipamento devolvido', detail: `${name(b)} · ${client(b)}`, openKey: b.id });
    } else if (b.status === 'active' && b.end_date < today && !rev) {
      actions.push({ id: `late-${b.id}`, tone: 'urgent', icon: AlertTriangle, title: 'Devolução atrasada', detail: `${name(b)} · era ${shortDate(b.end_date)} · ${client(b)}`, openKey: b.id });
    }

    // 5. Prorrogação pedida pelo cliente
    if (pendingExtensionIds?.has(b.id)) {
      actions.push({ id: `ext-${b.id}`, tone: 'normal', icon: CalendarPlus, title: 'Responder prorrogação', detail: `${name(b)} · ${client(b)}`, openKey: b.id });
    }
  });

  // ── Cliente (pedidos que eu fiz) ──────────────────────────────────────────
  bookingsRequested.forEach(b => {
    const d = getDelivery(b);
    if (d?.status === 'delivered' && b.status !== 'completed') {
      actions.push({ id: `recv-${b.id}`, tone: 'urgent', icon: CheckCircle2, title: 'Confirmar recebimento', detail: `${name(b)} chegou · ${rental(b)}`, openKey: keyOf(b) });
    } else if (b.status === 'approved' && d?.status === 'ready' && b.delivery_method !== 'delivery') {
      actions.push({ id: `pickup-${b.id}`, tone: 'normal', icon: Store, title: 'Pronto para retirada', detail: `${name(b)} · ${rental(b)}`, openKey: keyOf(b) });
    }
    if (b.status === 'active' && !d?.reverse_logistics_status && b.end_date <= tomorrow && !pendingExtensionIds?.has(b.id)) {
      actions.push({
        id: `due-${b.id}`,
        tone: b.end_date <= today ? 'urgent' : 'normal',
        icon: Undo2,
        title: b.end_date < today ? 'Devolução atrasada' : b.end_date === today ? 'Devolver hoje' : 'Devolver amanhã',
        detail: `${name(b)} · peça a devolução ou prorrogue`,
        openKey: b.id,
      });
    }
  });

  return actions.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'urgent' ? -1 : 1));
}

export function PendingActions(props: PendingActionsProps) {
  const actions = buildPendingActions(props);

  return (
    <section className="space-y-3" aria-labelledby="pending-actions-title">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="pending-actions-title" className="text-lg font-black tracking-tighter uppercase">Ações pendentes</h3>
        {actions.length > 0 && (
          <span className="text-xs font-semibold text-zinc-500">{actions.length} {actions.length === 1 ? 'item' : 'itens'}</span>
        )}
      </div>

      {actions.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 px-4 py-3.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <p className="text-sm text-zinc-400"><span className="font-semibold text-zinc-200">Tudo em dia.</span> Nenhuma ação pendente agora.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 divide-y divide-zinc-800/70 overflow-hidden">
          {actions.slice(0, 8).map(({ id, tone, icon: Icon, title, detail, openKey }) => (
            <button
              key={id}
              onClick={() => props.onOpen(openKey)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-900/60 transition-colors"
            >
              <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${tone === 'urgent' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-100">{title}</span>
                  {tone === 'urgent' && <span className="text-[11px] font-semibold text-amber-500">Urgente</span>}
                </span>
                <span className="block text-xs text-zinc-500 truncate">{detail}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
            </button>
          ))}
          {actions.length > 8 && (
            <p className="px-4 py-2.5 text-xs text-zinc-500">E mais {actions.length - 8}. Veja todos em Pedidos.</p>
          )}
        </div>
      )}
    </section>
  );
}
