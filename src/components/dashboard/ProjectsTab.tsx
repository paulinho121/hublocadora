import { useState } from 'react';
import {
    Clapperboard, CalendarDays, Package, Loader2, FolderOpen,
    ChevronRight, MapPin, CheckCircle2, Clock, Truck, AlertCircle,
    ArrowRight, Building2, RotateCcw,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    useProjects,
    PROJECT_STATUS_LABEL, PROJECT_STATUS_COLOR,
    SHIPMENT_STATUS_LABEL, SHIPMENT_STATUS_COLOR,
    deriveProjectStatus,
} from '@/hooks/useProjects';
import { Project, ProjectBooking } from '@/types/database';
import { ProjectDetailModal } from './ProjectDetailModal';

// ─── helpers ──────────────────────────────────────────────────────────────────

const brl = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function ShipmentStatusDot({ status }: { status: string }) {
    const color = SHIPMENT_STATUS_COLOR[status] ?? 'text-zinc-500';
    if (status === 'in_transit' || status === 'out_for_delivery')
        return <Truck className={`w-3 h-3 ${color}`} />;
    if (status === 'delivered')
        return <CheckCircle2 className={`w-3 h-3 ${color}`} />;
    if (status === 'failed')
        return <AlertCircle className={`w-3 h-3 ${color}`} />;
    return <Clock className={`w-3 h-3 ${color}`} />;
}

