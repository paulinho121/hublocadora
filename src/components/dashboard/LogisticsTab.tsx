import { useState, useEffect } from 'react';
import { Package, Truck, Clock, MapPin, CheckCircle2, ShoppingBag, ArrowRight, Loader2, Phone, User, Hash, ShieldAlert } from 'lucide-react';
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
    const { branches, isBranchManager, branchId } = useTenant();
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [branchModalOpen, setBranchModalOpen] = useState(false);
    const [pendingDelivery, setPendingDelivery] = useState<any>(null);
    const queryClient = useQueryClient();
    const { data: deliveries, isLoading } = useDeliveries({ 
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
        const statusFlow: any = {
            'pending': 'picking',
            'picking': 'ready',
            'ready': 'shipped',
            'shipped': 'delivered'
        };

        const nextStatus = statusFlow[delivery.status];
        if (!nextStatus) return;

        // SE for a primeira movimentação (pending -> picking), abre modal de escolha de filial
        // Apenas abre se ainda não tivermos uma filial selecionada (selectedBranchId)
        if (delivery.status === 'pending' && nextStatus === 'picking' && branches && branches.length > 0 && !selectedBranchId) {
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
            'pending': 'Iniciar Separação',
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

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">Painel de Logística</h2>
                    <p className="text-zinc-500 font-medium">Controle de fluxo em tempo real.</p>
                </div>

                <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800">
                    <button 
                        onClick={() => setActiveSubTab('deliveries')}
                        className={cn(
                            "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            activeSubTab === 'deliveries' ? "bg-zinc-800 text-white shadow-xl" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        Entregas Clientes
                    </button>
                    <button 
                        onClick={() => setActiveSubTab('transfers')}
                        className={cn(
                            "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            activeSubTab === 'transfers' ? "bg-zinc-800 text-white shadow-xl" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        Transferências Internas
                    </button>
                    <button 
                        onClick={() => setActiveSubTab('availability')}
                        className={cn(
                            "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            activeSubTab === 'availability' ? "bg-zinc-800 text-white shadow-xl" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        Disponibilidade
                    </button>
                </div>
            </header>

            {activeSubTab === 'availability' ? (
                <InventoryStatusReport companyId={tenantId} />
            ) : activeSubTab === 'transfers' ? (
                <InternalTransfersSection />
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    <AnimatePresence mode="popLayout">
                        {deliveries?.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl p-20 text-center"
                        >
                            <Truck className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
                            <h3 className="text-xl font-black uppercase text-zinc-500">Nenhuma entrega ativa</h3>
                            <p className="text-zinc-600 text-sm mt-2 font-medium">Novos pedidos aparecerão aqui automaticamente.</p>
                        </motion.div>
                    ) : (
                        deliveries?.map((delivery: any) => (
                            <motion.div
                                key={delivery.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <Card className="bg-zinc-900/40 border-zinc-800 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden hover:border-zinc-700 transition-all shadow-2xl">
                                    <div className="p-4 sm:p-8 md:p-10">
                                        <div className="flex flex-col lg:flex-row gap-6 sm:gap-10">
                                            {/* Order Info */}
                                            <div className="flex-1 space-y-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex gap-4">
                                                        <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                                                            {delivery.booking?.equipment?.images?.[0] ? (
                                                                <img src={delivery.booking.equipment.images[0]} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-zinc-700" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Badge variant="outline" className="text-[9px] uppercase font-black bg-primary/10 text-primary border-primary/20">
                                                                    ID #{delivery.booking_id.slice(0, 8)}
                                                                </Badge>
                                                                {delivery.serial_number && (
                                                                    <Badge variant="outline" className="text-[9px] uppercase font-black bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                                                        SN: {delivery.serial_number}
                                                                    </Badge>
                                                                )}
                                                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" /> {format(new Date(delivery.created_at), "dd/MM 'às' HH:mm")}
                                                                </span>
                                                            </div>
                                                            <h3 className="text-2xl font-black uppercase tracking-tighter text-zinc-100">
                                                                {delivery.booking?.equipment?.name || 'Equipamento'}
                                                            </h3>
                                                            <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                                                                <User className="h-3 w-3" /> {delivery.booking?.renter?.company?.name || delivery.booking?.renter?.full_name}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mb-1">Status Atual</p>
                                                        <Badge className="bg-zinc-800 text-zinc-300 font-black uppercase text-xs py-1.5 px-4 rounded-full border-zinc-700">
                                                            {getStatusLabel(delivery.status)}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-zinc-800/50">
                                                    <OrderStatusTracker status={delivery.status} />
                                                </div>
                                            </div>

                                            {/* Action Sidebar */}
                                            <div className="w-full lg:w-72 flex flex-col justify-center gap-4 bg-zinc-950/20 sm:bg-zinc-950/50 p-4 sm:p-8 rounded-[1.2rem] sm:rounded-[2rem] border border-zinc-800/50">
                                                {/* Token de 4 dígitos: aparece para quem entrega (locadora master ou sub-locadora) */}
                                                {delivery.status === 'shipped' && (delivery.booking?.company_id === tenantId || delivery.fulfilling_company_id === tenantId) && (
                                                    <div className="space-y-2 mb-2 animate-in fade-in slide-in-from-top-2">
                                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                                                            <ShieldAlert className="h-3 w-3" />
                                                            <span>Token de Confirmação</span>
                                                        </div>
                                                        <Input 
                                                            placeholder="0 0 0 0"
                                                            maxLength={4}
                                                            className="bg-zinc-900 border-primary/50 rounded-xl text-center text-xl font-black tracking-[0.5em] h-12"
                                                            value={tokenInputs[delivery.id] || ''}
                                                            onChange={(e) => setTokenInputs(prev => ({ ...prev, [delivery.id]: e.target.value.replace(/\D/g, '') }))}
                                                        />
                                                        <p className="text-[8px] text-zinc-500 font-bold text-center uppercase">Solicite ao cliente no ato da entrega</p>
                                                    </div>
                                                )}

                                                {/* Renter Info (Show code to them) */}
                                                {delivery.booking?.renter_id === user?.id && delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
                                                    <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl text-center mb-2 animate-pulse">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Seu Código de Entrega</p>
                                                        <div className="text-3xl font-black tracking-[0.3em] text-white">
                                                            {delivery.delivery_token || '----'}
                                                        </div>
                                                        <p className="text-[8px] text-zinc-500 font-bold uppercase mt-2">Informe ao entregador para confirmar</p>
                                                    </div>
                                                )}

                                                {/* Número de série: aparece para quem está separando */}
                                                {delivery.status === 'picking' && (delivery.booking?.company_id === tenantId || delivery.fulfilling_company_id === tenantId) && (
                                                    <div className="space-y-2 mb-2 animate-in fade-in slide-in-from-top-2">
                                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                            <Hash className="h-3 w-3" />
                                                            <span>Número de Série (Opcional)</span>
                                                        </div>
                                                        <Input 
                                                            placeholder="Ex: SN-123456"
                                                            className="bg-zinc-900 border-zinc-800 rounded-xl text-xs h-10"
                                                            value={serialNumbers[delivery.id] || delivery.serial_number || ''}
                                                            onChange={(e) => setSerialNumbers(prev => ({ ...prev, [delivery.id]: e.target.value }))}
                                                        />
                                                    </div>
                                                )}

                                                {delivery.status !== 'delivered' && delivery.status !== 'cancelled' ? (
                                                    (delivery.booking?.company_id === tenantId || delivery.fulfilling_company_id === tenantId) ? (
                                                        <>
                                                          {/* Badge quando sub-locadora está gerenciando entrega de outro */}
                                                          {delivery.fulfilling_company_id === tenantId && delivery.booking?.company_id !== tenantId && (
                                                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-2 text-center">
                                                              <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">Você é o fornecedor</p>
                                                              <p className="text-[10px] text-zinc-300 font-medium mt-0.5">Gerenciando entrega de outra locadora</p>
                                                            </div>
                                                          )}
                                                          <Button 
                                                              onClick={() => handleNextStatus(delivery)}
                                                              disabled={updatingId === delivery.id}
                                                              className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest px-6 shadow-[0_0_30_rgba(var(--primary-rgb),0.2)] group"
                                                          >
                                                              {updatingId === delivery.id ? (
                                                                  <Loader2 className="h-5 w-5 animate-spin" />
                                                              ) : (
                                                                  <>
                                                                      <span className="flex-1">{getNextActionLabel(delivery.status)}</span>
                                                                      <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                                                  </>
                                                              )}
                                                          </Button>
                                                        </>
                                                    ) : (
                                                        <div className="text-center py-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                                                            <Clock className="h-10 w-10 text-primary/40 mx-auto mb-2 animate-pulse" />
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-4">
                                                                Aguardando ação da locadora
                                                            </p>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="text-center py-4">
                                                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Operação Concluída</p>
                                                    </div>
                                                )}

                                                <div className="space-y-3 pt-2">
                                                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors">
                                                        <MapPin className="h-4 w-4" />
                                                        <span>Ver Local de Entrega</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors">
                                                        <Phone className="h-4 w-4" />
                                                        <span>Contatar Cliente</span>
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
