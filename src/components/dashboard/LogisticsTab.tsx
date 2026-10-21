import { useState, useEffect } from 'react';
import { friendlyError } from '@/lib/errors';
import { toast } from 'sonner';
import { Package, Truck, Clock, MapPin, CheckCircle2, ShoppingBag, ArrowRight, Loader2, Phone, User, Hash, ShieldAlert, Navigation, RotateCcw, Building2, Eye, Info, Weight, Boxes, Ruler, MoreHorizontal, PhoneCall, History, Search, Filter, AlertCircle, ChevronRight, Gauge } from 'lucide-react';
import { PaginationBar } from '@/components/ui/pagination-bar';
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
import { DriverTrackingModal } from './DriverTrackingModal';
import { confirmAction } from '@/components/ui/confirm-dialog';

/**
 * Logística das entregas. Com `bookingId`, roda em modo embutido dentro do detalhe
 * do pedido: só a entrega desse pedido, sem cabeçalho, abas, transferências ou relatórios.
 */
export function LogisticsTab({ tenantId, bookingId }: { tenantId: string; bookingId?: string }) {
    const embedded = !!bookingId;
    const { user } = useAuth();
    const { isBranchManager, branchId } = useTenant();
    const { branches } = useBranches();
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [branchModalOpen, setBranchModalOpen] = useState(false);
    const [pendingDelivery, setPendingDelivery] = useState<any>(null);
    const [trackingDelivery, setTrackingDelivery] = useState<any>(null);
    const queryClient = useQueryClient();
    const { data: deliveries, isLoading, error: fetchError } = useDeliveries(
        embedded
            ? { bookingId }
            : { tenantId, branchId: isBranchManager ? branchId : undefined }
    );
    const updateMutation = useUpdateDeliveryStatus();
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [serialNumbers, setSerialNumbers] = useState<Record<string, string>>({});
    const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({});
    const [logisticsMode, setLogisticsMode] = useState<'to_send' | 'to_receive'>('to_send');
    const { transfers } = useTransfers();
    const isMaster = user?.role === 'admin';

    // Lógica de separação dos pedidos
    const toSendDeliveries = deliveries?.filter((d: any) => {
        // 1. Master/Admin: Vê tudo em "A Enviar" para observar a malha, mas não age
        if (isMaster) return d.status !== 'confirmed' && d.status !== 'cancelled';

        const fulfillmentId = d.fulfilling_company_id || d.origin_branch_id;
        
        // 2. Gerente de Filial: Vê o que sai da sua unidade
        if (isBranchManager) return d.origin_branch_id === branchId && d.status !== 'confirmed' && d.status !== 'cancelled';
        
        // 3. Empresa Fulfiller (Sub-locadora ou Dono do Equipamento): Vê o que ela mesma deve enviar
        if (tenantId && d.fulfilling_company_id === tenantId) return d.status !== 'confirmed' && d.status !== 'cancelled';
        
        // 4. Dono do Equipamento (se não for explicitamente o fulfiller ainda, mas o pedido é para ele)
        const renterCompanyId = d.booking?.renter?.company_id || d.booking?.renter?.company?.id;
        const isRenter = d.booking?.renter_id === user?.id || (tenantId && renterCompanyId === tenantId);
        
        if (tenantId && d.booking?.company_id === tenantId && !isRenter) return d.status !== 'confirmed' && d.status !== 'cancelled';
        
        return false;
    });

    const toReceiveDeliveries = deliveries?.filter((d: any) => {
        // Master não duplica visualização em "A Receber", observa toda a malha por "A Enviar"
        if (isMaster) return false;

        // 1. Identificar se sou o locatário (quem deve receber o item)
        const renterCompanyId = d.booking?.renter?.company_id || d.booking?.renter?.company?.id;
        const isRenter = d.booking?.renter_id === user?.id || (tenantId && renterCompanyId === tenantId);
        
        // 2. Identificar se sou o Fulfiller (evitar duplicação)
        const fulfillmentId = d.fulfilling_company_id || d.origin_branch_id;
        const isFulfiller = isBranchManager 
            ? d.origin_branch_id === branchId 
            : (tenantId && d.fulfilling_company_id === tenantId) || (tenantId && d.booking?.company_id === tenantId && !isRenter);

        // Se este pedido já está na minha aba "A Enviar" (seja por ser fulfiller, master ou branch manager), NUNCA deve aparecer em "A Receber"
        const alreadyInSendTab = toSendDeliveries?.some(sendItem => sendItem.id === d.id);
        if (isFulfiller || alreadyInSendTab) return false;

        // 3. Aparece em "A Receber" se eu for o locatário e o pedido estiver ativo
        return isRenter && d.status !== 'confirmed' && d.status !== 'cancelled';
    }) || [];

    // Incluir transferências internas em entrada
    const toReceiveTransfers = transfers?.filter(t => 
        (isBranchManager ? t.requester_branch_id === branchId : true) && 
        t.status !== 'completed' && t.status !== 'rejected' && t.status !== 'pending_master'
    ) || [];

    const toReceiveCount = toReceiveDeliveries.length + toReceiveTransfers.length;

    // Embutido: quem só alugou (não é a locadora que envia) vê a entrega pelo lado de "receber"
    const embeddedAsRenter = embedded && !!deliveries?.[0]
        && deliveries[0].booking?.renter_id === user?.id
        && deliveries[0].booking?.company_id !== tenantId
        && deliveries[0].fulfilling_company_id !== tenantId;
    useEffect(() => {
        if (embedded) setLogisticsMode(embeddedAsRenter ? 'to_receive' : 'to_send');
    }, [embedded, embeddedAsRenter]);

    const activeDeliveries = embedded
        ? (deliveries || []).filter((d: any) => d.status !== 'cancelled')
        : logisticsMode === 'to_send' ? toSendDeliveries : toReceiveDeliveries;

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
                toast.error(`Erro ao aceitar: ${friendlyError(error)}`);
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
                    toast.error('Token de segurança inválido! Solicite o código ao cliente no ato da entrega.');
                    return;
                }
                
                queryClient.invalidateQueries({ queryKey: ['deliveries'] });
                console.log("Entrega confirmada via token!");
                return;
            } catch (err: any) {
                toast.error(`Erro na validação: ${friendlyError(err)}`);
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

            // Ao marcar "Enviado", abre o mapa e começa a compartilhar o GPS com o cliente
            if (nextStatus === 'shipped') setTrackingDelivery(delivery);
            
            // Quando a entrega é confirmada (item chegou ao cliente), marca o pedido como ativo.
            // O pedido só será 'completed' quando o item for devolvido e conferido.
            if (nextStatus === 'confirmed' && delivery.booking_id) {
                const { error: bookingError } = await supabase
                    .from('bookings')
                    .update({ status: 'active' })
                    .eq('id', delivery.booking_id);

                if (bookingError) console.error('Erro ao ativar pedido:', bookingError);
            }
            
            console.log("Logística atualizada com sucesso!");
        } catch (error: any) {
            console.error('Erro na logística:', error);
            toast.error(`Erro ao atualizar logística: ${friendlyError(error)}`);
        } finally {
            setUpdatingId(null);
            setSelectedBranchId(null);
            setPendingDelivery(null);
        }
    };

    const handleDeleteBooking = async (bookingId: string) => {
        const ok = await confirmAction({
            title: 'Excluir este pedido?',
            description: 'O pedido e todas as entregas ligadas a ele serão apagados. Isso não pode ser desfeito.',
            confirmLabel: 'Excluir pedido',
            destructive: true,
        });
        if (!ok) return;
        
        setUpdatingId(`del-${bookingId}`);
        try {
            const { error } = await supabase.rpc('admin_delete_booking', {
                p_booking_id: bookingId
            });

            if (error) throw error;
            
            queryClient.invalidateQueries({ queryKey: ['deliveries'] });
            toast.success('Pedido excluído com sucesso!');
        } catch (error: any) {
            console.error('Erro ao excluir:', error);
            toast.error(`Erro ao excluir: ${friendlyError(error)}`);
        } finally {
            setUpdatingId(null);
        }
    };

    const confirmBranchSelection = async () => {
        if (!selectedBranchId) {
            toast.error('Por favor, selecione uma unidade de origem.');
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
    const [deliveryPage, setDeliveryPage] = useState(0);
    const DELIVERY_PAGE_SIZE = 5;

    // Reset paginação ao mudar de modo (enviar/receber)
    useEffect(() => { setDeliveryPage(0); }, [logisticsMode]);

    const renderOperationalConsole = (delivery: any) => {
        const fulfillmentId = delivery.fulfilling_company_id || delivery.origin_branch_id;
        const isFulfiller = isBranchManager 
            ? delivery.origin_branch_id === branchId 
            : (fulfillmentId === tenantId || (!fulfillmentId && delivery.booking?.company_id === tenantId));
        
        const isRenter = delivery.booking?.renter_id === user?.id || (tenantId && delivery.booking?.renter?.company_id === tenantId);
        const isMaster = user?.role === 'admin'; 

        // O token SÓ aparece se o usuário for o locatário (locador solicitante) E estiver na aba "A RECEBER".
        // A conta Master NÃO deve ver o token (somente gerado/visível para o locatário).
        const canSeeToken = isRenter && logisticsMode === 'to_receive' && !isMaster;

        return (
            <div className="h-full bg-zinc-950/80 rounded-2xl p-8 sm:p-8 border border-white/5 flex flex-col justify-between gap-10 backdrop-blur-3xl relative overflow-hidden shadow-2xl min-h-[440px]">
                <div className="space-y-8 relative z-10">
                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-xs font-semibold text-zinc-400">Fluxo Operacional</span>
                        </div>
                        <Navigation className="h-5 w-5 text-zinc-800" />
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <p className="text-[11px] font-semibold text-zinc-400 ">Próxima etapa</p>
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
                            <p className="text-[11px] font-semibold text-primary mb-1">Token de Segurança</p>
                            <div className="text-2xl font-black text-white tracking-wider">{delivery.delivery_token || delivery.delivery_secrets?.[0]?.token || '----'}</div>
                            <p className="text-[11px] text-zinc-500 font-medium mt-1">Forneça este código ao motorista para confirmar o recebimento.</p>
                        </div>
                    )}

                    {/* Ações operacionais: Apenas para Fulfiller ou Locatário (na etapa final) e NUNCA para Master Observador */}
                    {(isFulfiller || (isRenter && delivery.status === 'delivered')) && !isMaster ? (
                        <div className="space-y-4">
                            {delivery.status === 'shipped' && isFulfiller && (
                                <Button
                                    variant="outline"
                                    onClick={() => setTrackingDelivery(delivery)}
                                    className="w-full h-14 rounded-2xl border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 font-semibold text-xs gap-2"
                                >
                                    <Navigation className="h-4 w-4" /> Abrir Mapa da Entrega
                                </Button>
                            )}

                            {/* Token Input for Fulfiller during Delivery Confirmation */}
                            {delivery.status === 'shipped' && isFulfiller && (
                                <div className="space-y-2">
                                    <p className="text-[11px] font-semibold text-zinc-400 ">Validar Token de Entrega</p>
                                    <Input 
                                        placeholder="0000"
                                        maxLength={4}
                                        value={tokenInputs[delivery.id] || ''}
                                        onChange={(e) => setTokenInputs(prev => ({ ...prev, [delivery.id]: e.target.value }))}
                                        className="h-14 bg-black border-zinc-800 text-center text-xl font-black tracking-wider rounded-2xl focus:ring-primary/50"
                                    />
                                </div>
                            )}

                            {/* Serial Number Input during Separation */}
                            {delivery.status === 'picking' && isFulfiller && (
                                <div className="space-y-2">
                                    <p className="text-[11px] font-semibold text-zinc-400 ">Vincular Serial</p>
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
                                disabled={updatingId === delivery.id || (isFulfiller && delivery.status === 'shipped' && (tokenInputs[delivery.id]?.length || 0) < 4)}
                                className={cn(
                                    "w-full font-black uppercase text-xs tracking-widest h-16 rounded-2xl shadow-xl transition-all duration-500 group/btn",
                                    isRenter && delivery.status === 'delivered' ? "bg-primary text-white hover:bg-primary/90" : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                                )}
                            >
                                {updatingId === delivery.id ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <div className="flex items-center gap-3">
                                        {isRenter && delivery.status === 'delivered' ? 'Confirmar e Aceitar Item' : getNextActionLabel(delivery.status)} 
                                        <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                                    </div>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="p-6 bg-zinc-900/40 rounded-2xl border border-white/5 text-center">
                            <p className="text-[11px] font-semibold text-zinc-400 mb-1">Status: {getStatusLabel(delivery.status)}</p>
                            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                                {isMaster ? 'Modo observador: você acompanha esta entrega, mas não altera.' : 
                                 isRenter ? 'O locador está preparando seu equipamento. O token de segurança aparecerá aqui em breve.' : 
                                 'Apenas a unidade responsável pode transitar este status.'}
                            </p>
                        </div>
                    )}

                    {/* Botão de Exclusão Destrutiva para Super Usuários (Admins) */}
                    {isMaster && (
                        <Button 
                            variant="ghost"
                            onClick={() => handleDeleteBooking(delivery.booking_id)}
                            disabled={updatingId === `del-${delivery.booking_id}`}
                            className="w-full text-[11px] font-semibold text-red-500/40 hover:text-red-500 hover:bg-red-500/10 h-12 rounded-xl mt-4 border border-dashed border-red-500/10"
                        >
                            {updatingId === `del-${delivery.booking_id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "Excluir Pedido (Master Only)"
                            )}
                        </Button>
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
                <p className="text-zinc-500 font-medium text-xs">Carregando entregas...</p>
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
                    className="mt-6 border-zinc-800 text-[11px] font-semibold "
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['deliveries'] })}
                >
                    Tentar Novamente
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {!embedded && (
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-white/5">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Logística</h2>
                    <p className="text-zinc-500 font-bold text-xs">Entregas e devoluções em tempo real</p>
                </div>

                <div className="flex overflow-x-auto no-scrollbar bg-zinc-950/60 p-1.5 rounded-[20px] border border-white/5 backdrop-blur-xl max-w-full">
                    {[
                        { id: 'deliveries', label: 'Entregas' },
                        { id: 'reverse', label: 'Fluxo de Retorno' }
                    ].map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id as any)}
                            className={cn(
                                "px-6 md:px-8 py-2.5 rounded-[14px] text-[11px] md:text-xs font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap",
                                activeSubTab === tab.id 
                                    ? "bg-zinc-800 text-white shadow-2xl shadow-black/50" 
                                    : "text-zinc-400 hover:text-zinc-200"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>
            )}
            {activeSubTab === 'deliveries' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {!embedded && (
                    <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/5 backdrop-blur-3xl w-full md:w-fit shadow-2xl">
                        <button
                            onClick={() => setLogisticsMode('to_send')}
                            className={cn(
                                "flex-1 md:flex-none px-6 md:px-10 py-3.5 rounded-[18px] text-[11px] font-black uppercase tracking-wider transition-all duration-700 whitespace-nowrap",
                                logisticsMode === 'to_send' 
                                    ? "bg-zinc-800 text-white shadow-xl" 
                                    : "text-zinc-400 hover:text-zinc-200"
                            )}
                        >
                            <div className="flex items-center justify-center gap-3">
                                <ShoppingBag className={cn("h-4 w-4", logisticsMode === 'to_send' ? "text-emerald-500" : "text-zinc-500")} />
                                A ENVIAR ({toSendDeliveries?.length || 0})
                            </div>
                        </button>
                        <button
                            onClick={() => setLogisticsMode('to_receive')}
                            className={cn(
                                "flex-1 md:flex-none px-6 md:px-10 py-3.5 rounded-[18px] text-[11px] font-black uppercase tracking-wider transition-all duration-700 whitespace-nowrap",
                                logisticsMode === 'to_receive' 
                                    ? "bg-zinc-800 text-white shadow-xl" 
                                    : "text-zinc-400 hover:text-zinc-200"
                            )}
                        >
                            <div className="flex items-center justify-center gap-3">
                                <Truck className={cn("h-4 w-4", logisticsMode === 'to_receive' ? "text-emerald-500" : "text-zinc-500")} />
                                A RECEBER ({toReceiveCount})
                            </div>
                        </button>
                    </div>
                    )}

                    <div className="grid grid-cols-1 gap-10">
                        <AnimatePresence mode="popLayout">
                            {activeDeliveries?.length === 0 ? (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={cn("bg-zinc-950/20 border border-dashed border-white/5 rounded-[40px] text-center backdrop-blur-md", embedded ? "p-10" : "p-32")}
                                >
                                    <div className="relative inline-block mb-6">
                                        <div className="absolute inset-0 bg-zinc-800 blur-2xl rounded-full opacity-20" />
                                        <Truck className="h-16 w-16 text-zinc-800 relative z-10 mx-auto" />
                                    </div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter text-zinc-400">{embedded ? 'Entrega ainda não iniciada' : 'Nenhuma entrega agora'}</h3>
                                    <p className="text-zinc-500 text-xs mt-3 font-bold ">
                                        {embedded
                                            ? 'A logística começa quando a locadora aprovar o pedido.'
                                            : `Nenhum fluxo ${logisticsMode === 'to_send' ? 'de saída' : 'de entrada'} detectado.`}
                                    </p>
                                </motion.div>
                            ) : (
                                <div className="space-y-10">
                                    {/* Renderizar Transferências em Entrada primeiro se estiver em modo 'to_receive' */}
                                    {!embedded && logisticsMode === 'to_receive' && toReceiveTransfers.map((transfer: any) => (
                                        <motion.div
                                            key={transfer.id}
                                            layout
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="group"
                                        >
                                            <Card className="bg-zinc-950/40 border-emerald-500/10 rounded-2xl overflow-hidden hover:border-emerald-500/20 transition-all duration-700 shadow-2xl backdrop-blur-3xl relative">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50" />
                                                <div className="p-8 sm:p-8">
                                                    <div className="flex flex-col lg:flex-row gap-12">
                                                        <div className="flex-1 space-y-8">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex gap-6">
                                                                    <div className="h-20 w-20 rounded-2xl bg-black border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                                                        {transfer.equipment?.images?.[0] ? (
                                                                            <img src={transfer.equipment.images[0]} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <Package className="h-8 w-8 text-zinc-800" />
                                                                        )}
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center gap-3">
                                                                            <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[11px] font-semibold px-3 py-1">Transferência de Suprimento</Badge>
                                                                            <span className="text-[11px] font-semibold text-zinc-400 ">TRF-{transfer.id.slice(0, 8).toUpperCase()}</span>
                                                                        </div>
                                                                        <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{transfer.equipment?.name}</h3>
                                                                        <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-500 ">
                                                                            <MapPin className="h-3 w-3" /> ORIGEM: <span className="text-zinc-300">{transfer.source_branch?.name || 'Aguardando Liberação'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-[11px] font-semibold text-zinc-500 block mb-1">Status</span>
                                                                    <Badge variant="outline" className="bg-zinc-900 text-zinc-400 border-white/5 font-semibold text-[11px] px-4 py-1.5">{transfer.status}</Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="w-full lg:w-[340px] bg-zinc-950/60 rounded-2xl p-8 border border-white/5 flex flex-col items-center justify-center text-center gap-4">
                                                            <Truck className="h-8 w-8 text-emerald-500/20 mb-2" />
                                                            <p className="text-[11px] font-semibold text-zinc-500">Fluxo Interno de Reposição</p>
                                                            <p className="text-[11px] text-zinc-400 font-medium">Este item está sendo movimentado entre suas unidades.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}

                                    {activeDeliveries?.slice(deliveryPage * DELIVERY_PAGE_SIZE, (deliveryPage + 1) * DELIVERY_PAGE_SIZE).map((delivery: any) => (
                                        <motion.div
                                            key={delivery.id}
                                            layout
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="group"
                                        >
                                            <Card className="bg-zinc-950/40 border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all duration-700 shadow-[0_30px_100px_rgba(0,0,0,0.6)] backdrop-blur-3xl relative">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                                
                                                <div className="p-6 sm:p-8">
                                                    <div className="flex flex-col lg:flex-row gap-10">
                                                        {/* Coluna Principal */}
                                                        <div className="flex-1 space-y-8">
                                                            {/* Header Compacto (Estilo App) */}
                                                            <div className="flex items-start gap-5">
                                                                <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl bg-black border border-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl group-hover:border-primary/20 transition-all duration-700">
                                                                    {delivery.booking?.equipment?.images?.[0] ? (
                                                                        <img src={delivery.booking.equipment.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                                                    ) : (
                                                                        <Package className="h-10 w-10 text-zinc-800" />
                                                                    )}
                                                                </div>
                                                                
                                                                <div className="flex-1 space-y-2 pt-1">
                                                                    <div className="flex items-center gap-3">
                                                                        <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-2 py-0.5 ">
                                                                            ORD-{delivery.booking_id.slice(0, 8).toUpperCase()}
                                                                        </Badge>
                                                                        <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                                                                            <Clock className="h-3 w-3" /> {format(new Date(delivery.created_at), "dd/MM HH:mm")}
                                                                        </span>
                                                                    </div>
                                                                    <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight">
                                                                        {delivery.booking?.equipment?.name || 'Equipamento'}
                                                                    </h3>
                                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                                        <div className="flex items-center gap-1.5 bg-zinc-900/60 px-3 py-1 rounded-full border border-white/5">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                                                            <span className="text-[11px] font-semibold text-zinc-400">Cliente</span>
                                                                        </div>
                                                                        {delivery.fulfilling_company_id !== tenantId && (
                                                                            <div className="flex items-center gap-1.5 bg-amber-500/5 px-3 py-1 rounded-full border border-amber-500/10">
                                                                                <Truck className="h-3 w-3 text-amber-500/50" />
                                                                                <span className="text-[11px] font-semibold text-amber-500/80">Terceirizado</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Localizações - Pills */}
                                                            <div className="space-y-2.5">
                                                                <div className="flex items-center gap-3 bg-black/40 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                                                    <MapPin className="h-4 w-4 text-zinc-400" />
                                                                    <span className="text-[11px] font-semibold text-zinc-400">
                                                                        {delivery.origin_branch?.name || 'HUB CENTRAL'}
                                                                    </span>
                                                                </div>
                                                                {delivery.booking?.delivery_method === 'delivery' && delivery.booking?.delivery_address && (
                                                                    <div className="flex items-start gap-3 bg-primary/5 p-4 rounded-2xl border border-primary/20 hover:border-primary/30 transition-colors">
                                                                        <Truck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                                        <div className="space-y-0.5 min-w-0">
                                                                            <p className="text-[11px] font-semibold text-primary/70">Endereço de Entrega</p>
                                                                            <p className="text-[11px] font-bold text-zinc-300 leading-snug">{delivery.booking.delivery_address}</p>
                                                                            {delivery.booking?.delivery_contact && (
                                                                                <p className="text-[11px] text-zinc-500 font-bold ">
                                                                                    Responsável: {delivery.booking.delivery_contact}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-3 bg-black/40 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                                                    <RotateCcw className="h-4 w-4 text-emerald-500/50" />
                                                                    <span className="text-[11px] font-semibold text-emerald-500/80">
                                                                        RETORNO: {delivery.booking?.renter?.company?.address_city || 'AV. IPIRANGA, 1097'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Status Logístico Principal */}
                                                            <div className="space-y-4">
                                                                <div className="flex flex-col gap-2">
                                                                    <p className="text-[11px] font-semibold text-zinc-400 ">Status Logístico</p>
                                                                    <div className="w-fit bg-emerald-500/5 border border-emerald-500/20 px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.05)] flex items-center gap-3 group/status">
                                                                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                                                                        <span className="text-xs font-semibold text-emerald-500">{getStatusLabel(delivery.status)}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-[11px] font-semibold text-zinc-500 flex items-center gap-4">
                                                                    <span>Volume: <span className="text-zinc-400 ml-1">{delivery.quantity || 1} UN</span></span>
                                                                    {delivery.fulfillment_type === 'subrental' && (
                                                                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[11px] font-semibold ">Sub-locação</Badge>
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
                                                                    <h4 className="text-[11px] font-semibold text-zinc-500">Linha do Tempo</h4>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-[11px] font-semibold text-zinc-500">Exibir detalhes</span>
                                                                        <div className="w-8 h-4 bg-emerald-500 rounded-full relative">
                                                                            <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-900">
                                                                    {[
                                                                        { id: 'pending', label: 'RECEBIDO', icon: ShoppingBag, desc: 'Pedido recebido pela locadora.' },
                                                                        { id: 'picking', label: 'CONFERIDO', icon: Search, desc: 'Itens conferidos e aprovados.' },
                                                                        { id: 'ready', label: 'SEPARAÇÃO', icon: Package, desc: 'Itens separados e prontos para envio.' },
                                                                        { id: 'shipped', label: 'EM TRÂNSITO', icon: Truck, desc: 'Equipamento a caminho do cliente.' },
                                                                        {
                                                                            id: 'delivered', label: 'ENTREGA', icon: MapPin,
                                                                            desc: delivery.estimated_arrival
                                                                                ? `Previsão de chegada às ${format(new Date(delivery.estimated_arrival), 'HH:mm')}.`
                                                                                : 'Entrega confirmada com o token do cliente.',
                                                                        },
                                                                    ].map((step) => {
                                                                        const statuses = ['pending', 'picking', 'ready', 'shipped', 'delivered', 'confirmed'];
                                                                        const currentIdx = statuses.indexOf(delivery.status);
                                                                        const stepIdx = statuses.indexOf(step.id);
                                                                        const isCompleted = stepIdx < currentIdx || delivery.status === 'confirmed';
                                                                        const isActive = step.id === delivery.status;
                                                                        // Só há horário real da criação e da última mudança de status
                                                                        const time = step.id === 'pending'
                                                                            ? format(new Date(delivery.created_at), 'dd/MM · HH:mm')
                                                                            : isActive && delivery.updated_at
                                                                                ? format(new Date(delivery.updated_at), 'dd/MM · HH:mm')
                                                                                : '';

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
                                                                                        <p className={cn("text-[11px] font-black uppercase tracking-widest", isCompleted || isActive ? "text-zinc-100" : "text-zinc-500")}>{step.label}</p>
                                                                                        {time && <p className="text-[11px] font-bold text-zinc-400">{time}</p>}
                                                                                    </div>
                                                                                    <p className="text-[11px] text-zinc-500 font-medium leading-relaxed max-w-xs">{step.desc}</p>
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
                                                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
                                                                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                                                                        <p className="text-[11px] font-semibold text-emerald-500">Fluxo Concluído</p>
                                                                    </div>
                                                                )}

                                                                {/* Dados reais da entrega (antes eram valores fixos de exemplo) */}
                                                                <div className="grid grid-cols-3 gap-3">
                                                                    {[
                                                                        {
                                                                            label: 'Previsão',
                                                                            val: delivery.estimated_arrival ? format(new Date(delivery.estimated_arrival), 'HH:mm') : '—',
                                                                            sub: delivery.estimated_arrival ? format(new Date(delivery.estimated_arrival), 'dd/MM') : 'Após o envio',
                                                                            icon: Clock,
                                                                        },
                                                                        {
                                                                            label: 'Motorista',
                                                                            val: delivery.driver_name || 'A definir',
                                                                            sub: delivery.driver_phone || '—',
                                                                            icon: Truck,
                                                                        },
                                                                        {
                                                                            label: 'Nº de série',
                                                                            val: delivery.serial_number || '—',
                                                                            sub: delivery.serial_number ? 'Vinculado' : 'Na separação',
                                                                            icon: Hash,
                                                                        },
                                                                    ].map((info, i) => (
                                                                        <div key={i} className="bg-white/5 rounded-2xl p-4 text-center space-y-2 border border-white/5 min-w-0">
                                                                            <info.icon className="h-4 w-4 mx-auto text-zinc-400" />
                                                                            <div className="space-y-0.5">
                                                                                <p className="text-[11px] font-semibold text-zinc-500 ">{info.label}</p>
                                                                                <p className="text-[11px] font-semibold text-zinc-100 truncate">{info.val}</p>
                                                                                <p className="text-[11px] font-bold text-zinc-400 truncate">{info.sub}</p>
                                                                            </div>
                                                                        </div>
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

                        {(activeDeliveries?.length ?? 0) > DELIVERY_PAGE_SIZE && (
                            <PaginationBar
                                page={deliveryPage}
                                totalPages={Math.ceil((activeDeliveries?.length ?? 0) / DELIVERY_PAGE_SIZE)}
                                totalItems={activeDeliveries?.length ?? 0}
                                pageSize={DELIVERY_PAGE_SIZE}
                                onPageChange={setDeliveryPage}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* No detalhe do pedido a devolução fica no OrderReturnPanel */}
            {!embedded && activeSubTab === 'reverse' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-indigo-500/5 p-6 rounded-2xl border border-indigo-500/10 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                                <RotateCcw className="h-7 w-7 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter">Devoluções</h3>
                                <p className="text-[11px] text-indigo-400/60 font-bold ">Monitoramento de Devoluções e Reentrada</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-right">
                                <p className="text-[11px] font-semibold text-indigo-500/40 ">Coletas Pendentes</p>
                                <p className="text-2xl font-black text-indigo-400">
                                    {deliveries?.filter(d => d.reverse_logistics_status === 'requested').length || 0}
                                </p>
                            </div>
                            <div className="w-[1px] h-10 bg-indigo-500/10" />
                            <div className="text-right">
                                <p className="text-[11px] font-semibold text-indigo-500/40 ">Em Triagem Técnica</p>
                                <p className="text-2xl font-black text-indigo-400">
                                    {deliveries?.filter(d => d.reverse_logistics_status === 'returned').length || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-10">
                        {deliveries?.filter(d => d.reverse_logistics_status !== 'not_started').length === 0 ? (
                            <div className="bg-zinc-950/20 border border-dashed border-white/5 rounded-2xl p-32 text-center backdrop-blur-md">
                                <p className="text-zinc-500 text-[11px] font-semibold ">Nenhum fluxo de retorno em andamento</p>
                            </div>
                        ) : (
                            deliveries?.filter(d => d.reverse_logistics_status !== 'not_started').map(delivery => (
                                <motion.div key={`rev-${delivery.id}`} layout className="group">
                                    <Card className="bg-zinc-950/40 border-indigo-500/10 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all duration-700 shadow-2xl relative">
                                        <div className="absolute top-0 right-0 p-8">
                                            <Badge className="bg-indigo-500 text-black font-semibold text-[11px] px-4 py-1.5 rounded-full shadow-lg shadow-indigo-500/20">REVERSA</Badge>
                                        </div>
                                        <div className="p-6 flex flex-col lg:flex-row gap-12">
                                            <div className="flex-1 space-y-8">
                                                <div className="flex gap-8">
                                                    <div className="h-24 w-24 rounded-2xl bg-black border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                                        {delivery.booking?.equipment?.images?.[0] ? (
                                                            <img src={delivery.booking.equipment.images[0]} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package className="h-10 w-10 text-zinc-800" />
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-[11px] font-semibold text-indigo-500 ">Fluxo de Devolução · TRF-REV-{delivery.id.slice(0,6).toUpperCase()}</p>
                                                        <h4 className="text-3xl font-black uppercase tracking-tighter text-white">{delivery.booking?.equipment?.name}</h4>
                                                        <div className="flex items-center gap-4 pt-2">
                                                            <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-500 ">
                                                                <MapPin className="h-3.5 w-3.5 text-indigo-500" /> DE: <span className="text-zinc-300">{delivery.booking?.renter?.company?.city || 'Cliente'}</span>
                                                            </div>
                                                            <ArrowRight className="h-3 w-3 text-zinc-500" />
                                                            <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-500 ">
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
                                                                    <span className={cn("text-[11px] font-black uppercase tracking-widest", isActive ? "text-indigo-400" : "text-zinc-500")}>{step}</span>
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

                                            <div className="w-full lg:w-[320px] bg-zinc-950/60 rounded-2xl p-8 border border-white/5 flex flex-col justify-between items-center text-center gap-6">
                                                <div className="space-y-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto border border-indigo-500/20">
                                                        {delivery.reverse_logistics_status === 'requested' ? <Clock className="h-6 w-6 text-indigo-400" /> : <ShieldAlert className="h-6 w-6 text-indigo-400" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-semibold text-indigo-400 mb-1">{delivery.reverse_logistics_status}</p>
                                                        <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                                                            {delivery.reverse_logistics_status === 'requested' ? 'Aguardando início da coleta no endereço do cliente.' : 'Item em processo de retorno e validação técnica.'}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {delivery.reverse_logistics_status === 'returned' && (
                                                    <div className="space-y-4 w-full">
                                                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                                                            <p className="text-[11px] text-indigo-400 font-semibold mb-1">Aguardando Conferência de Reentrada</p>
                                                            <p className="text-[11px] text-zinc-500">Valide o estado físico dos itens antes de liberar para o estoque.</p>
                                                        </div>
                                                        <Button
                                                            onClick={async () => {
                                                                const { error } = await supabase
                                                                    .from('deliveries')
                                                                    .update({ reverse_logistics_status: 'completed' })
                                                                    .eq('id', delivery.id);
                                                                if (!error) {
                                                                    // Marcar o pedido como concluído agora que o item foi devolvido e conferido
                                                                    if (delivery.booking_id) {
                                                                        await supabase
                                                                            .from('bookings')
                                                                            .update({ status: 'completed' })
                                                                            .eq('id', delivery.booking_id);
                                                                    }
                                                                    queryClient.invalidateQueries({ queryKey: ['deliveries'] });
                                                                    queryClient.invalidateQueries({ queryKey: ['bookings'] });
                                                                }
                                                            }}
                                                            className="w-full bg-white text-black font-semibold text-[11px] h-14 rounded-2xl shadow-xl flex items-center gap-2"
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
                                                            <div className="text-[11px] font-bold text-zinc-500 ">
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
            {!embedded && activeSubTab === 'availability' && (
                <InventoryStatusReport companyId={tenantId} />
            )}

            {!embedded && activeSubTab === 'transfers' && (
                <InternalTransfersSection />
            )}





                                                    




















            {/* Modal de Escolha de Filial */}
            <DriverTrackingModal delivery={trackingDelivery} onClose={() => setTrackingDelivery(null)} />

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
                                    <p className="text-[11px] text-zinc-500 font-bold ">{branch.city} - {branch.state}</p>
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
