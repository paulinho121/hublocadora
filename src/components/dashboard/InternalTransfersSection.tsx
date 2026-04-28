import { useState } from 'react';
import { useTransfers, InternalTransfer } from '@/hooks/useTransfers';
import { useBranches } from '@/hooks/useBranches';
import { useBranchStock } from '@/hooks/useBranchStock';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, ArrowRight, Loader2, CheckCircle2, AlertCircle, Building2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Dialog } from '@/components/ui/dialog';

export function InternalTransfersSection() {
    const { transfers, isLoading, updateTransfer } = useTransfers();
    const { branches } = useBranches();
    const [selectedTransfer, setSelectedTransfer] = useState<InternalTransfer | null>(null);
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [sourceBranchId, setSourceBranchId] = useState<string | null>(null);

    const getBranchesWithStock = (equipmentId: string) => {
        return branches || [];
    };

    const handleApprove = async () => {
        if (!selectedTransfer || !sourceBranchId) return;
        
        try {
            await updateTransfer.mutateAsync({
                id: selectedTransfer.id,
                source_branch_id: sourceBranchId,
                status: 'pending_source'
            });
            setIsApprovalModalOpen(false);
            setSelectedTransfer(null);
            setSourceBranchId(null);
        } catch (error) {
            console.error('Erro ao aprovar transferência');
        }
    };

    if (isLoading) return (
        <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Sincronizando Malha Logística...</p>
        </div>
    );

    const pendingTransfers = transfers?.filter(t => t.status === 'pending_master') || [];
    const activeTransfers = transfers?.filter(t => t.status !== 'pending_master' && t.status !== 'completed' && t.status !== 'rejected') || [];

    return (
        <div className="space-y-16 animate-in fade-in duration-1000">
            {/* Solicitações Pendentes */}
            <section className="space-y-8">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-[14px] bg-primary/10 flex items-center justify-center border border-primary/20">
                            <AlertCircle className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Aprovações Críticas</h3>
                    </div>
                    <Badge variant="outline" className="bg-zinc-950 text-zinc-500 border-white/5 font-black px-4 py-1.5">{pendingTransfers.length} PENDENTES</Badge>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {pendingTransfers.length === 0 ? (
                        <div className="py-16 bg-zinc-950/20 border border-dashed border-white/5 rounded-[32px] text-center backdrop-blur-md">
                            <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.4em]">Fluxo de Aprovação Limpo</p>
                        </div>
                    ) : pendingTransfers.map(transfer => (
                        <Card key={transfer.id} className="bg-zinc-950/40 border-white/5 rounded-[32px] overflow-hidden hover:border-primary/20 transition-all duration-500 group backdrop-blur-3xl shadow-2xl">
                            <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="flex items-center gap-8 w-full">
                                    <div className="h-20 w-20 rounded-[24px] bg-black border border-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-500">
                                        {transfer.equipment?.images?.[0] ? (
                                            <img src={transfer.equipment.images[0]} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Package className="h-8 w-8 text-zinc-800" />
                                        )}
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-3">
                                            <Badge className="bg-primary/5 text-primary border-primary/10 text-[9px] uppercase font-black tracking-widest px-3 py-1">REPOSIÇÃO URGENTE</Badge>
                                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">{format(new Date(transfer.created_at), "dd/MM '·' HH:mm")}</span>
                                        </div>
                                        <h4 className="text-2xl font-black uppercase tracking-tighter text-white">{transfer.equipment?.name}</h4>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                            <Building2 className="h-3.5 w-3.5" /> DESTINO: <span className="text-zinc-300">{transfer.requester_branch?.name}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-6 md:pt-0">
                                    <div className="text-right">
                                        <span className="text-[9px] font-black uppercase text-zinc-700 tracking-[0.3em] block mb-1">Volume</span>
                                        <span className="text-4xl font-black text-white">{transfer.quantity}</span>
                                    </div>
                                    <Button 
                                        onClick={() => {
                                            setSelectedTransfer(transfer);
                                            setIsApprovalModalOpen(true);
                                        }}
                                        className="bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest px-10 rounded-[18px] h-14 shadow-xl shadow-primary/10 transition-all active:scale-95"
                                    >
                                        Liberar Fluxo
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Trânsito / Processamento */}
            <section className="space-y-8">
                <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                    <div className="h-10 w-10 rounded-[14px] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Truck className="h-5 w-5 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Malha Ativa</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {activeTransfers.map(transfer => (
                        <Card key={transfer.id} className="bg-zinc-950/20 border-white/5 rounded-[32px] overflow-hidden backdrop-blur-xl">
                            <CardContent className="p-8 space-y-8">
                                <div className="flex items-center justify-between">
                                    <Badge className="bg-zinc-900 text-zinc-400 border-white/5 text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5">{transfer.status}</Badge>
                                    <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">TRF-{transfer.id.slice(0, 8).toUpperCase()}</div>
                                </div>
                                
                                <h4 className="text-lg font-black uppercase tracking-tighter text-zinc-300">{transfer.equipment?.name} · <span className="text-white">{transfer.quantity} UN</span></h4>

                                <div className="flex items-center justify-between bg-black/40 p-8 rounded-[24px] border border-white/5 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                    
                                    <div className="flex-1 text-center relative z-10 space-y-1">
                                        <p className="text-[9px] font-black uppercase text-zinc-700 tracking-[0.2em]">Origem</p>
                                        <p className="text-xs font-black text-zinc-200">{transfer.source_branch?.name}</p>
                                        <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">{transfer.source_branch?.city}</p>
                                    </div>
                                    
                                    <div className="px-6 relative z-10">
                                        <div className="w-16 h-[1px] bg-zinc-800 relative">
                                            <motion.div 
                                                animate={{ left: ['0%', '100%'] }} 
                                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                                className="absolute top-1/2 -translate-y-1/2 w-4 h-[1px] bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" 
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 text-center relative z-10 space-y-1">
                                        <p className="text-[9px] font-black uppercase text-zinc-700 tracking-[0.2em]">Destino</p>
                                        <p className="text-xs font-black text-zinc-200">{transfer.requester_branch?.name}</p>
                                        <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">{transfer.requester_branch?.city}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Modal de Aprovação */}
            <Dialog 
                isOpen={isApprovalModalOpen} 
                onClose={() => setIsApprovalModalOpen(false)}
                title="Sincronização de Estoque"
            >
                <div className="space-y-8">
                    <div className="p-6 bg-primary/5 border border-primary/10 rounded-[24px] backdrop-blur-xl">
                        <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                            A unidade <span className="text-white font-black">{selectedTransfer?.requester_branch?.name}</span> necessita de <span className="text-white font-black">{selectedTransfer?.quantity}x {selectedTransfer?.equipment?.name}</span>. Selecione a base de suprimento:
                        </p>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 ml-2">Bases de Distribuição Disponíveis</label>
                        <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
                            {getBranchesWithStock(selectedTransfer?.equipment_id || '').map(branch => (
                                <button
                                    key={branch.id}
                                    onClick={() => setSourceBranchId(branch.id)}
                                    className={`flex items-center justify-between p-5 rounded-[20px] border transition-all duration-500 text-left ${
                                        sourceBranchId === branch.id 
                                        ? 'border-primary bg-primary/10 shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)]' 
                                        : 'border-white/5 bg-zinc-950/40 hover:border-white/20'
                                    }`}
                                >
                                    <div className="space-y-1">
                                        <p className="text-sm font-black uppercase tracking-tight text-white">{branch.name}</p>
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{branch.city} · {branch.state}</p>
                                    </div>
                                    {sourceBranchId === branch.id && (
                                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                            <CheckCircle2 className="h-4 w-4 text-black" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6 border-t border-white/5">
                        <Button variant="ghost" onClick={() => setIsApprovalModalOpen(false)} className="flex-1 font-black uppercase text-[10px] tracking-widest text-zinc-600 hover:text-white transition-colors">Abortar</Button>
                        <Button 
                            disabled={!sourceBranchId}
                            onClick={handleApprove} 
                            className="flex-[2] bg-white text-black hover:bg-zinc-200 font-black uppercase text-[11px] tracking-[0.2em] px-10 rounded-[18px] h-14 shadow-2xl transition-all active:scale-95"
                        >
                            Confirmar Movimentação
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
