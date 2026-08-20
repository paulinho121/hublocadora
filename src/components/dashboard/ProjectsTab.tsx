import { useState, useMemo } from 'react';
import {
    Clapperboard, Package, Loader2, FolderOpen,
    ChevronRight, CheckCircle2, Clock, Truck, AlertCircle,
    ArrowRight, Building2, RotateCcw, TrendingUp,
    CalendarDays, Layers, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    useProjects,
    PROJECT_STATUS_LABEL, PROJECT_STATUS_COLOR,
    SHIPMENT_STATUS_COLOR,
    deriveProjectStatus,
} from '@/hooks/useProjects';
import { Project } from '@/types/database';
import { ProjectDetailModal } from './ProjectDetailModal';

// ─── helpers ──────────────────────────────────────────────────────────────────

const brl = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

type FilterStatus = 'all' | 'pending' | 'approved' | 'shipping' | 'active' | 'completed' | 'cancelled';

const FILTER_LABELS: Record<FilterStatus, string> = {
    all:       'Todos',
    pending:   'Pendente',
    approved:  'Aprovado',
    shipping:  'Em trânsito',
    active:    'Em uso',
    completed: 'Concluído',
    cancelled: 'Cancelado',
};

// ─── Shipment status icon ─────────────────────────────────────────────────────