// ─── Single project card ──────────────────────────────────────────────────────

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
    const bookings = project.bookings ?? [];
    const derived  = deriveProjectStatus(bookings);
    const statusLabel = PROJECT_STATUS_LABEL[derived] ?? derived;
    const statusColor = PROJECT_STATUS_COLOR[derived] ?? PROJECT_STATUS_COLOR.draft;

    const total = bookings.reduce((s, b) => s + (b.total_amount ?? 0), 0);
    const days  = bookings[0]
        ? Math.max(1, differenceInDays(parseISO(bookings[0].end_date), parseISO(bookings[0].start_date)))
        : 0;

    const isReturning = derived === 'returning' || derived === 'completed';

    const deliveredCount = bookings.filter(b =>
        (b.project_shipments ?? []).some(s => s.direction === 'outbound' && s.status === 'delivered'),
    ).length;

    const returnedCount = bookings.filter(b =>
        (b.project_shipments ?? []).some(s => s.direction === 'return' && s.status === 'delivered'),
    ).length;

    const progressCurrent = isReturning ? returnedCount : deliveredCount;
    const progressPct = bookings.length > 0
        ? Math.round((progressCurrent / bookings.length) * 100)
        : 0;
    const progressColor = isReturning ? 'bg-red-500' : 'bg-primary';
    const progressLabel = isReturning ? 'Devolvidos' : 'Entregues';
    const progressCount = isReturning ? returnedCount : deliveredCount;

    // Group by company for the mini-thumbnail row
    const companies = Array.from(
        new Map(bookings.map(b => [b.company?.id, b.company])).values(),
    ).filter(Boolean);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={onClick}
            className="group relative bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 cursor-pointer
                       hover:border-primary/30 hover:bg-zinc-900/60 transition-all duration-300"
        >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Clapperboard className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-black uppercase tracking-wider text-white truncate">
                            {project.name}
                        </h3>
                        <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
                            {bookings.length > 0 && (
                                <>
                                    {format(parseISO(bookings[0].start_date), "d MMM", { locale: ptBR })}
                                    {' → '}
                                    {format(parseISO(bookings[0].end_date), "d MMM", { locale: ptBR })}
                                    {' · '}
                                    {days} {days === 1 ? 'diária' : 'diárias'}
                                </>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-[9px] font-black uppercase tracking-widest border ${statusColor}`}>
                        {statusLabel}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-primary transition-colors" />
                </div>
            </div>

            {/* Progress bar */}
            {bookings.length > 0 && derived !== 'pending' && derived !== 'approved' && (
                <div className="mb-4">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                        <span className={isReturning ? 'text-red-400/70' : ''}>
                            {isReturning && <RotateCcw className="w-2.5 h-2.5 inline mr-1" />}
                            {progressLabel}
                        </span>
                        <span>{progressCount}/{bookings.length}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            key={progressLabel}
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
                            className={`h-full rounded-full ${progressColor}`}
                        />
                    </div>
                </div>
            )}

            {/* Item thumbnails + shipment dots */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                {bookings.slice(0, 6).map((b) => {
                    const img = (b.equipment as any)?.images?.[0];
                    // Show return shipment status when in returning phase, else outbound
                    const returnSh  = (b.project_shipments ?? []).find(s => s.direction === 'return');
                    const outboundSh = (b.project_shipments ?? []).find(s => s.direction === 'outbound');
                    const shipStatus = isReturning && returnSh
                        ? returnSh.status
                        : (outboundSh?.status ?? 'awaiting_approval');
                    return (
                        <div key={b.id} className="relative">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800/60 overflow-hidden border border-zinc-700/40 flex items-center justify-center">
                                {img
                                    ? <img src={img} alt="" className="w-full h-full object-contain p-1" />
                                    : <Package className="w-4 h-4 text-zinc-600" />}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-zinc-950 flex items-center justify-center">
                                <ShipmentStatusDot status={shipStatus} />
                            </div>
                        </div>
                    );
                })}
                {bookings.length > 6 && (
                    <div className="w-10 h-10 rounded-xl bg-zinc-800/40 border border-zinc-700/30 flex items-center justify-center">
                        <span className="text-[9px] font-black text-zinc-500">+{bookings.length - 6}</span>
                    </div>
                )}
            </div>

            {/* Footer row */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                {/* Companies */}
                <div className="flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-zinc-600" />
                    <span className="text-[10px] text-zinc-500 font-semibold">
                        {companies.length} {companies.length === 1 ? 'locadora' : 'locadoras'}
                    </span>
                </div>
                {/* Total */}
                <span className="text-sm font-black text-white tabular-nums">{brl(total)}</span>
            </div>
        </motion.div>
    );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function ProjectsTab() {
    const { data: projects, isLoading } = useProjects();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const selected = projects?.find(p => p.id === selectedId) ?? null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <header className="mb-10">
                <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">Projetos</h2>
                <p className="text-zinc-500 font-medium">
                    Locações em conjunto — acompanhe todos os equipamentos em um lugar.
                </p>
            </header>

            {/* Empty state */}
            {(!projects || projects.length === 0) && (
                <div className="flex flex-col items-center justify-center py-24 border border-dashed border-zinc-800 rounded-3xl text-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center">
                        <FolderOpen className="w-8 h-8 text-zinc-700" />
                    </div>
                    <div>
                        <p className="text-sm font-black uppercase tracking-widest text-zinc-500">
                            Nenhum projeto ainda
                        </p>
                        <p className="text-xs text-zinc-600 mt-1.5 max-w-xs mx-auto">
                            Vá ao marketplace, adicione itens com{' '}
                            <span className="text-primary font-black">+ Projeto</span>{' '}
                            e confirme a locação em conjunto.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        className="border-zinc-700 text-zinc-300 font-black uppercase text-[10px] tracking-widest rounded-xl"
                        onClick={() => window.location.href = '/'}
                    >
                        Ir ao Marketplace <ArrowRight className="w-3.5 h-3.5 ml-2" />
                    </Button>
                </div>
            )}

            {/* Project cards grid */}
            {projects && projects.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {projects.map(p => (
                        <ProjectCard
                            key={p.id}
                            project={p}
                            onClick={() => setSelectedId(p.id)}
                        />
                    ))}
                </div>
            )}

            {/* Detail modal */}
            <ProjectDetailModal
                project={selected}
                isOpen={!!selected}
                onClose={() => setSelectedId(null)}
            />
        </>
    );
}
