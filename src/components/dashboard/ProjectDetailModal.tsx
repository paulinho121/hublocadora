import { useState } from 'react';
import {
    X, Package, Truck, CheckCircle2, Clock, AlertCircle,
    Building2, CalendarDays, MapPin, ExternalLink, Loader2,
    Clapperboard, ChevronDown, ChevronUp, Edit3, Check,
    RotateCcw, PackageCheck, ArrowUpFromLine,
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
    useInitiateReturn,
    useConfirmReturn,
    PROJECT_STATUS_LABEL, PROJECT_STATUS_COLOR,
    SHIPMENT_STATUS_LABEL, RETURN_SHIPMENT_STATUS_LABEL, SHIPMENT_STATUS_COLOR,
    deriveProjectStatus,
} from '@/hooks/useProjects';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';

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

// ─── Inline tracking form (for rental house owners — outbound) ─────────────────
// 🟢 LOCADORA action — verde

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
        <div className="mt-3 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Truck className="w-3 h-3" />
                Rastreio de envio — Locadora
            </p>
            <div className="grid grid-cols-2 gap-2">
                <input
                    value={carrier}
                    onChange={e => setCarrier(e.target.value)}
                    placeholder="Transportadora (ex: Correios)"
                    className="col-span-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
                <input
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="Código de rastreio"
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
                <input
                    type="date"
                    value={estimated}
                    onChange={e => setEstimated(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                    title="Previsão de entrega"
                />
            </div>
            <Button
                className="w-full h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[11px]"
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

// ─── Return tracking form (for renter — adds return carrier + code) ────────────
// 🔴 LOCATÁRIO action — vermelho

function ReturnTrackingForm({
    shipment,
    onSaved,
}: {
    shipment: ProjectShipment;
    onSaved: () => void;
}) {
    const update = useUpdateShipment();
    const [carrier, setCarrier]     = useState(shipment.carrier ?? '');
    const [code, setCode]           = useState(shipment.tracking_code ?? '');
    const [pickupDate, setPickupDate] = useState(
        shipment.committed_ship_by ? shipment.committed_ship_by.slice(0, 10) : '',
    );

    const handleSave = async () => {
        if (!carrier.trim() || !code.trim()) {
            toast.error('Preencha transportadora e código de rastreio de retorno.');
            return;
        }
        try {
            await update.mutateAsync({
                id: shipment.id,
                data: {
                    carrier:           carrier.trim(),
                    tracking_code:     code.trim(),
                    estimated_arrival: pickupDate || null,
                    status:            'in_transit',
                },
            });
            toast.success('Rastreio de devolução adicionado!');
            onSaved();
        } catch {
            toast.error('Erro ao salvar rastreio.');
        }
    };

    return (
        <div className="mt-3 p-3 bg-red-500/5 rounded-xl border border-red-500/20 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <ArrowUpFromLine className="w-3 h-3" />
                Rastreio do retorno — Locatário
            </p>
            <div className="grid grid-cols-2 gap-2">
                <input
                    value={carrier}
                    onChange={e => setCarrier(e.target.value)}
                    placeholder="Transportadora (ex: Correios)"
                    className="col-span-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500/50"
                />
                <input
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="Código de rastreio"
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500/50"
                />
                <input
                    type="date"
                    value={pickupDate}
                    onChange={e => setPickupDate(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                    title="Data prevista de chegada na locadora"
                />
            </div>
            <Button
                className="w-full h-8 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-[11px]"
                onClick={handleSave}
                disabled={update.isPending}
            >
                {update.isPending
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <><Check className="w-3 h-3 mr-1.5" /> Confirmar envio</>}
            </Button>
        </div>
    );
}

// ─── Company group (outbound) ──────────────────────────────────────────────────

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
    const [expanded, setExpanded]             = useState(true);
    const [showTrackingId, setShowTrackingId] = useState<string | null>(null);

    const shipStatuses = bookings.flatMap(b => b.project_shipments ?? [])
        .filter(s => s.direction === 'outbound').map(s => s.status);
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
                            <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-2.5 h-2.5" />{companyCity}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {groupDelivered && (
                        <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Entregue
                        </span>
                    )}
                    {groupInTransit && !groupDelivered && (
                        <span className="text-[11px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1">
                            <Truck className="w-3 h-3" /> Em trânsito
                        </span>
                    )}
                    {expanded
                        ? <ChevronUp   className="w-4 h-4 text-zinc-400" />
                        : <ChevronDown className="w-4 h-4 text-zinc-400" />}
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
                                const shipment = (booking.project_shipments ?? []).find(s => s.direction === 'outbound');
                                const shipSt   = shipment?.status ?? 'awaiting_approval';
                                const isShowingTracking = showTrackingId === booking.id;

                                return (
                                    <div key={booking.id} className="p-4">
                                        <div className="flex gap-3">
                                            {/* Thumbnail */}
                                            <div className="w-14 h-14 rounded-xl bg-zinc-800/60 overflow-hidden shrink-0 flex items-center justify-center">
                                                {eq?.images?.[0]
                                                    ? <img src={eq.images[0]} alt="" className="w-full h-full object-contain p-1" />
                                                    : <Package className="w-5 h-5 text-zinc-400" />}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-[11px] font-black uppercase tracking-wider text-white line-clamp-2">
                                                        {eq?.name ?? 'Equipamento'}
                                                    </p>
                                                    <Badge className={`text-[11px] font-black uppercase tracking-widest border shrink-0 ${BOOKING_STATUS_COLOR[booking.status] ?? ''}`}>
                                                        {BOOKING_STATUS_LABEL[booking.status] ?? booking.status}
                                                    </Badge>
                                                </div>

                                                <p className="text-[11px] text-zinc-500 mt-1">
                                                    {booking.quantity}× · {brl(booking.total_amount)}
                                                </p>

                                                {/* Outbound shipment status */}
                                                {shipment && (
                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                        {shipmentIcon(shipSt, 'w-3 h-3')}
                                                        <span className={`text-[11px] font-black uppercase tracking-widest ${SHIPMENT_STATUS_COLOR[shipSt]}`}>
                                                            {SHIPMENT_STATUS_LABEL[shipSt]}
                                                        </span>
                                                        {shipment.tracking_code && (
                                                            <span className="text-[11px] text-zinc-400 font-mono">
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
                                                    <p className="text-[11px] text-zinc-400 mt-0.5">
                                                        Previsão:{' '}
                                                        {format(parseISO(shipment.estimated_arrival), "d 'de' MMM", { locale: ptBR })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex gap-2 mt-3">
                                            {/* 🟢 Locadora: add/edit tracking */}
                                            {isOwner && booking.status === 'approved' && shipment && shipSt !== 'delivered' && (
                                                <button
                                                    onClick={() => setShowTrackingId(isShowingTracking ? null : booking.id)}
                                                    className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors"
                                                >
                                                    <Edit3 className="w-3 h-3" />
                                                    {shipment.tracking_code ? 'Editar rastreio' : 'Adicionar rastreio'}
                                                </button>
                                            )}

                                            {/* 🔴 Locatário: confirm delivery */}
                                            {!isOwner && shipSt === 'in_transit' && shipment && (
                                                <ConfirmDeliveryButton shipmentId={shipment.id} />
                                            )}
                                        </div>

                                        {/* Outbound tracking form inline */}
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

// ─── Return company group ──────────────────────────────────────────────────────

function ReturnCompanyGroup({
    companyName,
    companyCity,
    logoUrl,
    bookings,
    isOwner,
    isRenter,
}: {
    companyName: string;
    companyCity?: string;
    logoUrl?: string | null;
    bookings: ProjectBooking[];
    isOwner: boolean;
    isRenter: boolean;
}) {
    const [expanded, setExpanded]                 = useState(true);
    const [showReturnTrackingId, setShowReturnTrackingId] = useState<string | null>(null);

    const returnShipments = bookings.flatMap(b => b.project_shipments ?? [])
        .filter(s => s.direction === 'return');
    const allReturned = returnShipments.length > 0 && returnShipments.every(s => s.status === 'delivered');
    const anyInTransit = returnShipments.some(s => s.status === 'in_transit' || s.status === 'picked_up');

    return (
        <div className="border border-red-500/20 rounded-2xl overflow-hidden">
            {/* Company header */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between p-4 bg-red-500/5 hover:bg-red-500/10 transition-colors"
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
                            <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-2.5 h-2.5" />{companyCity}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {allReturned && (
                        <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                            <PackageCheck className="w-3 h-3" /> Recebido
                        </span>
                    )}
                    {anyInTransit && !allReturned && (
                        <span className="text-[11px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1">
                            <Truck className="w-3 h-3" /> Retornando
                        </span>
                    )}
                    {expanded
                        ? <ChevronUp   className="w-4 h-4 text-zinc-400" />
                        : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                </div>
            </button>

            {/* Return items */}
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="divide-y divide-orange-500/10">
                            {bookings.map(booking => {
                                const eq            = booking.equipment as any;
                                const retShipment   = (booking.project_shipments ?? []).find(s => s.direction === 'return');
                                const retStatus     = retShipment?.status ?? 'awaiting_approval';
                                const isShowingForm = showReturnTrackingId === booking.id;
                                const statusLabel   = RETURN_SHIPMENT_STATUS_LABEL[retStatus] ?? retStatus;
                                const statusCol     = SHIPMENT_STATUS_COLOR[retStatus] ?? 'text-zinc-400';

                                return (
                                    <div key={booking.id} className="p-4">
                                        <div className="flex gap-3">
                                            {/* Thumbnail */}
                                            <div className="w-14 h-14 rounded-xl bg-zinc-800/60 overflow-hidden shrink-0 flex items-center justify-center">
                                                {eq?.images?.[0]
                                                    ? <img src={eq.images[0]} alt="" className="w-full h-full object-contain p-1" />
                                                    : <Package className="w-5 h-5 text-zinc-400" />}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black uppercase tracking-wider text-white line-clamp-2">
                                                    {eq?.name ?? 'Equipamento'}
                                                </p>
                                                <p className="text-[11px] text-zinc-500 mt-1">
                                                    {booking.quantity}× · {brl(booking.total_amount)}
                                                </p>

                                                {/* Return shipment status */}
                                                {retShipment && (
                                                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                        {shipmentIcon(retStatus, 'w-3 h-3')}
                                                        <span className={`text-[11px] font-black uppercase tracking-widest ${statusCol}`}>
                                                            {statusLabel}
                                                        </span>
                                                        {retShipment.tracking_code && (
                                                            <span className="text-[11px] text-zinc-400 font-mono">
                                                                · {retShipment.tracking_code}
                                                            </span>
                                                        )}
                                                        {retShipment.tracking_url && (
                                                            <a
                                                                href={retShipment.tracking_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={e => e.stopPropagation()}
                                                                className="text-orange-400 hover:underline"
                                                            >
                                                                <ExternalLink className="w-2.5 h-2.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                )}

                                                {retShipment?.estimated_arrival && (
                                                    <p className="text-[11px] text-zinc-400 mt-0.5">
                                                        Previsão chegada:{' '}
                                                        {format(parseISO(retShipment.estimated_arrival), "d 'de' MMM", { locale: ptBR })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex gap-2 mt-3">
                                            {/* 🔴 Locatário: add return tracking when status is awaiting */}
                                            {isRenter && retShipment && retStatus === 'awaiting_approval' && (
                                                <button
                                                    onClick={() => setShowReturnTrackingId(isShowingForm ? null : booking.id)}
                                                    className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
                                                >
                                                    <ArrowUpFromLine className="w-3 h-3" />
                                                    {retShipment.tracking_code ? 'Editar rastreio de retorno' : 'Informar envio'}
                                                </button>
                                            )}

                                            {/* Rental house: confirm physical receipt */}
                                            {isOwner && retShipment && retStatus === 'in_transit' && (
                                                <ConfirmReturnButton
                                                    shipmentId={retShipment.id}
                                                    bookingId={booking.id}
                                                />
                                            )}

                                            {/* Completed indicator */}
                                            {retStatus === 'delivered' && (
                                                <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-400">
                                                    <PackageCheck className="w-3 h-3" />
                                                    Recebido pela locadora
                                                </span>
                                            )}
                                        </div>

                                        {/* Return tracking form inline */}
                                        {isShowingForm && retShipment && (
                                            <ReturnTrackingForm
                                                shipment={retShipment}
                                                onSaved={() => setShowReturnTrackingId(null)}
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

// ─── Confirm delivery button (outbound — renter confirms they received it) ─────
// 🔴 LOCATÁRIO action — vermelho

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
            className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
        >
            {update.isPending
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <CheckCircle2 className="w-3 h-3" />}
            Confirmar recebimento
        </button>
    );
}

// ─── Confirm return receipt button (rental house confirms item came back) ──────
// 🟢 LOCADORA action — verde

function ConfirmReturnButton({
    shipmentId,
    bookingId,
}: {
    shipmentId: string;
    bookingId:  string;
}) {
    const confirmReturn = useConfirmReturn();

    const handleConfirm = async () => {
        try {
            await confirmReturn.mutateAsync({ shipmentId, bookingId });
            toast.success('Devolução confirmada! Locação concluída.');
        } catch {
            toast.error('Erro ao confirmar devolução.');
        }
    };

    return (
        <button
            onClick={handleConfirm}
            disabled={confirmReturn.isPending}
            className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
        >
            {confirmReturn.isPending
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <PackageCheck className="w-3 h-3" />}
            Confirmar recebimento do retorno
        </button>
    );
}

// ─── Reverse logistics section ─────────────────────────────────────────────────

function ReturnSection({
    project,
    bookings,
    currentCompanyId,
    isRenter,
}: {
    project:          Project;
    bookings:         ProjectBooking[];
    currentCompanyId: string | undefined;
    isRenter:         boolean;
}) {
    const initiateReturn = useInitiateReturn();

    const allShipments      = bookings.flatMap(b => b.project_shipments ?? []);
    const outboundShipments = allShipments.filter(s => s.direction === 'outbound');
    const returnShipments   = allShipments.filter(s => s.direction === 'return');

    const canInitiateReturn =
        outboundShipments.length > 0 &&
        outboundShipments.every(s => s.status === 'delivered') &&
        returnShipments.length === 0;

    const hasReturns           = returnShipments.length > 0;
    const allReturnsCompleted  = hasReturns && returnShipments.every(s => s.status === 'delivered');

    // Only show section when there's something to display
    if (!canInitiateReturn && !hasReturns) return null;

    // Bookings that have a delivered outbound shipment (eligible for return)
    const deliveredBookings = bookings.filter(b =>
        (b.project_shipments ?? []).some(s => s.direction === 'outbound' && s.status === 'delivered'),
    );

    // Group those bookings by company for the return UI
    const returnGrouped = deliveredBookings.reduce<Record<string, ProjectBooking[]>>((acc, b) => {
        const cid = b.company_id ?? 'unknown';
        if (!acc[cid]) acc[cid] = [];
        acc[cid].push(b);
        return acc;
    }, {});

    const handleInitiateReturn = async () => {
        try {
            await initiateReturn.mutateAsync({
                projectId: project.id,
                items: deliveredBookings.map(b => ({
                    bookingId: b.id,
                    companyId: b.company_id!,
                })),
            });
            toast.success('Devolução iniciada! Adicione o código de rastreio para cada locadora.');
        } catch {
            toast.error('Erro ao iniciar devolução.');
        }
    };

    return (
        <div className="space-y-4">
            {/* Divider with label */}
            <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-zinc-800" />
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-red-400">
                    <RotateCcw className="w-3 h-3" />
                    Logística Reversa
                </div>
                <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* 🔴 Initiate return CTA — only visible to the renter (locatário) */}
            {canInitiateReturn && isRenter && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 text-center"
                >
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <RotateCcw className="w-6 h-6 text-red-400" />
                    </div>
                    <p className="text-sm font-black uppercase tracking-wider text-white mb-1">
                        Todos os itens foram entregues!
                    </p>
                    <p className="text-[11px] text-zinc-500 mb-5 leading-relaxed">
                        Quando estiver pronto, inicie a devolução dos equipamentos
                        às locadoras e informe o código de rastreio de cada envio.
                    </p>
                    <Button
                        onClick={handleInitiateReturn}
                        disabled={initiateReturn.isPending}
                        className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-[11px] h-10 px-8 rounded-xl shadow-lg shadow-red-500/20"
                    >
                        {initiateReturn.isPending
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <><RotateCcw className="w-3.5 h-3.5 mr-2" /> Iniciar Devolução</>}
                    </Button>
                </motion.div>
            )}

            {/* 🟢 Rental house view — waiting for renter to send */}
            {canInitiateReturn && !isRenter && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
                            Aguardando devolução pelo locatário
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                            Todos os itens foram entregues. O locatário ainda não iniciou a devolução.
                        </p>
                    </div>
                </div>
            )}

            {/* All returns completed banner */}
            {allReturnsCompleted && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <PackageCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
                            Todos os itens devolvidos com sucesso
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                            Projeto concluído. As locações foram finalizadas.
                        </p>
                    </div>
                </div>
            )}

            {/* Return groups by company */}
            {hasReturns && (
                <div className="space-y-3">
                    {Object.entries(returnGrouped).map(([companyId, items]) => {
                        const companyInfo = items[0]?.company as any;
                        const isOwner     = currentCompanyId === companyId;
                        return (
                            <ReturnCompanyGroup
                                key={companyId}
                                companyName={companyInfo?.name ?? 'Locadora'}
                                companyCity={companyInfo?.address_city && companyInfo?.address_state
                                    ? `${companyInfo.address_city} - ${companyInfo.address_state}`
                                    : companyInfo?.address_city}
                                logoUrl={companyInfo?.logo_url}
                                bookings={items}
                                isOwner={isOwner}
                                isRenter={isRenter}
                            />
                        );
                    })}
                </div>
            )}
        </div>
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
    const { user }    = useAuth();

    if (!isOpen || !project) return null;

    const bookings  = project.bookings ?? [];
    const derived   = deriveProjectStatus(bookings);
    const statusLabel = PROJECT_STATUS_LABEL[derived] ?? derived;
    const statusColor = PROJECT_STATUS_COLOR[derived] ?? PROJECT_STATUS_COLOR.draft;

    const total = bookings.reduce((s, b) => s + (b.total_amount ?? 0), 0);
    const days  = bookings[0]
        ? Math.max(1, differenceInDays(parseISO(bookings[0].end_date), parseISO(bookings[0].start_date)))
        : 0;

    // Outbound delivery progress
    const deliveredCount = bookings.filter(b =>
        (b.project_shipments ?? []).some(s => s.direction === 'outbound' && s.status === 'delivered'),
    ).length;

    // Return progress
    const returnedCount = bookings.filter(b =>
        (b.project_shipments ?? []).some(s => s.direction === 'return' && s.status === 'delivered'),
    ).length;

    const isReturning  = derived === 'returning' || derived === 'completed';
    const progressCurrent = isReturning ? returnedCount : deliveredCount;
    const progressPct  = bookings.length > 0
        ? Math.round((progressCurrent / bookings.length) * 100)
        : 0;
    const progressColor = isReturning ? 'bg-orange-500' : 'bg-primary';
    const progressLabel = isReturning ? 'Progresso de devolução' : 'Progresso de entrega';

    // Is the current user the project creator (renter)?
    const isRenter = user?.id === project.renter_id;

    // Group bookings by company (for outbound section)
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
                            <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                                Projeto
                            </p>
                            <h2 className="text-sm font-black uppercase tracking-wider text-white leading-none mt-0.5">
                                {project.name}
                            </h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge className={`text-[11px] font-black uppercase tracking-widest border ${statusColor}`}>
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

                    {/* Summary row — empilha no celular, onde 3 colunas não cabem a data */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-zinc-900/40 rounded-2xl p-4 border border-zinc-800/50">
                            <CalendarDays className="w-4 h-4 text-primary mb-2" />
                            <p className="text-[11px] text-zinc-500 font-black uppercase tracking-widest">Período</p>
                            {bookings[0] && (
                                <p className="text-xs font-black text-white mt-1">
                                    {format(parseISO(bookings[0].start_date), "d MMM", { locale: ptBR })}
                                    {' → '}
                                    {format(parseISO(bookings[0].end_date), "d MMM", { locale: ptBR })}
                                </p>
                            )}
                            <p className="text-[11px] text-zinc-500 mt-0.5">{days} {days === 1 ? 'diária' : 'diárias'}</p>
                        </div>

                        <div className="bg-zinc-900/40 rounded-2xl p-4 border border-zinc-800/50">
                            <Package className="w-4 h-4 text-primary mb-2" />
                            <p className="text-[11px] text-zinc-500 font-black uppercase tracking-widest">Itens</p>
                            <p className="text-lg font-black text-white mt-1">{bookings.length}</p>
                            <p className="text-[11px] text-zinc-500">
                                {isReturning
                                    ? `${returnedCount} devolvidos`
                                    : `${deliveredCount} entregues`}
                            </p>
                        </div>

                        <div className="bg-zinc-900/40 rounded-2xl p-4 border border-zinc-800/50">
                            <p className="text-[11px] text-zinc-500 font-black uppercase tracking-widest mb-2">Total</p>
                            <p className="text-sm font-black text-white tabular-nums">{brl(total)}</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5">{brl(total / Math.max(1, days))}/dia</p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    {bookings.length > 0 && progressPct > 0 && (
                        <div>
                            <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                                <span>{progressLabel}</span>
                                <span>{progressCurrent}/{bookings.length} itens</span>
                            </div>
                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPct}%` }}
                                    transition={{ delay: 0.1, duration: 0.7, ease: 'easeOut' }}
                                    className={`h-full rounded-full ${progressColor}`}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── Outbound: Grouped by company ─────────────────────────── */}
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-3">
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

                    {/* ── Reverse logistics section ─────────────────────────────── */}
                    <ReturnSection
                        project={project}
                        bookings={bookings}
                        currentCompanyId={company?.id}
                        isRenter={isRenter}
                    />

                    {/* Delivery address */}
                    {project.delivery_method === 'delivery' && project.delivery_address && (
                        <div className="bg-zinc-900/40 rounded-2xl p-4 border border-zinc-800/50">
                            <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-2">
                                Endereço de entrega
                            </p>
                            <p className="text-xs text-white flex items-start gap-2">
                                <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                {project.delivery_address}
                            </p>
                            {project.delivery_contact && (
                                <p className="text-[11px] text-zinc-500 mt-1.5">
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
