import { useState } from 'react';
import {
    X, Package, Truck, CheckCircle2, Clock, AlertCircle,
    Building2, CalendarDays, MapPin, ExternalLink, Loader2,
    Clapperboard, ChevronDown, ChevronUp, Edit3, Check,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Project, ProjectBooking, ProjectShipment } from '@/types/database';
import {
    useUpdateShipment,
    PROJECT_STATUS_LABEL, PROJECT_STATUS_COLOR,
    SHIPMENT_STATUS_LABEL, SHIPMENT_STATUS_COLOR,
    deriveProjectStatus,
} from '@/hooks/useProjects';
import { useTenant } from '@/contexts/TenantContext';

// ─── helpers ──────────────────────────────────────────────────────────────────

const brl = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const BOOKING_STATUS_LABEL: Record<string, string> = {
    pending:   'Aguardando',
    approved:  'Aprovado',
    rejected:  'Recusado',
    active:    'Ativo',
    completed: 'Concluído',
    cancelled: 'Cancelado',
};

const BOOKING_STATUS_COLOR: Record<string, string> = {
    pending:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
    approved:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    rejected:  'bg-red-500/15 text-red-400 border-red-500/30',
    active:    'bg-primary/15 text-primary border-primary/30',
    completed: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
};

function shipmentIcon(status: string, className = 'w-4 h-4') {
    const col = SHIPMENT_STATUS_COLOR[status] ?? 'text-zinc-500';
    if (status === 'delivered')     return <CheckCircle2 className={`${className} ${col}`} />;
    if (status === 'failed')        return <AlertCircle  className={`${className} ${col}`} />;
    if (status === 'in_transit' || status === 'out_for_delivery' || status === 'picked_up')
                                    return <Truck        className={`${className} ${col}`} />;
    return                                 <Clock        className={`${className} ${col}`} />;
}

// ─── Inline tracking form (for rental house owners) ───────────────────────────

