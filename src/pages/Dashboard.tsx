import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, 
  Plus, 
  Package, 
  TrendingUp, 
  CalendarDays, 
  AlertCircle, 
  BarChart3, 
  ArrowRight,
  MapPin,
  Truck
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuth } from '@/contexts/AuthContext';
import { useBookings, useUpdateBookingStatus } from '@/hooks/useBookings';
import { useEquipments, useDeleteEquipment } from '@/hooks/useEquipments';
import { useTenant } from '@/contexts/TenantContext';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';

import { EquipmentForm } from '@/components/inventory/EquipmentForm';
import { CompanySetup } from '@/components/auth/CompanySetup';
import { HubSupplementRequest } from '@/components/inventory/HubSupplementRequest';
import { MasterCatalogSelector } from '@/components/inventory/MasterCatalogSelector';
import { DeliveryMap } from '@/components/DeliveryMap';

// New Professional Components
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { InventoryTab } from '@/components/dashboard/InventoryTab';
import { ConfirmDeleteModal } from '@/components/dashboard/ConfirmDeleteModal';
import { LogisticsTab } from '@/components/dashboard/LogisticsTab';
import { FinancialSettings } from '@/components/dashboard/FinancialSettings';
import { BookingTrackingModal } from '@/components/dashboard/BookingTrackingModal';
import { BranchesTab } from '@/components/dashboard/BranchesTab';


type TabType = 'overview' | 'inventory' | 'bookings' | 'logistics' | 'network' | 'settings';
const VALID_TABS: TabType[] = ['overview', 'inventory', 'bookings', 'logistics', 'network', 'settings'];

