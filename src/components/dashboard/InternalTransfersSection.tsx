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

    // Filtra as filiais que possuem o item em estoque
    const getBranchesWithStock = (equipmentId: string) => {
        // Esta lógica precisaria de um hook que buscasse o estoque de TODAS as filiais para um item
        // Por enquanto vamos listar todas e o Master escolhe, ou poderíamos otimizar
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
            alert('Erro ao aprovar transferência');
        }
    };

    if (isLoading) return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto my-10" />;

    const pendingTransfers = transfers?.filter(t => t.status === 'pending_master') || [];
    const activeTransfers = transfers?.filter(t => t.status !== 'pending_master' && t.status !== 'completed' && t.status !== 'rejected') || [];

    return (
        <div className="space-y-10">
            {/* Solicitações Pendentes de Aprovação Master */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Aprovações Pendentes</h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {pendingTransfers.length === 0 ? (
                        <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest italic py-8 border border-dashed border-zinc-800 rounded-3xl text-center">
                            Nenhuma solicitação aguardando aprovação master.
                        </p>
                    ) : pendingTransfers.map(transfer => (
                        <Card key={transfer.id} className="bg-zinc-950 border-zinc-800 rounded-3xl overflow-hidden hover:border-primary/30 transition-all">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                                        {transfer.equipment?.images?.[0] ? (
                                            <img src={transfer.equipment.images[0]} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Package className="h-6 w-6 text-zinc-700" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] uppercase font-black">SOLICITAÇÃO DE REPOSIÇÃO</Badge>
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{format(new Date(transfer.created_at), "dd/MM 'às' HH:mm")}</span>
                                        </div>
                                        <h4 className="text-lg font-black italic uppercase text-zinc-100">{transfer.equipment?.name}</h4>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                            <Building2 className="h-3 w-3" /> Unidade Solicitante: <span className="text-zinc-300">{transfer.requester_branch?.name}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <span className="text-[10px] font-black uppercase text-zinc-600 block mb-1">Quantidade</span>
                                        <span className="text-2xl font-black italic text-white">{transfer.quantity}</span>
                                    </div>
                                    <Button 
                                        onClick={() => {
                                            setSelectedTransfer(transfer);
                                            setIsApprovalModalOpen(true);
                                        }}
                                        className="bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest px-8 rounded-xl h-12"
                                    >
                                        Aprovar & Escolher Origem
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Fluxo Logístico de Transferência */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Truck className="h-5 w-5 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Em Trânsito / Processamento</h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {activeTransfers.map(transfer => (
                        <Card key={transfer.id} className="bg-zinc-900/40 border-zinc-800 rounded-3xl overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px] font-black uppercase tracking-widest">{transfer.status}</Badge>
                                        <h4 className="text-sm font-black uppercase tracking-tight text-zinc-300">{transfer.equipment?.name} ({transfer.quantity} UN)</h4>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase">
                                        ID #{transfer.id.slice(0, 8)}
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between bg-black/20 p-6 rounded-2xl border border-zinc-800/50">
                                    <div className="flex-1 text-center">
                                        <p className="text-[10px] font-black uppercase text-zinc-600 mb-1">Origem</p>
                                        <p className="text-sm font-black text-zinc-200">{transfer.source_branch?.name}</p>
                                        <p className="text-[8px] text-zinc-500 font-bold uppercase">{transfer.source_branch?.city}</p>
                                    </div>
                                    <div className="px-10">
                                        <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-primary/30 to-transparent relative">
                                            <Truck className="h-4 w-4 text-primary absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                                        </div>
                                    </div>
                                    <div className="flex-1 text-center">
                                        <p className="text-[10px] font-black uppercase text-zinc-600 mb-1">Destino</p>
                                        <p className="text-sm font-black text-zinc-200">{transfer.requester_branch?.name}</p>
                                        <p className="text-[8px] text-zinc-500 font-bold uppercase">{transfer.requester_branch?.city}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Modal de Aprovação e Seleção de Origem */}
            <Dialog 
                isOpen={isApprovalModalOpen} 
                onClose={() => setIsApprovalModalOpen(false)}
                title="Aprovar Movimentação de Estoque"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                        <p className="text-zinc-500 text-xs font-medium leading-relaxed">
                            A unidade <span className="text-white font-bold">{selectedTransfer?.requester_branch?.name}</span> solicitou <span className="text-white font-bold">{selectedTransfer?.quantity}x {selectedTransfer?.equipment?.name}</span>. Escolha abaixo qual unidade deve fornecer este item.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Unidade de Origem (Onde tem o item)</label>
                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {getBranchesWithStock(selectedTransfer?.equipment_id || '').map(branch => (
                                <button
                                    key={branch.id}
                                    onClick={() => setSourceBranchId(branch.id)}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                                        sourceBranchId === branch.id 
                                        ? 'border-primary bg-primary/5' 
                                        : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                                    }`}
                                >
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-tight">{branch.name}</p>
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase">{branch.city}</p>
                                    </div>
                                    {sourceBranchId === branch.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-zinc-900">
                        <Button variant="ghost" onClick={() => setIsApprovalModalOpen(false)} className="flex-1 font-black uppercase text-[10px] tracking-widest text-zinc-500">Cancelar</Button>
                        <Button 
                            disabled={!sourceBranchId}
                            onClick={handleApprove} 
                            className="flex-2 bg-primary text-black font-black uppercase text-[10px] tracking-widest px-8 rounded-xl h-12 shadow-xl shadow-primary/20"
                        >
                            Confirmar & Solicitar Envio
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