function ShipmentDot({ status }: { status: string }) {
    const col = SHIPMENT_STATUS_COLOR[status] ?? 'text-zinc-500';
    if (status === 'in_transit' || status === 'out_for_delivery' || status === 'picked_up')
        return <Truck className={`w-2.5 h-2.5 ${col}`} />;
    if (status === 'delivered')
        return <CheckCircle2 className={`w-2.5 h-2.5 ${col}`} />;
    if (status === 'failed')
        return <AlertCircle className={`w-2.5 h-2.5 ${col}`} />;
    return <Clock className={`w-2.5 h-2.5 ${col}`} />;
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
    const bookings  = project.bookings ?? [];
    const derived   = deriveProjectStatus(bookings);
    const statusLabel = PROJECT_STATUS_LABEL[derived] ?? derived;
    const statusColor = PROJECT_STATUS_COLOR[derived] ?? PROJECT_STATUS_COLOR.draft;

    const total     = bookings.reduce((s, b) => s + (b.total_amount ?? 0), 0);
    const startDate = bookings[0]?.start_date;
    const endDate   = bookings[0]?.end_date;
    const days      = startDate && endDate
        ? Math.max(1, differenceInDays(parseISO(endDate), parseISO(startDate)))
        : 0;

    const isReturning  = derived === 'returning';
    const isCompleted  = derived === 'completed';

    const deliveredCount = bookings.filter(b =>
        (b.project_shipments ?? []).some(s => s.direction === 'outbound' && s.status === 'delivered'),
    ).length;
    const returnedCount = bookings.filter(b =>
        (b.project_shipments ?? []).some(s => s.direction === 'return' && s.status === 'delivered'),
    ).length;

    const progressCount   = isReturning || isCompleted ? returnedCount : deliveredCount;
    const progressTotal   = bookings.length;
    const progressPct     = progressTotal > 0 ? Math.round((progressCount / progressTotal) * 100) : 0;
    const showProgress    = !['pending', 'approved', 'draft'].includes(derived) && progressTotal > 0;
    const progressColor   = isReturning || isCompleted ? 'bg-rose-500' : 'bg-primary';
    const progressLabel   = isReturning || isCompleted ? 'Devolvidos' : 'Entregues';

    const companies = Array.from(
        new Map(bookings.map(b => [b.company?.id, b.company])).values(),
    ).filter(Boolean);

    const createdAt = project.created_at
        ? format(parseISO(project.created_at), "d MMM yyyy", { locale: ptBR })
        : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={onClick}
            className="group relative flex flex-col bg-zinc-900/50 border border-zinc-800/70
                       rounded-2xl overflow-hidden cursor-pointer
                       hover:border-primary/30 hover:bg-zinc-900/80
                       hover:shadow-xl hover:shadow-black/40
                       transition-colors duration-300"
        >
            {/* ── Top accent line (status color) ── */}
            <div className={`h-0.5 w-full ${
                derived === 'active'    ? 'bg-primary' :
                derived === 'approved'  ? 'bg-emerald-500' :
                derived === 'shipping'  ? 'bg-blue-500' :
                derived === 'returning' ? 'bg-orange-500' :
                derived === 'completed' ? 'bg-zinc-600' :
                derived === 'cancelled' ? 'bg-red-700' :
                'bg-amber-500'
            }`} />

            <div className="p-5 flex flex-col gap-4 flex-1">

                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20
                                        flex items-center justify-center shrink-0">
                            <Clapperboard className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[13px] font-black uppercase tracking-wider text-white
                                           truncate leading-tight group-hover:text-primary transition-colors">
                                {project.name}
                            </h3>
                            {startDate && endDate ? (
                                <p className="text-[10px] text-zinc-500 font-semibold mt-0.5 flex items-center gap-1">
                                    <CalendarDays className="w-2.5 h-2.5 shrink-0" />
                                    {format(parseISO(startDate), "d MMM", { locale: ptBR })}
                                    {' → '}
                                    {format(parseISO(endDate), "d MMM", { locale: ptBR })}
                                    {' · '}{days} {days === 1 ? 'diária' : 'diárias'}
                                </p>
                            ) : (
                                <p className="text-[10px] text-zinc-600 mt-0.5">Datas não definidas</p>
                            )}
                        </div>
                    </div>
                    <Badge className={`text-[8px] font-black uppercase tracking-widest border shrink-0 ${statusColor}`}>
                        {statusLabel}
                    </Badge>
                </div>

                {/* ── Progress bar ── */}
                {showProgress && (
                    <div>
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1.5">
                            <span className={`flex items-center gap-1 ${isReturning ? 'text-orange-400/80' : 'text-zinc-500'}`}>
                                {isReturning && <RotateCcw className="w-2.5 h-2.5" />}
                                {progressLabel}
                            </span>
                            <span className="text-zinc-500">{progressCount}/{progressTotal}</span>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPct}%` }}
                                transition={{ delay: 0.3, duration: 0.7, ease: 'easeOut' }}
                                className={`h-full rounded-full ${progressColor}`}
                            />
                        </div>
                    </div>
                )}

                {/* ── Equipment thumbnails ── */}
                {bookings.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {bookings.slice(0, 5).map((b) => {
                            const img = (b.equipment as any)?.images?.[0];
                            const returnSh   = (b.project_shipments ?? []).find(s => s.direction === 'return');
                            const outboundSh = (b.project_shipments ?? []).find(s => s.direction === 'outbound');
                            const shipStatus = (isReturning || isCompleted) && returnSh
                                ? returnSh.status
                                : (outboundSh?.status ?? 'awaiting_approval');
                            return (
                                <div key={b.id} className="relative">
                                    <div className="w-9 h-9 rounded-lg bg-zinc-800/70 border border-zinc-700/50
                                                    overflow-hidden flex items-center justify-center">
                                        {img
                                            ? <img src={img} alt="" loading="lazy" className="w-full h-full object-contain p-1" />
                                            : <Package className="w-3.5 h-3.5 text-zinc-600" />}
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full
                                                    bg-zinc-950 flex items-center justify-center">
                                        <ShipmentDot status={shipStatus} />
                                    </div>
                                </div>
                            );
                        })}
                        {bookings.length > 5 && (
                            <div className="w-9 h-9 rounded-lg bg-zinc-800/40 border border-zinc-700/30
                                            flex items-center justify-center">
                                <span className="text-[9px] font-black text-zinc-500">+{bookings.length - 5}</span>
                            </div>
                        )}
                        <div className="ml-auto flex items-center gap-1.5 shrink-0">
                            <Building2 className="w-3 h-3 text-zinc-600" />
                            <span className="text-[10px] text-zinc-500 font-semibold">
                                {companies.length} {companies.length === 1 ? 'locadora' : 'locadoras'}
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex-1" />

                {/* ── Footer ── */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] uppercase font-black tracking-[0.15em] text-zinc-600">
                            Total do projeto
                        </span>
                        <span className="text-base font-black text-white tabular-nums leading-none">
                            {brl(total)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest
                                    text-zinc-500 group-hover:text-primary transition-colors">
                        Ver detalhes
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, accent }: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ElementType;
    accent?: string;
}) {
    return (
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent ?? 'bg-zinc-800/60'}`}>
                <Icon className="w-4 h-4 text-white/70" />
            </div>
            <div className="min-w-0">
                <p className="text-[9px] uppercase font-black tracking-[0.2em] text-zinc-500 mb-0.5">{label}</p>
                <p className="text-lg font-black text-white leading-none tabular-nums">{value}</p>
                {sub && <p className="text-[9px] text-zinc-600 mt-0.5 truncate">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function ProjectsTab() {
    const { data: projects, isLoading, isError } = useProjects();
    const [selectedId, setSelectedId]             = useState<string | null>(null);
    const [filter, setFilter]                     = useState<FilterStatus>('all');

    const selected = projects?.find(p => p.id === selectedId) ?? null;

    // ── KPI computation ────────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        if (!projects) return null;
        const total     = projects.length;
        const active    = projects.filter(p => {
            const d = deriveProjectStatus(p.bookings ?? []);
            return ['active', 'shipping', 'approved'].includes(d);
        }).length;
        const pending   = projects.filter(p => deriveProjectStatus(p.bookings ?? []) === 'pending').length;
        const invested  = projects.reduce((sum, p) =>
            sum + (p.bookings ?? []).reduce((s, b) => s + (b.total_amount ?? 0), 0), 0);
        return { total, active, pending, invested };
    }, [projects]);

    // ── Filtered list ──────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!projects) return [];
        if (filter === 'all') return projects;
        return projects.filter(p => deriveProjectStatus(p.bookings ?? []) === filter);
    }, [projects, filter]);

    // ── Loading ────────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-40">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    // ── DB / RLS error ─────────────────────────────────────────────────────────
    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-5">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-red-400" />
                </div>
                <div className="text-center max-w-sm">
                    <p className="text-sm font-black uppercase tracking-widest text-zinc-300 mb-1">
                        Erro ao carregar projetos
                    </p>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                        Não foi possível buscar seus projetos. Verifique sua conexão ou execute a migração{' '}
                        <code className="text-primary font-mono text-[10px]">V30_FIX_PROJECTS_RLS.sql</code>{' '}
                        no painel do Supabase.
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 font-black uppercase text-[10px] tracking-widest rounded-xl"
                    onClick={() => window.location.reload()}
                >
                    Tentar novamente
                </Button>
            </div>
        );
    }

    const hasProjects = projects && projects.length > 0;

    return (
        <>
            {/* ── Page header ── */}
            <header className="mb-8 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter uppercase mb-1">Projetos</h2>
                    <p className="text-zinc-500 text-sm font-medium">
                        Locações em conjunto — acompanhe todos os equipamentos em um lugar.
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-[10px] font-black uppercase tracking-widest text-zinc-500
                               hover:text-primary hover:bg-primary/5 rounded-xl border border-zinc-800
                               hover:border-primary/30 transition-all"
                    onClick={() => window.location.href = '/'}
                >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Ir ao Marketplace
                </Button>
            </header>

            {/* ── KPI strip ── */}
            {hasProjects && kpis && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                    <KpiCard
                        label="Total de projetos"
                        value={kpis.total}
                        icon={Layers}
                        accent="bg-zinc-800/80"
                    />
                    <KpiCard
                        label="Em andamento"
                        value={kpis.active}
                        sub="aprovados, em uso ou em trânsito"
                        icon={TrendingUp}
                        accent="bg-primary/15"
                    />
                    <KpiCard
                        label="Aguardando"
                        value={kpis.pending}
                        sub="aguardando aprovação da locadora"
                        icon={Clock}
                        accent="bg-amber-500/10"
                    />
                    <KpiCard
                        label="Total investido"
                        value={brl(kpis.invested)}
                        icon={Package}
                        accent="bg-emerald-500/10"
                    />
                </div>
            )}

            {/* ── Filter pills ── */}
            {hasProjects && (
                <div className="flex items-center gap-2 flex-wrap mb-6">
                    {(Object.keys(FILTER_LABELS) as FilterStatus[]).map(f => {
                        const count = f === 'all'
                            ? (projects?.length ?? 0)
                            : (projects ?? []).filter(p => deriveProjectStatus(p.bookings ?? []) === f).length;
                        if (f !== 'all' && count === 0) return null;
                        return (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px]
                                           font-black uppercase tracking-widest transition-all duration-200
                                           ${filter === f
                                               ? 'bg-primary border-primary/50 text-white shadow-lg shadow-primary/20'
                                               : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                                           }`}
                            >
                                {FILTER_LABELS[f]}
                                <span className={`text-[8px] font-black px-1 py-0.5 rounded-full
                                    ${filter === f ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Empty state ── */}
            {!hasProjects && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-28
                               border border-dashed border-zinc-800 rounded-3xl text-center gap-5"
                >
                    <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800
                                    flex items-center justify-center">
                        <FolderOpen className="w-9 h-9 text-zinc-700" />
                    </div>
                    <div>
                        <p className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-2">
                            Nenhum projeto ainda
                        </p>
                        <p className="text-xs text-zinc-600 leading-relaxed max-w-xs mx-auto">
                            Vá ao marketplace, adicione equipamentos com{' '}
                            <span className="text-primary font-black">+ Projeto</span>{' '}
                            e confirme a locação em conjunto pelo carrinho.
                        </p>
                    </div>
                    <Button
                        className="bg-primary hover:bg-primary/90 text-white font-black uppercase
                                   text-[10px] tracking-widest rounded-xl shadow-lg shadow-primary/20"
                        onClick={() => window.location.href = '/'}
                    >
                        Explorar Marketplace <ArrowRight className="w-3.5 h-3.5 ml-2" />
                    </Button>
                </motion.div>
            )}

            {/* ── No results for filter ── */}
            {hasProjects && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                    <p className="text-sm font-black uppercase tracking-widest text-zinc-600">
                        Nenhum projeto com status "{FILTER_LABELS[filter]}"
                    </p>
                    <button
                        onClick={() => setFilter('all')}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                    >
                        Ver todos
                    </button>
                </div>
            )}

            {/* ── Project grid ── */}
            {filtered.length > 0 && (
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={filter}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                    >
                        {filtered.map((p, i) => (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <ProjectCard
                                    project={p}
                                    onClick={() => setSelectedId(p.id)}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>
            )}

            {/* ── Detail modal ── */}
            <ProjectDetailModal
                project={selected}
                isOpen={!!selected}
                onClose={() => setSelectedId(null)}
            />
        </>
    );
}