export default function Dashboard() {
  const { user } = useAuth();
  const { company, isLoading: isLoadingTenant, tenantId, isBranchManager, branchId } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab is driven by URL ?tab= param — enables mobile BottomNav to switch tabs
  const rawTab = searchParams.get('tab') as TabType | null;
  const activeTab: TabType = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'overview';
  const setActiveTab = (tab: TabType) => setSearchParams({ tab }, { replace: true });
  
  const { data: bookingsReceived, isLoading: isLoadingReceived } = useBookings({
    companyId: tenantId || undefined,
    includeEquipmentSubrental: true,
  });

  const { data: bookingsRequested } = useBookings({
    renterId: user?.id
  });

  const { data: equipments, isLoading: isLoadingEquipments } = useEquipments({
    companyId: tenantId || undefined,
    branchId: isBranchManager ? branchId : undefined
  });
  
  const deleteMutation = useDeleteEquipment();
  const updateStatusMutation = useUpdateBookingStatus();

  // Other UI state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHubDialogOpen, setIsHubDialogOpen] = useState(false);
  const [isCatalogDialogOpen, setIsCatalogDialogOpen] = useState(false);
  const [trackingBookingId, setTrackingBookingId] = useState<string | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<any | undefined>();
  const [bookingFilter, setBookingFilter] = useState<'received' | 'requested'>('received');
  
  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modal de roteamento: quando master aprova e escolhe sub-locadora
  const [fulfillmentModal, setFulfillmentModal] = useState<{
    open: boolean;
    bookingId: string;
    subrentalCompanyId: string | null;
    subrentalCompanyName: string;
  } | null>(null);

  // iFood Real-Time Notification State
  const queryClient = useQueryClient();
  const [showLiveNotification, setShowLiveNotification] = useState(false);

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('bookings_channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'bookings', 
        filter: `company_id=eq.${tenantId}` 
      }, (payload) => {
        console.log('Nova Reserva Recebida Real-Time:', payload);
        
        // 1. Toca o "Plim" corporativo (iFood Bell)
        try {
           const audio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=success-1-6297.mp3'); 
           audio.play().catch(e => console.log('Audio autoplay blocked', e));
        } catch(e) {}
        
        // 2. Avisa React Query para atualizar tela na hora
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        
        // 3. Pula para a aba de Pedidos e mostra Banner
        setActiveTab('bookings');
        setShowLiveNotification(true);
        setTimeout(() => setShowLiveNotification(false), 8000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient, setActiveTab]);

  if (isLoadingTenant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!company && user) {
    return (
      <div className="container mx-auto py-12">
        <CompanySetup ownerId={user.id} />
      </div>
    );
  }

  if (company?.status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-zinc-950">
        <div className="max-w-md space-y-6 animate-in fade-in zoom-in duration-700">
           <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative bg-zinc-900 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-zinc-800 shadow-2xl">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
           </div>
          <h2 className="text-4xl font-black tracking-tighter uppercase">Análise em Curso</h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Estamos revisando os dados da <span className="text-zinc-100 font-bold">{company.name}</span>. 
            Você terá acesso total em breve.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()} className="rounded-xl h-12 px-8 border-zinc-800">
             Atualizar Status
          </Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const totalRevenue = bookingsReceived
    ?.filter(b => b.status === 'completed' || b.status === 'approved')
    .reduce((acc, curr) => acc + curr.total_amount, 0) || 0;

  const activeBookings = bookingsReceived?.filter(b => b.status === 'active' || b.status === 'approved').length || 0;
  const pendingBookingsCount = bookingsReceived?.filter(b => b.status === 'pending').length || 0;
  const maintenanceCount = equipments?.filter(e => e.status === 'maintenance').length || 0;

  // Handlers
  const handleAddEquipment = () => {
    setEditingEquipment(undefined);
    setIsDialogOpen(true);
  };

  const handleEditEquipment = (item: any) => {
    setEditingEquipment(item);
    setIsDialogOpen(true);
  };

  const handleDeleteRequest = (id: string) => {
    setItemToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteMutation.mutateAsync(itemToDelete);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateStatus = async (id: string, status: any, fulfillCompanyId?: string | null) => {
    try {
      setUpdatingId(id);
      await updateStatusMutation.mutateAsync({ id, status });

      // Se foi aprovado e tem uma sub-locadora para fulfillment, atualiza a delivery
      if (status === 'approved' && fulfillCompanyId) {
        // Aguardar um tick para a trigger do banco criar a delivery
        await new Promise(r => setTimeout(r, 1000));
        const { error } = await supabase
          .from('deliveries')
          .update({ fulfilling_company_id: fulfillCompanyId })
          .eq('booking_id', id);
        if (error) console.error('Erro ao atribuir fulfilling_company_id:', error);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Não foi possível atualizar o pedido. Tente novamente.');
    } finally {
      setUpdatingId(null);
      setFulfillmentModal(null);
    }
  };

  // Ao clicar "Aprovar agora": verifica se o equipamento tem sub-locadora
  const handleApproveBooking = async (booking: any) => {
    const subrentalId = booking.equipment?.subrental_company_id;
    if (subrentalId) {
      // Buscar nome da sub-locadora
      const { data: company } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', subrentalId)
        .single();

      setFulfillmentModal({
        open: true,
        bookingId: booking.id,
        subrentalCompanyId: subrentalId,
        subrentalCompanyName: company?.name || 'Sub-locadora',
      });
    } else {
      await handleUpdateStatus(booking.id, 'approved', null);
    }
  };

  return (
    <div className="flex bg-zinc-950 min-h-screen relative overflow-hidden">
      {/* REAL-TIME NOTIFICATION TOAST (iFood Popup) */}
      <AnimatePresence>
         {showLiveNotification && (
            <motion.div 
              initial={{ y: -150, scale: 0.9, opacity: 0 }}
              animate={{ y: 20, scale: 1, opacity: 1 }}
              exit={{ y: -150, scale: 0.9, opacity: 0 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 border border-emerald-400 p-1 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.3)] w-[90%] max-w-md flex items-center cursor-pointer"
              onClick={() => setShowLiveNotification(false)}
            >
               <div className="h-14 w-14 bg-black/20 rounded-xl flex items-center justify-center shrink-0">
                  <div className="relative">
                    <AlertCircle className="h-8 w-8 text-black" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                  </div>
               </div>
               <div className="pl-4 py-2">
                 <h3 className="text-black font-black uppercase tracking-widest text-lg leading-none mb-1">Nova Reserva no Hub!</h3>
                 <p className="text-emerald-950 text-[11px] font-bold uppercase tracking-tighter">Um produtor acabou de alugar seu equipamento.</p>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <DashboardSidebar 
        activeTab={activeTab} 
        onTabChange={(tab) => setActiveTab(tab)} 
        companyName={company?.name} 
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top Header Section (Mobile Visible) */}
        <header className="h-20 border-b border-zinc-900 flex items-center justify-between px-6 md:px-10 shrink-0">
           <div className="flex items-center gap-3 md:hidden">
              <Package className="h-6 w-6 text-primary" />
              <span className="font-black uppercase tracking-tighter text-lg">{company?.name}</span>
           </div>
           
           <div className="hidden md:block">
              <h1 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500">Área de Gestão</h1>
           </div>

           <div className="flex items-center gap-4">
              <Button 
                onClick={() => setIsHubDialogOpen(true)} 
                variant="outline"
                className="h-10 text-[10px] font-black uppercase tracking-widest border-primary/30 text-primary hover:bg-primary/5 rounded-xl hidden sm:flex"
              >
                Solicitar Equipamento
              </Button>
              <div className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
           </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-10 md:p-10 custom-scrollbar">
           
           {/* Tab Rendering */}
           {activeTab === 'overview' && (
             <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <header>
                   <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">Visão Geral</h2>
                   <p className="text-zinc-500 font-medium">O pulso financeiro e operacional da sua locadora hoje.</p>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                   <Card className="bg-zinc-900/50 border-zinc-900 rounded-3xl overflow-hidden hover:border-primary/20 transition-all group">
                      <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                         <CardTitle className="text-[11px] uppercase font-black text-zinc-500 tracking-[0.2em]">Receita Total</CardTitle>
                         <TrendingUp className="h-4 w-4 text-emerald-500" />
                      </CardHeader>
                      <CardContent className="p-6 pt-0">
                         <div className="text-3xl font-black tracking-tighter text-zinc-100 mb-1">
                            {formatCurrency(totalRevenue)}
                         </div>
                         <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-widest">Baseado em itens entregues</p>
                      </CardContent>
                   </Card>

                   <Card className="bg-zinc-900/50 border-zinc-900 rounded-3xl overflow-hidden hover:border-primary/20 transition-all">
                      <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                         <CardTitle className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em]">Reservas Ativas</CardTitle>
                         <CalendarDays className="h-4 w-4 text-zinc-600" />
                      </CardHeader>
                      <CardContent className="p-6 pt-0">
                         <div className="text-3xl font-black tracking-tighter text-zinc-100 mb-1">{activeBookings}</div>
                         <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-widest">{pendingBookingsCount} Pendentes</p>
                      </CardContent>
                   </Card>

                   <Card className="bg-zinc-900/50 border-zinc-900 rounded-3xl overflow-hidden hover:border-primary/20 transition-all">
                      <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                         <CardTitle className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em]">Frota Estocada</CardTitle>
                         <Package className="h-4 w-4 text-zinc-600" />
                      </CardHeader>
                      <CardContent className="p-6 pt-0">
                         <div className="text-3xl font-black tracking-tighter text-zinc-100 mb-1">{equipments?.length || 0}</div>
                         <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Itens cadastrados</p>
                      </CardContent>
                   </Card>

                   <Card className="bg-zinc-900/50 border-zinc-900 rounded-3xl overflow-hidden hover:border-destructive/20 transition-all">
                      <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                         <CardTitle className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em]">Em Manutenção</CardTitle>
                         <AlertCircle className="h-4 w-4 text-destructive" />
                      </CardHeader>
                      <CardContent className="p-6 pt-0">
                         <div className="text-3xl font-black tracking-tighter text-destructive mb-1">{maintenanceCount}</div>
                         <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Atenção requerida</p>
                      </CardContent>
                   </Card>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                   <Card className="xl:col-span-2 bg-zinc-950 border-zinc-900 rounded-3xl">
                      <CardHeader className="p-8 border-b border-zinc-900 flex flex-row items-center justify-between">
                         <CardTitle className="text-xl font-black tracking-tighter uppercase">Pedidos Recentes</CardTitle>
                         <Button variant="ghost" className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Ver Todos</Button>
                      </CardHeader>
                      <CardContent className="p-0">
                         {bookingsReceived?.length === 0 ? (
                           <div className="p-12 text-center text-zinc-600">Nenhum pedido recente.</div>
                         ) : (
                           <div className="divide-y divide-zinc-900/50">
                              {bookingsReceived?.slice(0, 5).map((booking: any) => (
                                <div key={booking.id} className="p-6 flex items-center justify-between hover:bg-zinc-900/30 transition-all group/item">
                                   <div className="flex gap-4 items-center min-w-0 flex-1">
                                      <div className="h-12 w-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-400 overflow-hidden shrink-0">
                                         {booking.equipment?.images?.[0] ? (
                                           <img src={booking.equipment.images[0]} alt="" className="w-full h-full object-cover group-hover/item:scale-110 transition-transform" />
                                         ) : (
                                           <Package className="h-4 w-4 text-zinc-700" />
                                         )}
                                      </div>
                                      <div className="min-w-0">
                                         <p className="text-sm font-black text-zinc-100 uppercase truncate">{(booking as any).equipment?.name}</p>
                                         <p className="text-[11px] uppercase text-zinc-500 font-bold tracking-widest truncate">
                                            Solicitante: {booking.renter?.company?.name || booking.renter?.full_name || 'Usuário'}
                                         </p>
                                      </div>
                                   </div>
                                   <div className="text-right shrink-0">
                                      <div className="text-sm font-black text-zinc-100">{formatCurrency(booking.total_amount)}</div>
                                      <Badge variant="outline" className="text-[8px] uppercase font-black h-4 px-1 border-zinc-800 text-zinc-500">{booking.status}</Badge>
                                   </div>
                                </div>
                              ))}
                           </div>
                         )}
                      </CardContent>
                   </Card>

                   <Card className="bg-zinc-950 border-zinc-900 rounded-3xl">
                      <CardHeader className="p-8 border-b border-zinc-900">
                         <CardTitle className="text-xl font-black tracking-tighter uppercase">Destaques</CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 space-y-6 text-center">
                         <div className="p-6 bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
                            <Package className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                            <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                               Seus itens mais alugados aparecerão aqui em breve.
                            </p>
                         </div>
                         <Button onClick={() => setActiveTab('inventory')} className="w-full rounded-xl font-black h-12 uppercase text-xs tracking-widest group">
                            Gerenciar Inventário <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                         </Button>
                      </CardContent>
                   </Card>
                </div>
             </div>
           )}

           {activeTab === 'inventory' && (
             <InventoryTab 
                tenantId={tenantId || undefined} 
                onAdd={handleAddEquipment} 
                onEdit={handleEditEquipment} 
                onDelete={handleDeleteRequest} 
             />
           )}

           {/* Keep simple versions of other tabs to avoid token limit */}
           {activeTab === 'bookings' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="mb-10 flex items-center justify-between">
                   <div>
                      <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">Pedidos</h2>
                      <p className="text-zinc-500 font-medium">Gerencie entradas e solicitações do HUB.</p>
                   </div>
                   <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                      <Button variant={bookingFilter === 'received' ? 'secondary' : 'ghost'} onClick={() => setBookingFilter('received')} className="h-9 rounded-lg text-[10px] font-black uppercase">Recebidos</Button>
                      <Button variant={bookingFilter === 'requested' ? 'secondary' : 'ghost'} onClick={() => setBookingFilter('requested')} className="h-9 rounded-lg text-[10px] font-black uppercase">Enviados</Button>
                   </div>
                </header>
                
                <div className="space-y-4">
                  {(bookingFilter === 'received' ? bookingsReceived : bookingsRequested)?.map((booking: any) => (
                    <Card key={booking.id} className="bg-zinc-900/30 border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-800 transition-colors">
                       <div className="p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                          <div className="flex gap-4 items-center">
                             <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-primary overflow-hidden">
                                {booking.renter?.company?.name?.charAt(0) || booking.renter?.full_name?.charAt(0) || 'U'}
                             </div>
                             <div>
                                <p className="font-black text-zinc-100 tracking-tight uppercase">
                                   {booking.renter?.company?.name || booking.renter?.full_name || 'Solicitante Desconhecido'}
                                </p>
                                <p className="text-[11px] uppercase font-bold text-zinc-500 tracking-widest">{booking.equipment?.name}</p>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-8">
                             <div className="text-right hidden sm:block">
                                <p className="text-[9px] uppercase font-black text-zinc-600 tracking-widest mb-1">Período</p>
                                <p className="text-xs font-bold text-zinc-400">{format(new Date(booking.start_date), "dd/MM")} - {format(new Date(booking.end_date), "dd/MM")}</p>
                             </div>
                             <div className="text-right">
                                <div className="text-lg font-black text-zinc-100">{formatCurrency(booking.total_amount)}</div>
                                <Badge className={`text-[8px] uppercase font-black tracking-tighter h-4 ${
                                   booking.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                   booking.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''
                                }`}>{booking.status}</Badge>
                             </div>
                          </div>
                       </div>
                       
                       {bookingFilter === 'requested' && (booking.status === 'approved' || booking.status === 'active') && (
                          <div className="px-6 py-4 bg-zinc-900/50 flex justify-end gap-3 border-t border-zinc-800">
                             <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setTrackingBookingId(booking.id)} 
                                className="border-zinc-700 text-zinc-300 font-black uppercase text-[10px] tracking-widest rounded-lg px-6 flex items-center gap-2"
                             >
                                <Truck className="h-3 w-3" /> Acompanhar Pedido
                             </Button>
                          </div>
                       )}

                       {bookingFilter === 'received' && booking.status === 'pending' && (
                          <div className="px-6 py-4 bg-zinc-900/50 flex justify-end gap-3 border-t border-zinc-800">
                             <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(booking.id, 'rejected')} className="text-destructive font-black uppercase text-[10px] hover:bg-destructive/5 tracking-widest">Recusar</Button>
                             <Button 
                               size="sm" 
                               disabled={updatingId === booking.id}
                               onClick={() => handleApproveBooking(booking)} 
                               className="bg-emerald-600 hover:bg-emerald-500 font-black uppercase text-[10px] tracking-widest rounded-lg px-6"
                             >
                               {updatingId === booking.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Aprovar agora'}
                             </Button>
                          </div>
                        )}
                    </Card>
                  ))}
                </div>
             </div>
           )}

           {activeTab === 'logistics' && (
             <LogisticsTab tenantId={tenantId || ''} />
           )}

           {activeTab === 'network' && (
             <BranchesTab />
           )}

           {activeTab === 'settings' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="mb-10">
                   <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">Ajustes</h2>
                   <p className="text-zinc-500 font-medium">Configurações da sua locadora e conta.</p>
                </header>
                
                {company && (
                  <FinancialSettings 
                    companyId={company.id} 
                    initialConfig={(company as any).financial_config} 
                  />
                )}
             </div>
           )}

        </div>
      </main>

      {/* Modals & Dialogs */}
      <Dialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)}
        title={editingEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}
      >
        {company && (
          <EquipmentForm 
            companyId={company.id} 
            equipment={editingEquipment} 
            onSuccess={() => setIsDialogOpen(false)} 
          />
        )}
      </Dialog>

      <Dialog 
        isOpen={isHubDialogOpen} 
        onClose={() => setIsHubDialogOpen(false)}
        title="Solicitar Suplemento do HUB"
      >
        <HubSupplementRequest onSuccess={() => setIsHubDialogOpen(false)} />
      </Dialog>

      <Dialog 
        isOpen={isCatalogDialogOpen} 
        onClose={() => setIsCatalogDialogOpen(false)}
        title="Catálogo Master Aputure"
      >
        {company && (
          <MasterCatalogSelector 
            companyId={company.id} 
            onSuccess={() => setIsCatalogDialogOpen(false)} 
          />
        )}
      </Dialog>

      <Dialog 
        isOpen={!!trackingBookingId} 
        onClose={() => setTrackingBookingId(null)}
        title="Status do Pedido Hub"
      >
        {trackingBookingId && <BookingTrackingModal bookingId={trackingBookingId} />}
      </Dialog>
      
      <ConfirmDeleteModal 
        isOpen={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)} 
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
      />

      {/* Modal de Roteamento: Sub-locadora fulfillment */}
      <Dialog
        isOpen={!!fulfillmentModal?.open}
        onClose={() => setFulfillmentModal(null)}
        title="Atribuir Entrega à Sub-locadora"
      >
        {fulfillmentModal && (
          <div className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
              <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                Este equipamento está com a sub-locadora
                <span className="text-blue-400 font-black"> {fulfillmentModal.subrentalCompanyName}</span>.
                Deseja que ela gerencie a entrega deste pedido?
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => handleUpdateStatus(fulfillmentModal.bookingId, 'approved', fulfillmentModal.subrentalCompanyId)}
                disabled={!!updatingId}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 font-black uppercase tracking-widest rounded-xl"
              >
                {updatingId ? <Loader2 className="h-4 w-4 animate-spin" /> : `Sim, ${fulfillmentModal.subrentalCompanyName} entrega`}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleUpdateStatus(fulfillmentModal.bookingId, 'approved', null)}
                disabled={!!updatingId}
                className="w-full h-12 border-zinc-700 font-black uppercase tracking-widest rounded-xl"
              >
                Não, eu mesmo gerencio
              </Button>
            </div>
          </div>
        )}
      </Dialog>


    </div>
  );
}