function TrackingForm({
    shipment,
    onSaved,
}: {
    shipment: ProjectShipment;
    onSaved: () => void;
}) {
    const update = useUpdateShipment();
    const [carrier, setCarrier]       = useState(shipment.carrier ?? '');
    const [code, setCode]             = useState(shipment.tracking_code ?? '');
    const [estimated, setEstimated]   = useState(
        shipment.estimated_arrival ? shipment.estimated_arrival.slice(0, 10) : '',
    );

    const handleSave = async () => {
        if (!carrier.trim() || !code.trim()) {
            toast.error('Preencha transportadora e código de rastreio.');
            return;
        }
        try {
            await update.mutateAsync({
                id: shipment.id,
                data: {
                    carrier:            carrier.trim(),
                    tracking_code:      code.trim(),
                    estimated_arrival:  estimated || null,
                    status:             'in_transit',
                },
            });
            toast.success('Rastreio atualizado!');
            onSaved();
        } catch {
            toast.error('Erro ao salvar rastreio.');
        }
    };

    return (
        <div className="mt-3 p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/50 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Adicionar rastreio
            </p>
            <div className="grid grid-cols-2 gap-2">
                <input
                    value={carrier}
                    onChange={e => setCarrier(e.target.value)}
                    placeholder="Transportadora (ex: Correios)"
                    className="col-span-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50"
                />
                <input
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="Código de rastreio"
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50"
                />
                <input
                    type="date"
                    value={estimated}
                    onChange={e => setEstimated(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                    title="Previsão de entrega"
                />
            </div>
            <Button
                className="w-full h-8 rounded-lg bg-primary text-white font-black uppercase tracking-widest text-[10px]"
                onClick={handleSave}
                disabled={update.isPending}
            >
                {update.isPending
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <><Check className="w-3 h-3 mr-1.5" /> Salvar rastreio</>}
            </Button>
        </div>
    );
}

// ─── Company group ─────────────────────────────────────────────────────────────

function CompanyGroup({
    companyName,
    companyCity,
    logoUrl,
    bookings,
    isOwner,
}: {
    companyName: string;
    companyCity?: string;
    logoUrl?: string | null;
    bookings: ProjectBooking[];
    isOwner: boolean;
}) {
    const [expanded, setExpanded]         = useState(true);
    const [showTrackingId, setShowTrackingId] = useState<string | null>(null);

    // Overall group shipment status
    const shipStatuses = bookings.flatMap(b => b.project_shipments ?? []).map(s => s.status);
    const groupDelivered = shipStatuses.every(s => s === 'delivered') && shipStatuses.length > 0;
    const groupInTransit = shipStatuses.some(s => s === 'in_transit' || s === 'out_for_delivery');

    return (
        <div className="border border-zinc-800/70 rounded-2xl overflow-hidden">
            {/* Company header */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between p-4 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden">
                        {logoUrl
                            ? <img src={logoUrl} alt="" className="w-full h-full object-cover" />
                            : <Building2 className="w-4 h-4 text-zinc-500" />}
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-black uppercase tracking-wider text-white">{companyName}</p>
                        {companyCity && (
                            <p className="text-[9px] text-zinc-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-2.5 h-2.5" />{companyCity}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {groupDelivered && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Entregue
                        </span>
                    )}
                    {groupInTransit && !groupDelivered && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1">
                            <Truck className="w-3 h-3" /> Em trânsito
                        </span>
                    )}
                    {expanded
                        ? <ChevronUp   className="w-4 h-4 text-zinc-600" />
                        : <ChevronDown className="w-4 h-4 text-zinc-600" />}
                </div>
            </button>

            {/* Items */}
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="divide-y divide-zinc-800/50">
                            {bookings.map(booking => {
                                const eq       = booking.equipment as any;
                                const shipment = booking.project_shipments?.[0];
                                const shipSt   = shipment?.status ?? 'awaiting_approval';
                                const isShowingTracking = showTrackingId === booking.id;

                                return (
                                    <div key={booking.id} className="p-4">
                                        <div className="flex gap-3">
                                            {/* Thumbnail */}
                                            <div className="w-14 h-14 rounded-xl bg-zinc-800/60 overflow-hidden shrink-0 flex items-center justify-center">
                                                {eq?.images?.[0]
                                                    ? <img src={eq.images[0]} alt="" className="w-full h-full object-contain p-1" />
                                                    : <Package className="w-5 h-5 text-zinc-600" />}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-white line-clamp-2">
                                                        {eq?.name ?? 'Equipamento'}
                                                    </p>
                                                    <Badge className={`text-[8px] font-black uppercase tracking-widest border shrink-0 ${BOOKING_STATUS_COLOR[booking.status] ?? ''}`}>
                                                        {BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
                                                    </Badge>
                                                </div>

                                                <p className="text-[10px] text-zinc-500 mt-1">
                                                    {booking.quantity}× · {brl(booking.total_amount)}
                                                </p>

                                                {/* Shipment status row */}
                                                {shipment && (
                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                        {shipmentIcon(shipSt, 'w-3 h-3')}
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${SHIPMENT_STATUS_COLOR[shipSt]}`}>
                                                            {SHIPMENT_STATUS_LABEL[shipSt]}
                                                        </span>
                                                        {shipment.tracking_code && (
                                                            <span className="text-[9px] text-zinc-600 font-mono">
                                                                · {shipment.tracking_code}
                                                            </span>
                                                        )}
                                                        {shipment.tracking_url && (
                                                            <a
                                                                href={shipment.tracking_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={e => e.stopPropagation()}
                                                                className="text-primary hover:underline"
                                                            >
                                                                <ExternalLink className="w-2.5 h-2.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                )}

                                                {shipment?.estimated_arrival && (
                                                    <p className="text-[9px] text-zinc-600 mt-0.5">
                                                        Previsão:{' '}
                                                        {format(parseISO(shipment.estimated_arrival), "d 'de' MMM", { locale: ptBR })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex gap-2 mt-3">
                                            {/* Rental house: add/edit tracking */}
                                            {isOwner && booking.status === 'approved' && shipment && shipSt !== 'delivered' && (
                                                <button
                                                    onClick={() => setShowTrackingId(isShowingTracking ? null : booking.id)}
                                                    className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-primary transition-colors"
                                                >
                                                    <Edit3 className="w-3 h-3" />
                                                    {shipment.tracking_code ? 'Editar rastreio' : 'Adicionar rastreio'}
                                                </button>
                                            )}

                                            {/* Renter: confirm delivery */}
                                            {!isOwner && shipSt === 'in_transit' && shipment && (
                                                <ConfirmDeliveryButton shipmentId={shipment.id} />
                                            )}
                                        </div>

                                        {/* Tracking form inline */}
                                        {isShowingTracking && shipment && (
                                            <TrackingForm
                                                shipment={shipment}
                                                onSaved={() => setShowTrackingId(null)}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Confirm delivery button ───────────────────────────────────────────────────

function ConfirmDeliveryButton({ shipmentId }: { shipmentId: string }) {
    const update = useUpdateShipment();

    const handleConfirm = async () => {
        try {
            await update.mutateAsync({
                id: shipmentId,
                data: {
                    status:         'delivered',
                    actual_arrival: new Date().toISOString(),
                },
            });
            toast.success('Recebimento confirmado!');
        } catch {
            toast.error('Erro ao confirmar recebimento.');
        }
    };

    return (
        <button
            onClick={handleConfirm}
            disabled={update.isPending}
            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
        >
            {update.isPending
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <CheckCircle2 className="w-3 h-3" />}
            Confirmar recebimento
        </button>
    );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
    project: Project | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ProjectDetailModal({ project, isOpen, onClose }: Props) {
    const { company } = useTenant();

    if (!isOpen || !project) return null;

    const bookings  = project.bookings ?? [];
    const derived   = deriveProjectStatus(bookings);
    const statusLabel = PROJECT_STATUS_LABEL[derived] ?? derived;
    const statusColor = PROJECT_STATUS_COLOR[derived] ?? PROJECT_STATUS_COLOR.draft;

    const total = bookings.reduce((s, b) => s + (b.total_amount ?? 0), 0);
    const days  = bookings[0]
        ? Math.max(1, differenceInDays(parseISO(bookings[0].end_date), parseISO(bookings[0].start_date)))
        : 0;

    const deliveredCount = bookings.filter(b =>
        (b.project_shipments ?? []).some(s => s.status === 'delivered'),
    ).length;
    const progressPct = bookings.length > 0
        ? Math.round((deliveredCount / bookings.length) * 100)
        : 0;

    // Group bookings by company
    const grouped = bookings.reduce<Record<string, ProjectBooking[]>>((acc, b) => {
        const cid = b.company_id ?? 'unknown';
        if (!acc[cid]) acc[cid] = [];
        acc[cid].push(b);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center sm:p-6">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="relative z-10 w-full sm:max-w-2xl max-h-[92vh] flex flex-col
                           bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl
                           shadow-[0_-20px_60px_rgba(0,0,0,0.7)] overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Clapperboard className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500">
                                Projeto
                            </p>
                            <h2 className="text-sm font-black uppercase tracking-wider text-white leading-none mt-0.5">
                                {project.name}
                            </h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge className={`text-[9px] font-black uppercase tracking-widest border ${statusColor}`}>
                            {statusLabel}
                        </Badge>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

                    {/* Summary row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-900/40 rounded-2xl p-4 border border-zinc-800/50">
                            <CalendarDays className="w-4 h-4 text-primary mb-2" />
                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Período</p>
                            {bookings[0] && (
                                <p className="text-xs font-black text-white mt-1">
                                    {format(parseISO(bookings[0].start_date), "d MMM", { locale: ptBR })}
                                    {' → '}
                                    {format(parseISO(bookings[0].end_date), "d MMM", { locale: ptBR })}
                                </p>
                            )}
                            <p className="text-[10px] text-zinc-500 mt-0.5">{days} {days === 1 ? 'diária' : 'diárias'}</p>
                        </div>

                        <div className="bg-zinc-900/40 rounded-2xl p-4 border border-zinc-800/50">
                            <Package className="w-4 h-4 text-primary mb-2" />
                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Itens</p>
                            <p className="text-lg font-black text-white mt-1">{bookings.length}</p>
                            <p className="text-[10px] text-zinc-500">{deliveredCount} entregues</p>
                        </div>

                        <div className="bg-zinc-900/40 rounded-2xl p-4 border border-zinc-800/50">
                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-2">Total</p>
                            <p className="text-sm font-black text-white tabular-nums">{brl(total)}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{brl(total / Math.max(1, days))}/dia</p>
                        </div>
                    </div>

                    {/* Progress bar (only when relevant) */}
                    {bookings.length > 0 && progressPct > 0 && (
                        <div>
                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                                <span>Progresso de entrega</span>
                                <span>{deliveredCount}/{bookings.length} itens</span>
                            </div>
                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPct}%` }}
                                    transition={{ delay: 0.1, duration: 0.7, ease: 'easeOut' }}
                                    className="h-full bg-primary rounded-full"
                                />
                            </div>
                        </div>
                    )}

                    {/* Grouped by company */}
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-3">
                            Equipamentos por locadora
                        </p>
                        <div className="space-y-3">
                            {Object.entries(grouped).map(([companyId, items]) => {
                                const companyInfo = items[0]?.company as any;
                                const isOwner = company?.id === companyId;
                                return (
                                    <CompanyGroup
                                        key={companyId}
                                        companyName={companyInfo?.name ?? 'Locadora'}
                                        companyCity={companyInfo?.address_city && companyInfo?.address_state
                                            ? `${companyInfo.address_city} - ${companyInfo.address_state}`
                                            : companyInfo?.address_city}
                                        logoUrl={companyInfo?.logo_url}
                                        bookings={items}
                                        isOwner={isOwner}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* Delivery info */}
                    {project.delivery_method === 'delivery' && project.delivery_address && (
                        <div className="bg-zinc-900/40 rounded-2xl p-4 border border-zinc-800/50">
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2">
                                Endereço de entrega
                            </p>
                            <p className="text-xs text-white flex items-start gap-2">
                                <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                {project.delivery_address}
                            </p>
                            {project.delivery_contact && (
                                <p className="text-[10px] text-zinc-500 mt-1.5">
                                    Responsável: {project.delivery_contact}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
