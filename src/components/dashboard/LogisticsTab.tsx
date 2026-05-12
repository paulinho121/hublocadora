import { useState, useEffect } from 'react';
import { Package, Truck, Clock, MapPin, CheckCircle2, ShoppingBag, ArrowRight, Loader2, Phone, User, Hash, ShieldAlert, Navigation, RotateCcw, Building2, Eye, Info, Weight, Boxes, Ruler, MoreHorizontal, PhoneCall, History, Search, Filter, AlertCircle, ChevronRight, Gauge } from 'lucide-react';
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
import { useTransfers } from '@/hooks/useTransfers';
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
    const [logisticsMode, setLogisticsMode] = useState<'to_send' | 'to_receive'>('to_send');
    const { transfers } = useTransfers();

    // Lógica de separação dos pedidos
    const toSendDeliveries = deliveries?.filter((d: any) => {
        const fulfillmentId = d.fulfilling_company_id || d.origin_branch_id;
        
        // 1. Gerente de Filial: Vê o que sai da sua unidade
        if (isBranchManager) return d.origin_branch_id === branchId;
        
        // 2. Empresa Fulfiller (Sub-locadora ou Master): Vê o que ela mesma deve enviar
        if (tenantId && d.fulfilling_company_id === tenantId) return true;
        
        // 3. Master / Dono do Pedido: Vê o que ele mesmo envia OU o que ele terceirizou (para acompanhamento)
        if (tenantId && d.booking?.company_id === tenantId) return true;
        
        return false;
    });

    const toReceiveDeliveries = deliveries?.filter((d: any) => {
        // 1. Identificar se sou o locatário (quem deve receber o item)
        const renterCompanyId = d.booking?.renter?.company_id || d.booking?.renter?.company?.id;
        const isRenter = d.booking?.renter_id === user?.id || (tenantId && renterCompanyId === tenantId);
        
        // 2. Aparece em "A Receber" se eu for o locatário e o pedido estiver ativo (não cancelado ou finalizado)
        // Antes estava restrito a 'shipped' ou 'delivered', mas o locatário quer saber se o item está sendo preparado.
        return isRenter && d.status !== 'confirmed' && d.status !== 'cancelled';
    }) || [];

    // Incluir transferências internas em entrada
    const toReceiveTransfers = transfers?.filter(t => 
        (isBranchManager ? t.requester_branch_id === branchId : true) && 
        t.status !== 'completed' && t.status !== 'rejected' && t.status !== 'pending_master'
    ) || [];

    const toReceiveCount = toReceiveDeliveries.length + toReceiveTransfers.length;

    const activeDeliveries = logisticsMode === 'to_send' ? toSendDeliveries : toReceiveDeliveries;

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

    const getRemainingTime = (endDate: string) => {
        if (!endDate) return "Sem data";
        const total = Date.parse(endDate) - Date.parse(new Date().toISOString());
        if (total <= 0) return "Prazo Esgotado";
        const days = Math.floor(total / (1000 * 60 * 60 * 24));
        const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((total / 1000 / 60) % 60);
        
        if (days > 0) return `${days}d ${hours}h restantes`;
        return `${hours}h ${minutes}m restantes`;
    };

    const handleNextStatus = async (delivery: any) => {
        // Lógica de ACEITE para Sub-locadoras
        if (delivery.subrental_status === 'pending' && delivery.booking?.equipment?.subrental_company_id === tenantId) {
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
            'shipped': 'delivered',
            'delivered': 'confirmed'
        };

        const nextStatus = statusFlow[delivery.status];
        if (!nextStatus) return;

        // Se for o primeiro passo (pending -> picking), precisamos definir a filial de origem
        if (delivery.status === 'pending' && nextStatus === 'picking' && branches && branches.length > 0 && !selectedBranchId && !delivery.fulfilling_company_id && !delivery.origin_branch_id) {
            setPendingDelivery(delivery);
            setBranchModalOpen(true);
            return;
        }

        // Validação de Token de Segurança na ENTREGA (shipped -> delivered)
        if (delivery.status === 'shipped' && nextStatus === 'delivered') {
            const enteredToken = tokenInputs[delivery.id] || '';
            setUpdatingId(delivery.id);
            try {
                const { data: isValid, error: tokenError } = await supabase.rpc('verify_delivery_token', {
                    p_delivery_id: delivery.id,
                    p_token: enteredToken
                });

                if (tokenError) throw tokenError;
                if (!isValid) {
                    alert('Token de segurança inválido! Solicite o código ao cliente no ato da entrega.');
                    return;
                }
                
                queryClient.invalidateQueries({ queryKey: ['deliveries'] });
                console.log("Entrega confirmada via token!");
                return;
            } catch (err: any) {
                alert(`Erro na validação: ${err.message}`);
                return;
            } finally {
                setUpdatingId(null);
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
            
            // Se o status final da entrega foi atingido, marcamos o pedido como concluído
            // para que ele apareça no Histórico.
            if (nextStatus === 'confirmed' && delivery.booking_id) {
                const { error: bookingError } = await supabase
                    .from('bookings')
                    .update({ status: 'completed' })
                    .eq('id', delivery.booking_id);
                
                if (bookingError) console.error('Erro ao finalizar pedido:', bookingError);
            }
            
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
            'delivered': 'Entregue (Aguardando Conferência)',
            'confirmed': 'Recebido e Conferido',
            'cancelled': 'Cancelado'
        };
        return labels[status] || status;
    };

    const getNextActionLabel = (status: string) => {
        const actions: any = {
            'pending': 'Confirmar Recebimento',
            'picking': 'Finalizar Separação',
            'ready': 'Despachar Equipamento',
            'shipped': 'Confirmar Entrega (Token)',
            'delivered': 'Conferir e Aceitar'
        };
        return actions[status];
    };

    const [activeSubTab, setActiveSubTab] = useState<'deliveries' | 'reverse' | 'transfers' | 'availability'>('deliveries');

    const renderOperationalConsole = (delivery: any) => {
        const fulfillmentId = delivery.fulfilling_company_id || delivery.origin_branch_id;
        const isFulfiller = isBranchManager 
            ? delivery.origin_branch_id === branchId 
            : (fulfillmentId === tenantId || (!fulfillmentId && delivery.booking?.company_id === tenantId));
        
        const isSender = tenantId && delivery.booking?.company_id === tenantId;
        const isRenter = tenantId && (delivery.booking?.renter?.company_id === tenantId || delivery.booking?.renter_id === user?.id);
        const isMaster = user?.role === 'admin'; 

        // O token SÓ aparece para o Locatário (quem recebe). 
        // Nunca para quem está enviando (Fulfiller).
        const canSeeToken = isRenter && !isFulfiller;

        return (
            <div className="h-full bg-zinc-950/80 rounded-[32px] p-8 sm:p-10 border border-white/5 flex flex-col justify-between gap-10 backdrop-blur-3xl relative overflow-hidden shadow-2xl min-h-[440px]">
                <div className="space-y-8 relative z-10">
                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Fluxo Operacional</span>
                        </div>
                        <Navigation className="h-5 w-5 text-zinc-800" />
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">Próxima etapa</p>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                    {delivery.status === 'pending' && <ShoppingBag className="h-6 w-6 text-emerald-500" />}
                                    {delivery.status === 'picking' && <Search className="h-6 w-6 text-emerald-500" />}
                                    {delivery.status === 'ready' && <Package className="h-6 w-6 text-emerald-500" />}
                                    {delivery.status === 'shipped' && <Truck className="h-6 w-6 text-emerald-500" />}
                                    {delivery.status === 'delivered' && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
                                </div>
                                <h4 className="text-2xl font-black uppercase tracking-tight text-white">{getNextActionLabel(delivery.status)}</h4>
                            </div>
                        </div>

                        <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                            {delivery.status === 'pending' && 'Pedido aguardando confirmação da unidade de origem.'}
                            {delivery.status === 'picking' && 'Itens em processo de separação e conferência técnica.'}
                            {delivery.status === 'ready' && 'Equipamento pronto para coleta ou despacho imediato.'}
                            {delivery.status === 'shipped' && 'Carga em trânsito. Acompanhe o tempo real de entrega.'}
                            {delivery.status === 'delivered' && 'Aguardando aceite final do locatário após conferência.'}
                        </p>
                    </div>
                </div>

                <div className="space-y-4 relative z-10">
                    {/* Token Visibility for Renter / Master */}
                    {canSeeToken && (delivery.status === 'shipped' || delivery.status === 'ready') && (
                        <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl text-center mb-4">
                            <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-1">Token de Segurança</p>
                            <div className="text-2xl font-black text-white tracking-[0.3em]">{delivery.delivery_secrets?.[0]?.token || '----'}</div>
                            <p className="text-[9px] text-zinc-500 font-medium mt-1">Forneça este código ao motorista para confirmar o recebimento.</p>
                        </div>
                    )}

                    {isFulfiller ? (
                        <div className="space-y-4">
                            {/* Token Input for Fulfiller during Delivery Confirmation */}
                            {delivery.status === 'shipped' && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">Validar Token de Entrega</p>
                                    <Input 
                                        placeholder="0000"
                                        maxLength={4}
                                        value={tokenInputs[delivery.id] || ''}
                                        onChange={(e) => setTokenInputs(prev => ({ ...prev, [delivery.id]: e.target.value }))}
                                        className="h-14 bg-black border-zinc-800 text-center text-xl font-black tracking-[0.5em] rounded-2xl focus:ring-primary/50"
                                    />
                                </div>
                            )}

                            {/* Serial Number Input during Separation */}
                            {delivery.status === 'picking' && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">Vincular Serial</p>
                                    <Input 
                                        placeholder="Número de série do item..."
                                        value={serialNumbers[delivery.id] || ''}
                                        onChange={(e) => setSerialNumbers(prev => ({ ...prev, [delivery.id]: e.target.value }))}
                                        className="h-14 bg-black border-zinc-800 text-sm font-bold rounded-2xl"
                                    />
                                </div>
                            )}

                            <Button 
                                onClick={() => handleNextStatus(delivery)}
                                disabled={updatingId === delivery.id || (delivery.status === 'shipped' && (tokenInputs[delivery.id]?.length || 0) < 4)}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs tracking-widest h-16 rounded-2xl shadow-[0_20px_40px_rgba(16,185,129,0.2)] transition-all duration-500 group/btn"
                            >
                                {updatingId === delivery.id ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <div className="flex items-center gap-3">
                                        {getNextActionLabel(delivery.status)} <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                                    </div>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="p-6 bg-zinc-900/40 rounded-2xl border border-white/5 text-center">
                            <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mb-1">Status: {getStatusLabel(delivery.status)}</p>
                            <p className="text-[11px] text-zinc-500 font-medium">
                                {isRenter ? 'Acompanhe o progresso do seu pedido acima.' : 'Apenas a unidade responsável pode transitar este status.'}
                            </p>
                        </div>
                    )}
                </div>
                
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px]" />
            </div>
        );
    };

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
                    {fetchError instanceof Error ? fetchError.message : (fetchError as any)?.message || 'Erro desconhecido'}
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
                    <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Logística</h2>
                    <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-xs">Hub de Operações em Tempo Real</p>
                </div>

                <div className="flex overflow-x-auto no-scrollbar bg-zinc-950/60 p-1.5 rounded-[20px] border border-white/5 backdrop-blur-xl max-w-full">
                    {[
                        { id: 'deliveries', label: 'Expedição' },
                        { id: 'reverse', label: 'Fluxo de Retorno' }
                    ].map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id as any)}
                            className={cn(
                                "px-6 md:px-8 py-2.5 rounded-[14px] text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap",
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
            {activeSubTab === 'deliveries' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex bg-black/60 p-1.5 rounded-[24px] border border-white/5 backdrop-blur-3xl w-full md:w-fit shadow-2xl">
                        <button
                            onClick={() => setLogisticsMode('to_send')}
                            className={cn(
                                "flex-1 md:flex-none px-6 md:px-10 py-3.5 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-700 whitespace-nowrap",
                                logisticsMode === 'to_send' 
                                    ? "bg-zinc-800 text-white shadow-xl" 
                                    : "text-zinc-600 hover:text-zinc-400"
                            )}
                        >
                            <div className="flex items-center justify-center gap-3">
                                <ShoppingBag className={cn("h-4 w-4", logisticsMode === 'to_send' ? "text-emerald-500" : "text-zinc-700")} />
                                A ENVIAR ({toSendDeliveries?.length || 0})
                            </div>
                        </button>
                        <button
                            onClick={() => setLogisticsMode('to_receive')}
                            className={cn(
                                "flex-1 md:flex-none px-6 md:px-10 py-3.5 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-700 whitespace-nowrap",
                                logisticsMode === 'to_receive' 
                                    ? "bg-zinc-800 text-white shadow-xl" 
                                    : "text-zinc-600 hover:text-zinc-400"
                            )}
                        >
                            <div className="flex items-center justify-center gap-3">
                                <Truck className={cn("h-4 w-4", logisticsMode === 'to_receive' ? "text-emerald-500" : "text-zinc-700")} />
                                A RECEBER ({toReceiveCount})
                            </div>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-10">
                        <AnimatePresence mode="popLayout">
                            {activeDeliveries?.length === 0 ? (
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
                                    <p className="text-zinc-700 text-xs mt-3 font-bold uppercase tracking-widest">Nenhum fluxo {logisticsMode === 'to_send' ? 'de saída' : 'de entrada'} detectado.</p>
                                </motion.div>
                            ) : (
                                <div className="space-y-10">
                                    {/* Renderizar Transferências em Entrada primeiro se estiver em modo 'to_receive' */}
                                    {logisticsMode === 'to_receive' && toReceiveTransfers.map((transfer: any) => (
                                        <motion.div
                                            key={transfer.id}
                                            layout
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="group"
                                        >
                                            <Card className="bg-zinc-950/40 border-emerald-500/10 rounded-[40px] overflow-hidden hover:border-emerald-500/20 transition-all duration-700 shadow-2xl backdrop-blur-3xl relative">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50" />
                                                <div className="p-8 sm:p-12">
                                                    <div className="flex flex-col lg:flex-row gap-12">
                                                        <div className="flex-1 space-y-8">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex gap-6">
                                                                    <div className="h-20 w-20 rounded-[28px] bg-black border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                                                        {transfer.equipment?.images?.[0] ? (
                                                                            <img src={transfer.equipment.images[0]} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <Package className="h-8 w-8 text-zinc-800" />
                                                                        )}
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center gap-3">
                                                                            <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] font-black uppercase tracking-widest px-3 py-1">Transferência de Suprimento</Badge>
                                                                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">TRF-{transfer.id.slice(0, 8).toUpperCase()}</span>
                                                                        </div>
                                                                        <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{transfer.equipment?.name}</h3>
                                                                        <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                                                            <MapPin className="h-3 w-3" /> ORIGEM: <span className="text-zinc-300">{transfer.source_branch?.name || 'Aguardando Liberação'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-[9px] font-black uppercase text-zinc-700 tracking-[0.4em] block mb-1">Status</span>
                                                                    <Badge variant="outline" className="bg-zinc-900 text-zinc-400 border-white/5 font-black uppercase text-[10px] px-4 py-1.5">{transfer.status}</Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="w-full lg:w-[340px] bg-zinc-950/60 rounded-[32px] p-8 border border-white/5 flex flex-col items-center justify-center text-center gap-4">
                                                            <Truck className="h-8 w-8 text-emerald-500/20 mb-2" />
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Fluxo Interno de Reposição</p>
                                                            <p className="text-[11px] text-zinc-400 font-medium">Este item está sendo movimentado entre suas unidades.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}

                                    {activeDeliveries?.map((delivery: any) => (
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
                                                
                                                <div className="p-6 sm:p-12">
                                                    <div className="flex flex-col lg:flex-row gap-10">
                                                        {/* Coluna Principal */}
                                                        <div className="flex-1 space-y-8">
                                                            {/* Header Compacto (Estilo App) */}
                                                            <div className="flex items-start gap-5">
                                                                <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-[28px] bg-black border border-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl group-hover:border-primary/20 transition-all duration-700">
                                                                    {delivery.booking?.equipment?.images?.[0] ? (
                                                                        <img src={delivery.booking.equipment.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                                                    ) : (
                                                                        <Package className="h-10 w-10 text-zinc-800" />
                                                                    )}
                                                                </div>
                                                                
                                                                <div className="flex-1 space-y-2 pt-1">
                                                                    <div className="flex items-center gap-3">
                                                                        <Badge variant="outline" className="text-[10px] uppercase font-black bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-2 py-0.5 tracking-widest">
                                                                            ORD-{delivery.booking_id.slice(0, 8).toUpperCase()}
                                                                        </Badge>
                                                                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-1.5">
                                                                            <Clock className="h-3 w-3" /> {format(new Date(delivery.created_at), "dd/MM HH:mm")}
                                                                        </span>
                                                                    </div>
                                                                    <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight">
                                                                        {delivery.booking?.equipment?.name || 'Equipamento'}
                                                                    </h3>
                                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                                        <div className="flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1 rounded-full border border-white/5">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Cliente</span>
                                                                        </div>
                                                                        {delivery.fulfilling_company_id !== tenantId && (
                                                                            <div className="flex items-center gap-1.5 bg-amber-500/5 px-3 py-1 rounded-full border border-amber-500/10">
                                                                                <Truck className="h-3 w-3 text-amber-500/50" />
                                                                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500/80">Terceirizado</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Localizações - Pills */}
                                                            <div className="space-y-2.5">
                                                                <div className="flex items-center gap-3 bg-black/40 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                                                    <MapPin className="h-4 w-4 text-zinc-600" />
                                                                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400">
                                                                        {delivery.origin_branch?.name || 'HUB CENTRAL'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-3 bg-black/40 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                                                    <RotateCcw className="h-4 w-4 text-emerald-500/50" />
                                                                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-500/80">
                                                                        RETORNO: {delivery.booking?.renter?.company?.address_city || 'AV. IPIRANGA, 1097'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Status Logístico Principal */}
                                                            <div className="space-y-4">
                                                                <div className="flex flex-col gap-2">
                                                                    <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">Status Logístico</p>
                                                                    <div className="w-fit bg-emerald-500/5 border border-emerald-500/20 px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.05)] flex items-center gap-3 group/status">
                                                                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                                                                        <span className="text-xs font-black uppercase tracking-[0.1em] text-emerald-500">{getStatusLabel(delivery.status)}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-[10px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-4">
                                                                    <span>Volume: <span className="text-zinc-400 ml-1">{delivery.quantity || 1} UN</span></span>
                                                                    {delivery.fulfillment_type === 'subrental' && (
                                                                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[8px] font-black uppercase">Sub-locação</Badge>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Fluxo Operacional (Mobile) */}
                                                            <div className="lg:hidden">
                                                                {renderOperationalConsole(delivery)}
                                                            </div>

                                                            {/* Linha do Tempo (Vertical) */}
                                                            <div className="space-y-8">
                                                                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                                                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-500">Linha do Tempo</h4>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-[9px] font-black uppercase text-zinc-700">Exibir detalhes</span>
                                                                        <div className="w-8 h-4 bg-emerald-500 rounded-full relative">
                                                                            <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-900">
                                                                    {[
                                                                        { id: 'pending', label: 'RECEBIDO', time: '08/05 · 14:35', icon: ShoppingBag, desc: 'Pedido recebido no Hub Central.' },
                                                                        { id: 'picking', label: 'CONFERIDO', time: '08/05 · 14:45', icon: Search, desc: 'Itens conferidos e aprovados.' },
                                                                        { id: 'ready', label: 'SEPARAÇÃO', time: '08/05 · 15:00', icon: Package, desc: 'Itens separados e aguardando coleta.' },
                                                                        { id: 'shipped', label: 'EM TRÂNSITO', time: '--', icon: Truck, desc: 'Aguardando coleta pela transportadora.' },
                                                                        { id: 'delivered', label: 'ENTREGA', time: '--', icon: MapPin, desc: 'Previsão de entrega disponível em breve.' },
                                                                    ].map((step, idx) => {
                                                                        const statuses = ['pending', 'picking', 'ready', 'shipped', 'delivered', 'confirmed'];
                                                                        const currentIdx = statuses.indexOf(delivery.status);
                                                                        const stepIdx = statuses.indexOf(step.id);
                                                                        const isCompleted = stepIdx < currentIdx || delivery.status === 'confirmed';
                                                                        const isActive = step.id === delivery.status;

                                                                        return (
                                                                            <div key={step.id} className="flex gap-6 relative z-10 group/step">
                                                                                <div className={cn(
                                                                                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
                                                                                    isCompleted ? "bg-emerald-500 text-black" : 
                                                                                    isActive ? "bg-zinc-800 text-emerald-500 border-2 border-emerald-500/30 ring-4 ring-emerald-500/5" : 
                                                                                    "bg-zinc-950 text-zinc-800 border border-white/5"
                                                                                )}>
                                                                                    <step.icon className="h-4 w-4" />
                                                                                    {isCompleted && (
                                                                                        <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 border-2 border-black">
                                                                                            <CheckCircle2 className="h-2 w-2 text-emerald-600" />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="space-y-1.5 py-1">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <p className={cn("text-[11px] font-black uppercase tracking-widest", isCompleted || isActive ? "text-zinc-100" : "text-zinc-700")}>{step.label}</p>
                                                                                        <p className="text-[9px] font-bold text-zinc-600">{step.time}</p>
                                                                                    </div>
                                                                                    <p className="text-[10px] text-zinc-500 font-medium leading-relaxed max-w-xs">{step.desc}</p>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Sidebar / Operational Console (Desktop) */}
                                                        <div className="hidden lg:block w-[400px] shrink-0">
                                                            <div className="sticky top-12 space-y-8">
                                                                {delivery.status !== 'confirmed' ? (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, x: 20 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                    >
                                                                        {renderOperationalConsole(delivery)}
                                                                    </motion.div>
                                                                ) : (
                                                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 text-center">
                                                                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Fluxo Concluído</p>
                                                                    </div>
                                                                )}

                                                                <div className="grid grid-cols-3 gap-3">
                                                                    {[
                                                                        { label: 'Previsão de envio', val: '09/05/2024', sub: 'Até 12:00', icon: ShoppingBag },
                                                                        { label: 'Transportadora', val: 'Total Express', sub: 'Rodoviário', icon: Truck },
                                                                        { label: 'Código de rastreio', val: 'Aguardando', sub: 'Disponível em breve', icon: Hash },
                                                                    ].map((info, i) => (
                                                                        <div key={i} className="bg-white/5 rounded-2xl p-4 text-center space-y-2 border border-white/5">
                                                                            <info.icon className="h-4 w-4 mx-auto text-zinc-700" />
                                                                            <div className="space-y-0.5">
                                                                                <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">{info.label}</p>
                                                                                <p className="text-[9px] font-black text-zinc-100 uppercase">{info.val}</p>
                                                                                <p className="text-[7px] font-bold text-zinc-700 uppercase">{info.sub}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                <div className="flex items-center justify-between pt-8 border-t border-white/5 relative z-10">
                                                                    {[
                                                                        { label: 'Localização', icon: MapPin },
                                                                        { label: 'Contato Hub', icon: PhoneCall },
                                                                        { label: 'Mais Ações', icon: MoreHorizontal },
                                                                    ].map((btn, i) => (
                                                                        <button key={i} className="flex flex-col items-center gap-2 group/action">
                                                                            <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover/action:bg-primary/20 transition-all">
                                                                                <btn.icon className="h-4 w-4 text-zinc-600 group-hover/action:text-primary transition-colors" />
                                                                            </div>
                                                                            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">{btn.label}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {activeSubTab === 'reverse' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-indigo-500/5 p-6 rounded-[32px] border border-indigo-500/10 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                                <RotateCcw className="h-7 w-7 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter">Reverse Hub</h3>
                                <p className="text-[10px] text-indigo-400/60 font-bold uppercase tracking-[0.2em]">Monitoramento de Devoluções e Reentrada</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase text-indigo-500/40 tracking-widest">Coletas Pendentes</p>
                                <p className="text-2xl font-black text-indigo-400">
                                    {deliveries?.filter(d => d.reverse_logistics_status === 'requested').length || 0}
                                </p>
                            </div>
                            <div className="w-[1px] h-10 bg-indigo-500/10" />
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase text-indigo-500/40 tracking-widest">Em Triagem Técnica</p>
                                <p className="text-2xl font-black text-indigo-400">
                                    {deliveries?.filter(d => d.reverse_logistics_status === 'returned').length || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-10">
                        {deliveries?.filter(d => d.reverse_logistics_status !== 'not_started').length === 0 ? (
                            <div className="bg-zinc-950/20 border border-dashed border-white/5 rounded-[40px] p-32 text-center backdrop-blur-md">
                                <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.4em]">Nenhum fluxo de retorno em andamento</p>
                            </div>
                        ) : (
                            deliveries?.filter(d => d.reverse_logistics_status !== 'not_started').map(delivery => (
                                <motion.div key={`rev-${delivery.id}`} layout className="group">
                                    <Card className="bg-zinc-950/40 border-indigo-500/10 rounded-[40px] overflow-hidden hover:border-indigo-500/30 transition-all duration-700 shadow-2xl relative">
                                        <div className="absolute top-0 right-0 p-8">
                                            <Badge className="bg-indigo-500 text-black font-black uppercase text-[10px] tracking-widest px-4 py-1.5 rounded-full shadow-lg shadow-indigo-500/20">REVERSA</Badge>
                                        </div>
                                        <div className="p-12 flex flex-col lg:flex-row gap-12">
                                            <div className="flex-1 space-y-8">
                                                <div className="flex gap-8">
                                                    <div className="h-24 w-24 rounded-[32px] bg-black border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                                        {delivery.booking?.equipment?.images?.[0] ? (
                                                            <img src={delivery.booking.equipment.images[0]} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package className="h-10 w-10 text-zinc-800" />
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Fluxo de Devolução · TRF-REV-{delivery.id.slice(0,6).toUpperCase()}</p>
                                                        <h4 className="text-3xl font-black uppercase tracking-tighter text-white">{delivery.booking?.equipment?.name}</h4>
                                                        <div className="flex items-center gap-4 pt-2">
                                                            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                                                <MapPin className="h-3.5 w-3.5 text-indigo-500" /> DE: <span className="text-zinc-300">{delivery.booking?.renter?.company?.city || 'Cliente'}</span>
                                                            </div>
                                                            <ArrowRight className="h-3 w-3 text-zinc-700" />
                                                            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                                                <Building2 className="h-3.5 w-3.5 text-indigo-500" /> PARA: <span className="text-zinc-300">{delivery.reverse_logistics_address?.split(',')[0] || 'Base Original'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pt-6">
                                                    <div className="flex justify-between mb-4">
                                                        {['Solicitado', 'Em Coleta', 'Em Trânsito', 'Triagem', 'Concluído'].map((step, i) => {
                                                            const statusIdx = ['requested', 'collecting', 'in_transit', 'returned', 'completed'].indexOf(delivery.reverse_logistics_status);
                                                            const isActive = i <= statusIdx;
                                                            return (
                                                                <div key={step} className="flex flex-col items-center gap-2">
                                                                    <div className={cn(
                                                                        "h-2 w-2 rounded-full transition-all duration-500",
                                                                        isActive ? "bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.5)] scale-125" : "bg-zinc-800"
                                                                    )} />
                                                                    <span className={cn("text-[8px] font-black uppercase tracking-widest", isActive ? "text-indigo-400" : "text-zinc-700")}>{step}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${(['requested', 'collecting', 'in_transit', 'returned', 'completed'].indexOf(delivery.reverse_logistics_status) + 1) * 20}%` }}
                                                            className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="w-full lg:w-[320px] bg-zinc-950/60 rounded-[32px] p-8 border border-white/5 flex flex-col justify-between items-center text-center gap-6">
                                                <div className="space-y-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto border border-indigo-500/20">
                                                        {delivery.reverse_logistics_status === 'requested' ? <Clock className="h-6 w-6 text-indigo-400" /> : <ShieldAlert className="h-6 w-6 text-indigo-400" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">{delivery.reverse_logistics_status}</p>
                                                        <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                                                            {delivery.reverse_logistics_status === 'requested' ? 'Aguardando início da coleta no endereço do cliente.' : 'Item em processo de retorno e validação técnica.'}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {delivery.reverse_logistics_status === 'returned' && (
                                                    <div className="space-y-4 w-full">
                                                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                                                            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">Aguardando Conferência de Reentrada</p>
                                                            <p className="text-[11px] text-zinc-500">Valide o estado físico dos itens antes de liberar para o estoque.</p>
                                                        </div>
                                                        <Button 
                                                            onClick={async () => {
                                                                const { error } = await supabase
                                                                    .from('deliveries')
                                                                    .update({ reverse_logistics_status: 'completed' })
                                                                    .eq('id', delivery.id);
                                                                if (!error) queryClient.invalidateQueries({ queryKey: ['deliveries'] });
                                                            }}
                                                            className="w-full bg-white text-black font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl shadow-xl flex items-center gap-2"
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" /> Conferência OK - Guardar
                                                        </Button>
                                                    </div>
                                                )}

                                                {(() => {
                                                    const fulfillmentId = delivery.fulfilling_company_id || delivery.origin_branch_id;
                                                    const isFulfiller = isBranchManager 
                                                        ? delivery.origin_branch_id === branchId 
                                                        : (fulfillmentId === tenantId || (!fulfillmentId && delivery.booking?.company_id === tenantId));
                                                    
                                                    if (isFulfiller) {
                                                        return (
                                                            <div className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
                                                                Token de Coleta: <span className="text-white font-black">{delivery.reverse_token}</span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            )}
            {activeSubTab === 'availability' && (
                <InventoryStatusReport companyId={tenantId} />
            )}

            {activeSubTab === 'transfers' && (
                <InternalTransfersSection />
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
