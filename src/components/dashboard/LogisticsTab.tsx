import { useState, useEffect } from 'react';
import { Package, Truck, Clock, MapPin, CheckCircle2, ShoppingBag, ArrowRight, Loader2, Phone, User, Hash, ShieldAlert, Navigation } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { OrderStatusTracker } from './OrderStatusTracker';
import { useDeliveries, useUpdateDeliveryStatus } from '@/hooks/useDeliveries';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useBranches } from '@/hooks/useBranches';
import { Dialog } from '@/components/ui/dialog';
import { InternalTransfersSection } from './InternalTransfersSection';
import { cn } from '@/lib/utils';
import { InventoryStatusReport } from './InventoryStatusReport';
import { useTenant } from '@/contexts/TenantContext';

export function LogisticsTab({ tenantId }: { tenantId: string }) {
    const { user } = useAuth();
    const { isBranchManager, branchId } = useTenant();
    const { branches } = useBranches();
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [branchModalOpen, setBranchModalOpen] = useState(false);
    const [pendingDelivery, setPendingDelivery] = useState<any>(null);
    const queryClient = useQueryClient();
    const { data: deliveries, isLoading, error: fetchError } = useDeliveries({ 
        tenantId,
        branchId: isBranchManager ? branchId : undefined
    });
    const updateMutation = useUpdateDeliveryStatus();
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [serialNumbers, setSerialNumbers] = useState<Record<string, string>>({});
    const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({});

    // Real-Time Update Implementation
    useEffect(() => {
        const channel = supabase
            .channel('logistics_realtime')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'deliveries' }, 
                () => {
                    queryClient.invalidateQueries({ queryKey: ['deliveries'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const handleNextStatus = async (delivery: any) => {
        // Lógica de ACEITE para Sub-locadoras
        if (delivery.subrental_status === 'pending' && delivery.booking?.subrental_company_id === tenantId) {
            setUpdatingId(delivery.id);
            try {
                const { error } = await supabase
                    .from('deliveries')
                    .update({ 
                        subrental_status: 'accepted',
                        fulfilling_company_id: tenantId // Vincula oficialmente a empresa à entrega
                    })
                    .eq('id', delivery.id);
                
                if (error) throw error;
                queryClient.invalidateQueries({ queryKey: ['deliveries'] });
                return;
            } catch (error: any) {
                console.error('Erro ao aceitar pedido:', error);
                alert(`Erro ao aceitar: ${error.message}`);
                return;
            } finally {
                setUpdatingId(null);
            }
        }

        const statusFlow: any = {
            'pending': 'picking',
            'picking': 'ready',
            'ready': 'shipped',
            'shipped': 'delivered'
        };

        const nextStatus = statusFlow[delivery.status];
        if (!nextStatus) return;

        // Se for a primeira movimentação (pending -> picking), abre modal de escolha de filial APENAS se não houver fornecedor externo
        if (delivery.status === 'pending' && nextStatus === 'picking' && branches && branches.length > 0 && !selectedBranchId && !delivery.fulfilling_company_id) {
            setPendingDelivery(delivery);
            setBranchModalOpen(true);
            return;
        }

        // Safety check for delivery token if moving to 'delivered'
        if (delivery.status === 'shipped' && nextStatus === 'delivered') {
            const enteredToken = tokenInputs[delivery.id] || '';
            if (enteredToken !== delivery.delivery_token) {
                alert('Token de segurança inválido! Solicite o código de 4 dígitos ao cliente.');
                return;
            }
        }

        setUpdatingId(delivery.id);
        try {
            await updateMutation.mutateAsync({ 
                id: delivery.id, 
                status: nextStatus,
                serial_number: serialNumbers[delivery.id],
                origin_branch_id: selectedBranchId || delivery.origin_branch_id
            });
            console.log("Logística atualizada com sucesso!");
        } catch (error: any) {
            console.error('Erro na logística:', error);
            alert(`Erro ao atualizar logística: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setUpdatingId(null);
            setSelectedBranchId(null);
            setPendingDelivery(null);
        }
    };

    const confirmBranchSelection = async () => {
        if (!selectedBranchId) {
            alert('Por favor, selecione uma unidade de origem.');
            return;
        }
        setBranchModalOpen(false);
        await handleNextStatus(pendingDelivery);
    };

    const getStatusLabel = (status: string) => {
        const labels: any = {
            'pending': 'Pedido Recebido',
            'picking': 'Em Separação',
            'ready': 'Pronto para Enviar',
            'shipped': 'Em Trânsito',
            'delivered': 'Entregue',
            'cancelled': 'Cancelado'
        };
        return labels[status] || status;
    };

    const getNextActionLabel = (status: string) => {
        const actions: any = {
            'pending': 'Confirmar Pedido',
            'picking': 'Finalizar Separação',
            'ready': 'Despachar Equipamento',
            'shipped': 'Confirmar Entrega'
        };
        return actions[status];
    };

    const [activeSubTab, setActiveSubTab] = useState<'deliveries' | 'transfers' | 'availability'>('deliveries');

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-zinc-500 font-medium tracking-widest uppercase text-xs">Carregando Fluxo Logístico...</p>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <ShieldAlert className="h-12 w-12 text-destructive mb-4 opacity-50" />
                <h3 className="text-xl font-black uppercase text-zinc-100 mb-2">Erro ao carregar logística</h3>
                <p className="text-zinc-500 text-xs font-medium max-w-md">
                    Ocorreu um erro ao buscar os dados do servidor. Verifique sua conexão e as permissões de acesso.
                </p>
                <Button 
                    variant="outline" 
                    className="mt-6 border-zinc-800 text-[10px] font-black uppercase tracking-widest"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['deliveries'] })}
                >
                    Tentar Novamente
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-white/5">
                <div className="space-y-1">
                    <h2 className="text-5xl font-black tracking-tighter uppercase leading-none">Logística</h2>
                    <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px]">Hub de Operações em Tempo Real</p>
                </div>

                <div className="flex bg-zinc-950/60 p-1.5 rounded-[20px] border border-white/5 backdrop-blur-xl">
                    {[
                        { id: 'deliveries', label: 'Pedidos Ativos' },
                        { id: 'transfers', label: 'Transferências' },
                        { id: 'availability', label: 'Disponibilidade' }
                    ].map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id as any)}
                            className={cn(
                                "px-8 py-2.5 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all duration-500",
                                activeSubTab === tab.id 
                                    ? "bg-zinc-800 text-white shadow-2xl shadow-black/50" 
                                    : "text-zinc-600 hover:text-zinc-400"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {activeSubTab === 'availability' ? (
                <InventoryStatusReport companyId={tenantId} />
            ) : activeSubTab === 'transfers' ? (
                <InternalTransfersSection />
            ) : (
                <div className="grid grid-cols-1 gap-10">
                    <AnimatePresence mode="popLayout">
                        {deliveries?.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-zinc-950/20 border border-dashed border-white/5 rounded-[40px] p-32 text-center backdrop-blur-md"
                        >
                            <div className="relative inline-block mb-6">
                                <div className="absolute inset-0 bg-zinc-800 blur-2xl rounded-full opacity-20" />
                                <Truck className="h-16 w-16 text-zinc-800 relative z-10 mx-auto" />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-zinc-600">Silêncio na Malha</h3>
                            <p className="text-zinc-700 text-xs mt-3 font-bold uppercase tracking-widest">Nenhum fluxo de saída detectado.</p>
                        </motion.div>
                    ) : (
                        deliveries?.map((delivery: any) => (
                            <motion.div
                                key={delivery.id}
                                layout
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="group"
                            >
                                <Card className="bg-zinc-950/40 border-white/5 rounded-[40px] overflow-hidden hover:border-white/10 transition-all duration-700 shadow-[0_30px_100px_rgba(0,0,0,0.6)] backdrop-blur-3xl relative">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                    
                                    <div className="p-8 sm:p-12">
                                        <div className="flex flex-col lg:flex-row gap-12">
                                            {/* Order Info */}
                                            <div className="flex-1 space-y-10">
                                                <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
                                                    <div className="flex gap-6">
                                                        <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-[32px] bg-black border border-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl">
                                                            {delivery.booking?.equipment?.images?.[0] ? (
                                                                <img src={delivery.booking.equipment.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                                            ) : (
                                                                <Package className="h-10 w-10 text-zinc-800" />
                                                            )}
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex flex-wrap items-center gap-3">
                                                                <Badge variant="outline" className="text-[9px] uppercase font-black bg-white/5 text-zinc-400 border-white/10 px-3 py-1 tracking-widest">
                                                                    ORD-{delivery.booking_id.slice(0, 8).toUpperCase()}
                                                                </Badge>
                                                                {delivery.serial_number && (
                                                                    <Badge variant="outline" className="text-[9px] uppercase font-black bg-emerald-500/5 text-emerald-500 border-emerald-500/10 px-3 py-1 tracking-widest">
                                                                        SERIAL: {delivery.serial_number}
                                                                    </Badge>
                                                                )}
                                                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                                                    <Clock className="h-3 w-3" /> {format(new Date(delivery.created_at), "dd/MM '·' HH:mm")}
                                                                </span>
                                                            </div>
                                                            <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-white leading-tight">
                                                                {delivery.booking?.equipment?.name || 'Equipamento em Trânsito'}
                                                            </h3>
                                                            <div className="flex flex-wrap items-center gap-4">
                                                                <div className="flex items-center gap-2 bg-zinc-900/40 px-3 py-1.5 rounded-full border border-white/5">
                                                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                                        {delivery.booking?.renter?.company?.name || delivery.booking?.renter?.full_name || 'Cliente'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 bg-zinc-900/40 px-3 py-1.5 rounded-full border border-white/5">
                                                                    <MapPin className="h-3 w-3 text-zinc-500" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                                        {delivery.booking?.renter?.company?.city || 'HUB Central'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="text-right flex flex-col items-end gap-3 shrink-0">
                                                        <div className="space-y-1">
                                                            <span className="text-[8px] font-black uppercase text-zinc-700 tracking-[0.4em] block">Status Logístico</span>
                                                            <div className="bg-zinc-900/80 backdrop-blur-md text-zinc-300 font-black uppercase text-[10px] py-2.5 px-6 rounded-full border border-white/5 shadow-2xl tracking-[0.2em] inline-block">
                                                                {getStatusLabel(delivery.status)}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                                                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Volume:</span>
                                                            <span className="text-[10px] font-black text-white">{delivery.booking?.quantity || 1} UN</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="relative pt-6">
                                                    <OrderStatusTracker status={delivery.status} />
                                                </div>
                                            </div>

                                            {/* Action Sidebar - The Console */}
                                            <div className="w-full lg:w-[340px] shrink-0">
                                                <div className="h-full bg-zinc-950/60 rounded-[32px] p-8 border border-white/5 flex flex-col justify-between gap-8 backdrop-blur-2xl">
                                                    
                                                    <div className="space-y-6">
                                                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Fluxo Operacional</span>
                                                            </div>
                                                            <Navigation className="h-4 w-4 text-zinc-800" />
                                                        </div>

                                                        {/* Dynamic Interaction Space */}
                                                        <AnimatePresence mode="wait">
                                                            {delivery.status !== 'delivered' && delivery.status !== 'cancelled' ? (
                                                                <motion.div 
                                                                    key="active-actions"
                                                                    initial={{ opacity: 0, x: 20 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    exit={{ opacity: 0, x: -20 }}
                                                                    className="space-y-6"
                                                                >
                                                                    {/* TOKEN FOR RENTER */}
                                                                    {delivery.booking?.renter_id === user?.id && (
                                                                        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 text-center space-y-4">
                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Seu Token de Resgate</p>
                                                                            <div className="text-5xl font-black tracking-[0.2em] text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                                                                {delivery.delivery_token || '----'}
                                                                            </div>
                                                                            <p className="text-[9px] text-zinc-600 font-bold uppercase leading-relaxed">Informe ao fornecedor no ato da conferência</p>
                                                                        </div>
                                                                    )}

                                                                    {/* PARTNER ACTIONS (PICKING/SHIPPING/ACCEPTING) */}
                                                                    {delivery.booking?.renter_id !== user?.id && (
                                                                        <div className="space-y-6">
                                                                            {/* Sub-locadora precisa ACEITAR o pedido antes de separar */}
                                                                            {delivery.subrental_status === 'pending' && delivery.booking?.company_id !== tenantId ? (
                                                                                <div className="space-y-4">
                                                                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                                                                                        <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-1">Solicitação de Atendimento</p>
                                                                                        <p className="text-[11px] text-zinc-400">O CineHub designou este pedido para você. Aceite para iniciar a separação.</p>
                                                                                    </div>
                                                                                    <Button 
                                                                                        onClick={() => handleNextStatus(delivery)}
                                                                                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest h-14 rounded-xl shadow-lg"
                                                                                    >
                                                                                        Aceitar e Iniciar
                                                                                    </Button>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="space-y-6">
                                                                                    {/* Serial Input */}
                                                                                    {delivery.status === 'picking' && (
                                                                                        <div className="space-y-3">
                                                                                            <label className="text-[9px] font-black uppercase text-zinc-600 tracking-widest flex items-center gap-2 ml-1">
                                                                                                <Hash className="h-3.5 w-3.5" /> Identificação Serial
                                                                                            </label>
                                                                                            <Input 
                                                                                                placeholder="DIGITE O SN DO EQUIPAMENTO"
                                                                                                className="bg-black/50 border-white/5 rounded-xl h-14 text-center text-xs font-black tracking-widest focus:border-primary/50 transition-all"
                                                                                                value={serialNumbers[delivery.id] || delivery.serial_number || ''}
                                                                                                onChange={(e) => setSerialNumbers(prev => ({ ...prev, [delivery.id]: e.target.value.toUpperCase() }))}
                                                                                            />
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Token Input for Confirmation */}
                                                                                    {delivery.status === 'shipped' && (
                                                                                        <div className="space-y-3">
                                                                                            <label className="text-[9px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-2 ml-1">
                                                                                                <ShieldAlert className="h-3.5 w-3.5" /> Validar Recebimento
                                                                                            </label>
                                                                                            <Input 
                                                                                                placeholder="----"
                                                                                                maxLength={4}
                                                                                                className="bg-black/50 border-emerald-500/20 rounded-xl h-16 text-center text-3xl font-black tracking-[0.5em] focus:border-emerald-500/50 transition-all text-white"
                                                                                                value={tokenInputs[delivery.id] || ''}
                                                                                                onChange={(e) => setTokenInputs(prev => ({ ...prev, [delivery.id]: e.target.value.replace(/\D/g, '') }))}
                                                                                            />
                                                                                            <p className="text-[8px] text-zinc-600 text-center uppercase font-bold">Solicite o token de 4 dígitos ao cliente</p>
                                                                                        </div>
                                                                                    )}

                                                                                    <Button 
                                                                                        onClick={() => handleNextStatus(delivery)}
                                                                                        disabled={updatingId === delivery.id}
                                                                                        className="w-full bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-[0.2em] h-16 rounded-2xl shadow-[0_20px_50px_rgba(255,255,255,0.1)] transition-all active:scale-[0.98]"
                                                                                    >
                                                                                        {updatingId === delivery.id ? (
                                                                                            <Loader2 className="h-5 w-5 animate-spin" />
                                                                                        ) : (
                                                                                            <span className="flex items-center gap-3">
                                                                                                {getNextActionLabel(delivery.status)} <ArrowRight className="h-4 w-4" />
                                                                                            </span>
                                                                                        )}
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* External Subrental Notice */}
                                                                    {delivery.fulfilling_company_id === tenantId && delivery.booking?.company_id !== tenantId && (
                                                                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex items-center gap-4">
                                                                            <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                                                                <Package className="h-4 w-4 text-blue-400" />
                                                                            </div>
                                                                            <div className="space-y-0.5">
                                                                                <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">Atendimento HUB</p>
                                                                                <p className="text-[10px] text-zinc-500 font-medium">Você é o fornecedor designado.</p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            ) : (
                                                                <motion.div 
                                                                    key="completed"
                                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    className="flex flex-col items-center justify-center py-10 space-y-4"
                                                                >
                                                                    <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center relative">
                                                                        <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                                                                        <CheckCircle2 className="h-10 w-10 text-emerald-500 relative z-10" />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500">Operação Finalizada</p>
                                                                        <p className="text-[9px] text-zinc-600 font-bold uppercase mt-1">Concluído em {format(new Date(), "dd/MM")}</p>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>

                                                    <div className="flex items-center justify-center gap-6 pt-4 border-t border-white/5">
                                                        <button className="text-zinc-600 hover:text-zinc-400 transition-colors p-2"><MapPin className="h-4 w-4" /></button>
                                                        <button className="text-zinc-600 hover:text-zinc-400 transition-colors p-2"><Phone className="h-4 w-4" /></button>
                                                        <button className="text-zinc-600 hover:text-zinc-400 transition-colors p-2"><Hash className="h-4 w-4" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
            )}


            {/* Modal de Escolha de Filial */}
            <Dialog 
                isOpen={branchModalOpen} 
                onClose={() => setBranchModalOpen(false)}
                title="Unidade de Origem"
            >
                <div className="space-y-6">
                    <p className="text-zinc-500 text-sm font-medium">De qual unidade do CineHub este equipamento será enviado?</p>
                    
                    <div className="grid grid-cols-1 gap-3">
                        {branches?.map(branch => (
                            <button
                                key={branch.id}
                                onClick={() => setSelectedBranchId(branch.id)}
                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                                    selectedBranchId === branch.id 
                                    ? 'border-primary bg-primary/10' 
                                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                                }`}
                            >
                                <div>
                                    <p className="font-black uppercase tracking-tighter">{branch.name}</p>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{branch.city} - {branch.state}</p>
                                </div>
                                {selectedBranchId === branch.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button 
                            variant="ghost" 
                            onClick={() => setBranchModalOpen(false)}
                            className="flex-1 text-zinc-500 font-black uppercase tracking-widest"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={confirmBranchSelection}
                            className="flex-2 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest px-8 rounded-xl"
                        >
                            Confirmar Unidade
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
