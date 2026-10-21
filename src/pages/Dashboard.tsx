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
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  Heart,
  Pencil,
  Trash2,
  RefreshCw,
  Inbox,
  Send,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useBookings, useUpdateBookingStatus, useDeleteBooking } from '@/hooks/useBookings';
import { useEquipments, useDeleteEquipment } from '@/hooks/useEquipments';
import { useFavorites } from '@/hooks/useFavorites';
import { EquipmentCard } from '@/components/marketplace/EquipmentCard';
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
import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { InventoryTab } from '@/components/dashboard/InventoryTab';
import { ConfirmDeleteModal } from '@/components/dashboard/ConfirmDeleteModal';
import { LogisticsTab } from '@/components/dashboard/LogisticsTab';
import { FinancialSettings } from '@/components/dashboard/FinancialSettings';
import { BranchesTab } from '@/components/dashboard/BranchesTab';
import { PrivacySettings } from '@/components/dashboard/PrivacySettings';
import { AuditTab } from '@/components/dashboard/AuditTab';

import { OrderHistoryTab } from '@/components/dashboard/OrderHistoryTab';
import { ReportsTab } from '@/components/dashboard/ReportsTab';
import { ProjectsTab } from '@/components/dashboard/ProjectsTab';
import { CompanyProfileSettings } from '@/components/dashboard/CompanyProfileSettings';
import { EditBookingModal } from '@/components/dashboard/EditBookingModal';
import { InventoryStatusReport } from '@/components/dashboard/InventoryStatusReport';
import { InternalTransfersSection } from '@/components/dashboard/InternalTransfersSection';

type TabType = 'overview' | 'inventory' | 'bookings' | 'projects' | 'transfers' | 'reports' | 'network' | 'settings' | 'audit' | 'history' | 'favorites';
const VALID_TABS: TabType[] = ['overview', 'inventory', 'bookings', 'projects', 'transfers', 'reports', 'network', 'settings', 'audit', 'history', 'favorites'];

// Status do pedido em português
const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Aguardando aprovação', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  approved:  { label: 'Aprovado',             className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  active:    { label: 'Em andamento',         className: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  completed: { label: 'Concluído',            className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  rejected:  { label: 'Recusado',             className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  cancelled: { label: 'Cancelado',            className: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const { company, branch, isLoading: isLoadingTenant, tenantId, isBranchManager, branchId, isAdmin } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab is driven by URL ?tab= param — enables mobile BottomNav to switch tabs
  const rawTab = searchParams.get('tab');
  // A logística agora vive dentro de cada pedido: links antigos para a aba vão para Pedidos
  const normalizedTab = rawTab === 'logistics' ? 'bookings' : rawTab;
  const activeTab: TabType = normalizedTab && VALID_TABS.includes(normalizedTab as TabType) ? normalizedTab as TabType : 'overview';
  const setActiveTab = (tab: TabType) => setSearchParams({ tab }, { replace: true });

  // Pedido aberto (?tab=bookings&pedido=ID): o botão voltar do aparelho fecha o detalhe
  const openOrderId = searchParams.get('pedido');
  const openOrder = (id: string) => setSearchParams({ tab: 'bookings', pedido: id });
  const closeOrder = () => setSearchParams({ tab: 'bookings' }, { replace: true });
  
  const { data: bookingsReceived, isLoading: isLoadingReceived } = useBookings({
    companyId: tenantId || undefined,
    branchId: isBranchManager ? branchId : undefined,
    includeEquipmentSubrental: true,
  });

  const { data: bookingsRequested } = useBookings({
    renterId: user?.id
  });

  // Pagamentos aprovados confirmados para este tenant
  const { data: approvedPayments } = useQuery({
    queryKey: ['payments-approved', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('amount, booking_id, status')
        .eq('tenant_id', tenantId)
        .eq('status', 'approved');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const { data: equipmentsPage, isLoading: isLoadingEquipments } = useEquipments({
    companyId: tenantId || undefined,
    branchId: isBranchManager ? branchId : undefined
  });
  const equipments = equipmentsPage?.items ?? [];
  
  const deleteMutation = useDeleteEquipment();
  const updateStatusMutation = useUpdateBookingStatus();
  const deleteBookingMutation = useDeleteBooking();

  // Refresh (PWA)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = () => {
    setIsRefreshing(true);
    queryClient.invalidateQueries();
    setTimeout(() => window.location.reload(), 500);
  };

  // Other UI state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHubDialogOpen, setIsHubDialogOpen] = useState(false);
  const [isCatalogDialogOpen, setIsCatalogDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<any | undefined>();
  const [bookingFilter, setBookingFilter] = useState<'received' | 'requested'>('received');
  
  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Booking edit/delete state
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);

  // Modal de roteamento: master seleciona de qual sub-locadora o item sairá
  const [fulfillmentModal, setFulfillmentModal] = useState<{
    open: boolean;
    bookingId: string;
    selectedSubrentalId: string | null;
    selectedSubrentalType: 'branch' | 'external' | null;
    subrentalOptions: Array<{ id: string; name: string; city?: string; state?: string; type: 'branch' | 'external' }>;
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

    // Listener para NOVAS ATRIBUIÇÕES (Sub-locadora ou Filial)
    const deliveriesChannel = supabase
      .channel('deliveries_assignment')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'deliveries',
        filter: isBranchManager && branchId ? `origin_branch_id=eq.${branchId}` : `fulfilling_company_id=eq.${tenantId}`
      }, (payload) => {
        // Se a sub-locadora acabou de ser atribuída (seja pendente ou já aceita)
        // Para filial (isBranchManager), o ID vai para origin_branch_id. Para sub, fulfilling_company_id.
        const isNewFulfiller = isBranchManager 
          ? (payload.old.origin_branch_id === null || payload.old.origin_branch_id !== branchId)
          : (payload.old.fulfilling_company_id === null || payload.old.fulfilling_company_id !== tenantId);

        if (
          (payload.new.subrental_status === 'accepted' || payload.new.subrental_status === 'pending') && 
          isNewFulfiller
        ) {
          console.log('Novo Pedido Atribuído para Sublocação:', payload);
          
          try {
             const audio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=success-1-6297.mp3'); 
             audio.play().catch(e => console.log('Audio autoplay blocked', e));
          } catch(e) {}

          queryClient.invalidateQueries({ queryKey: ['bookings'] });
          queryClient.invalidateQueries({ queryKey: ['deliveries'] });
          
          if (payload.new.subrental_status === 'pending') {
             setActiveTab('bookings'); // Vai pra aba de pedidos aceitar
          } else {
             // A logística fica dentro do pedido: abre o pedido da entrega
             if (payload.new.booking_id) openOrder(payload.new.booking_id);
             else setActiveTab('bookings');
          }
          
          setShowLiveNotification(true);
          setTimeout(() => setShowLiveNotification(false), 8000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(deliveriesChannel);
    };
  }, [tenantId, queryClient, setActiveTab]);

  if (isLoadingTenant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // O Dashboard agora é resiliente: só mostra o setup se realmente não houver empresa 
  // após o carregamento completo e se o usuário não for um admin/sub-locadora/gerente.
  const showSetup = !isLoadingTenant && !company && !isBranchManager && !isAdmin && user;

  
  if (showSetup) {
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

  const getDelivery = (booking: any) => {
    const delivery = booking.delivery || booking.deliveries;
    if (!delivery) return null;
    return Array.isArray(delivery) ? delivery[0] : delivery;
  };

  // Helper robusto para extrair o ID de quem entrega (Sub-locadora ou Filial)
  const getFulfillmentId = (booking: any) => {
    const d = getDelivery(booking);
    if (!d) return null;

    // Retorna ou o ID da empresa externa ou o ID da filial interna
    return (d as any).fulfilling_company_id || (d as any).origin_branch_id;
  };

  // ─── Financial calculations ──────────────────────────────────────────────────

  // Helper: revenue share for a single booking considering sub-rental splits
  const getBookingRevenue = (booking: any): number => {
    const fulfillmentId = getFulfillmentId(booking);
    const isFulfiller   = fulfillmentId === tenantId;
    const isOwner       = booking.company_id === tenantId;
    if (isFulfiller && !isOwner)                              return booking.total_amount * 0.5;
    if (isOwner && fulfillmentId && fulfillmentId !== tenantId) return booking.total_amount * 0.5;
    if (isOwner)                                               return booking.total_amount;
    return 0;
  };

  // Gate aprovada pelo gateway de pagamentos (fonte mais confiável — quando existir)
  const confirmedRevenue = (approvedPayments ?? []).reduce((acc, p) => acc + (p.amount || 0), 0);

  // BUG FIX ▶ só conta reservas CONFIRMADAS (approved / active / completed)
  // Pendentes não são receita — ainda não foram aceitas pela locadora
  const confirmedBookingRevenue = bookingsReceived
    ?.filter(b => ['approved', 'active', 'completed'].includes(b.status))
    .reduce((acc, b) => acc + getBookingRevenue(b), 0) || 0;

  // Receita pendente — solicitações ainda não aprovadas (não conta como lucro)
  const pendingRevenue = bookingsReceived
    ?.filter(b => b.status === 'pending')
    .reduce((acc, b) => acc + getBookingRevenue(b), 0) || 0;

  // Receita realizada — apenas locações concluídas (melhor indicador de caixa real)
  const completedRevenue = bookingsReceived
    ?.filter(b => b.status === 'completed')
    .reduce((acc, b) => acc + getBookingRevenue(b), 0) || 0;

  // Este mês (bookings aprovados/ativos/concluídos criados no mês corrente)
  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const thisMonthRevenue = bookingsReceived
    ?.filter(b =>
      ['approved', 'active', 'completed'].includes(b.status) &&
      b.created_at >= thisMonthStart,
    )
    .reduce((acc, b) => acc + getBookingRevenue(b), 0) || 0;

  // Ganhos líquidos: gateway aprovado > bookings confirmados > 0
  const totalRevenue = confirmedRevenue > 0 ? confirmedRevenue : confirmedBookingRevenue;

  const recentOrders = [...(bookingsReceived || []), ...(bookingsRequested || [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  // Taxa da plataforma CineHub: 15% sobre reservas confirmadas
  const HUB_RATE = 0.15;
  const hubFee = totalRevenue * HUB_RATE;

  // Repasse a sub-locadoras parceiras (50% quando outra empresa entregou)
  const partnerDebt = bookingsReceived
    ?.filter(b => ['approved', 'active', 'completed'].includes(b.status))
    .reduce((acc, curr) => {
      const fulfillmentId = getFulfillmentId(curr);
      const isOwner = curr.company_id === tenantId;
      if (isOwner && fulfillmentId && fulfillmentId !== tenantId) {
        return acc + (curr.total_amount * 0.5);
      }
      return acc;
    }, 0) || 0;

  // Débito operacional total = taxa HUB + repasse a parceiros
  const totalDebt = hubFee + partnerDebt;

  const activeBookings      = bookingsReceived?.filter(b => b.status === 'active' || b.status === 'approved').length || 0;
  const completedBookings   = bookingsReceived?.filter(b => b.status === 'completed').length || 0;
  const pendingBookingsCount = bookingsReceived?.filter(b => b.status === 'pending').length || 0;
  const maintenanceCount    = equipments?.filter(e => e.status === 'maintenance').length || 0;

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

  const handleUpdateStatus = async (id: string, status: any, fulfillId?: string | null) => {
    try {
      setUpdatingId(id);
      
      const isBranch = fulfillmentModal?.selectedSubrentalType === 'branch';
      const isExternal = fulfillmentModal?.selectedSubrentalType === 'external';
      
      // Se não houver fulfillmentId (fulfillment direto pelo master), usamos o tenantId atual
      const finalFulfillId = fulfillId || tenantId;
      const finalFulfillType = fulfillmentModal?.selectedSubrentalType || 'direct';

      await updateStatusMutation.mutateAsync({ 
        id, 
        status,
        subrental_company_id: (status === 'approved' && isExternal) ? fulfillId : undefined,
        origin_branch_id: (status === 'approved' && isBranch) ? fulfillId : undefined
      });

      // Nota: A criação de registros de logística (deliveries) agora é feita 
      // automaticamente pelo gatilho 'trg_on_booking_approved' no banco de dados.
      
      // Invalida queries para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Não foi possível atualizar o pedido. Tente novamente.');
    } finally {
      setUpdatingId(null);
      setFulfillmentModal(null);
    }
  };

  const handleAcceptSubrental = async (deliveryId: string) => {
    try {
      setUpdatingId(deliveryId);
      const { error } = await supabase.from('deliveries').update({ subrental_status: 'accepted' }).eq('id', deliveryId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    } catch (e) {
      console.error(e);
      alert('Não foi possível aceitar a sub-locação.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Ao clicar "Aprovar agora": busca sub-locadoras que têm o item para o master escolher
  const handleApproveBooking = async (booking: any) => {
    await handleUpdateStatus(booking.id, 'approved', null);
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
                 <h3 className="text-black font-black uppercase tracking-widest text-lg leading-none mb-1">Novo Pedido Recebido!</h3>
                 <p className="text-emerald-950 text-[11px] font-bold uppercase tracking-tighter">O Hub acaba de direcionar um pedido para sua unidade.</p>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <DashboardSidebar 
        activeTab={activeTab} 
        onTabChange={(tab) => setActiveTab(tab)} 
        companyName={isBranchManager ? branch?.name : company?.name} 
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top Header Section (Mobile Visible) */}
        <header className="h-16 md:h-20 border-b border-zinc-900 flex items-center justify-between px-4 md:px-10 shrink-0">
           <div className="flex items-center gap-3 md:hidden">
              {company?.logo_url ? (
                 <div className="h-8 w-8 rounded-lg overflow-hidden border border-zinc-800 flex items-center justify-center shrink-0">
                    <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
                 </div>
              ) : (
                 <Package className="h-6 w-6 text-primary shrink-0" />
              )}
              <span className="font-black uppercase tracking-tighter text-lg">{isBranchManager ? branch?.name : company?.name}</span>
           </div>
           
           <div className="hidden md:block">
              <h1 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500">Área de Gestão</h1>
           </div>

           <div className="flex items-center gap-3">
              {/* Refresh button — visible on mobile (PWA) */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="md:hidden h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all active:scale-95"
                title="Atualizar aplicativo"
              >
                <RefreshCw className={`h-4 w-4 transition-transform duration-700 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>

              {/* No desktop o sino fica na barra lateral, que some no celular */}
              <div className="md:hidden">
                 <NotificationCenter />
              </div>

              <div className="hidden md:flex h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center">
                 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
           </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-10 md:p-10 custom-scrollbar">
           
           {/* Tab Rendering com Transição Fluida */}
           <AnimatePresence mode="wait">
             <motion.div
               key={activeTab}
               initial={{ opacity: 0, y: 10, scale: 0.98 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: -10, scale: 0.98 }}
               transition={{ duration: 0.2, ease: "easeOut" }}
               className="h-full"
             >
               {activeTab === 'overview' && (
                 <div className="space-y-10">
                <header>
                   <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">Visão Geral</h2>
                   <p className="text-zinc-500 font-medium">O pulso financeiro e operacional da sua locadora hoje.</p>
                </header>

                {/* Stats Grid */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <Card className="clay-card">
                       <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-xs uppercase font-black text-zinc-500 tracking-[0.2em]">Ganhos Líquidos</CardTitle>
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                       </CardHeader>
                       <CardContent className="p-6 pt-0">
                          <div className="text-2xl font-black tracking-tighter text-zinc-100 mb-1">
                             {formatCurrency(totalRevenue)}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {pendingRevenue > 0 && (
                              <p className="text-xs text-amber-500/80 font-bold uppercase tracking-widest">
                                + {formatCurrency(pendingRevenue)} a confirmar
                              </p>
                            )}
                            <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">
                              {thisMonthRevenue > 0
                                ? `${formatCurrency(thisMonthRevenue)} este mês`
                                : completedRevenue > 0
                                  ? `${formatCurrency(completedRevenue)} realizados`
                                  : 'Nenhuma receita confirmada'}
                            </p>
                          </div>
                       </CardContent>
                    </Card>

                    <Card className="clay-card">
                       <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-xs uppercase font-black text-zinc-500 tracking-[0.2em]">Débitos Operacionais</CardTitle>
                          <AlertCircle className="h-4 w-4 text-red-500" />
                       </CardHeader>
                       <CardContent className="p-6 pt-0">
                          <div className={`text-2xl font-black tracking-tighter mb-1 ${totalDebt > 0 ? 'text-red-400' : 'text-zinc-100'}`}>
                             {formatCurrency(totalDebt)}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">
                              Taxa HUB (15%): {formatCurrency(hubFee)}
                            </p>
                            {partnerDebt > 0 && (
                              <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">
                                Parceiros: {formatCurrency(partnerDebt)}
                              </p>
                            )}
                          </div>
                       </CardContent>
                    </Card>

                    <Card className="clay-card">
                       <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-xs uppercase font-black text-zinc-500 tracking-[0.2em]">Reservas Ativas</CardTitle>
                          <CalendarDays className="h-4 w-4 text-zinc-600" />
                       </CardHeader>
                       <CardContent className="p-6 pt-0">
                          <div className="text-2xl font-black tracking-tighter text-zinc-100 mb-1">{activeBookings}</div>
                          <div className="flex flex-col gap-0.5">
                            {pendingBookingsCount > 0 && (
                              <p className="text-xs text-amber-500/80 font-bold uppercase tracking-widest">
                                {pendingBookingsCount} aguardando aprovação
                              </p>
                            )}
                            <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">
                              {completedBookings > 0 ? `${completedBookings} concluídas` : 'Nenhuma concluída'}
                            </p>
                          </div>
                       </CardContent>
                    </Card>

                    <Card className="clay-card">
                       <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-xs uppercase font-black text-zinc-500 tracking-[0.2em]">Frota Estocada</CardTitle>
                          <Package className="h-4 w-4 text-zinc-600" />
                       </CardHeader>
                       <CardContent className="p-6 pt-0">
                          <div className="text-2xl font-black tracking-tighter text-zinc-100 mb-1">{equipments?.length || 0}</div>
                          <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">
                            {maintenanceCount > 0
                              ? `${(equipments?.length || 0) - maintenanceCount} disponíveis`
                              : 'Todos disponíveis'}
                          </p>
                       </CardContent>
                    </Card>

                    <Card className="clay-card">
                       <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-xs uppercase font-black text-zinc-500 tracking-[0.2em]">Em Manutenção</CardTitle>
                          <AlertCircle className="h-4 w-4 text-destructive" />
                       </CardHeader>
                       <CardContent className="p-6 pt-0">
                          <div className="text-2xl font-black tracking-tighter text-destructive mb-1">{maintenanceCount}</div>
                          <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">Atenção requerida</p>
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
                         {recentOrders.length === 0 ? (
                           <div className="p-12 text-center text-zinc-600">Nenhum pedido recente.</div>
                         ) : (
                           <div className="divide-y divide-zinc-900/50">
                              {recentOrders.map((booking: any) => {
                                const isRequested = booking.renter_id === user?.id;
                                const fulfillmentId = getFulfillmentId(booking);
                                const isFulfiller = fulfillmentId === tenantId;
                                const isOwner = booking.company_id === tenantId;
                                
                                return (
                                  <div key={booking.id} className="p-6 flex items-center justify-between hover:bg-zinc-900/30 transition-all group/item">
                                     <div className="flex gap-4 items-center min-w-0 flex-1">
                                        <div className="relative">
                                           <div className="h-12 w-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-400 overflow-hidden shrink-0">
                                              {booking.equipment?.images?.[0] ? (
                                                <img src={booking.equipment.images[0]} alt="" className="w-full h-full object-cover group-hover/item:scale-110 transition-transform" />
                                              ) : (
                                                <Package className="h-4 w-4 text-zinc-700" />
                                              )}
                                           </div>
                                           <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-zinc-950 flex items-center justify-center shadow-xl ${isRequested ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                                              {isRequested ? <ArrowUpRight className="h-2.5 w-2.5 text-black" /> : <ArrowDownLeft className="h-2.5 w-2.5 text-black" />}
                                           </div>
                                        </div>
                                        <div className="min-w-0">
                                           <div className="flex items-center gap-2 mb-0.5">
                                              <p className="text-sm font-black text-zinc-100 uppercase truncate">{(booking as any).equipment?.name}</p>
                                              <Badge variant="outline" className={`text-[7px] h-3.5 px-1.5 font-black uppercase tracking-[0.1em] border-none ${isRequested ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                 {isRequested ? 'Saída' : 'Entrada'}
                                              </Badge>
                                           </div>
                                           <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest truncate">
                                              {isRequested ? 'Destino: Seu Estoque' : `Solicitante: ${booking.renter?.company?.name || booking.renter?.full_name || 'Desconhecido'}`}
                                           </p>
                                        </div>
                                     </div>
                                     
                                     <div className="flex items-center gap-8">
                                        <div className="text-right hidden sm:block">
                                           <p className="text-[8px] uppercase font-black text-zinc-600 tracking-[0.2em] mb-1">Previsão Retorno</p>
                                           <div className="flex items-center justify-end gap-1.5 text-[11px] font-black text-zinc-400 uppercase tracking-tighter">
                                              <CalendarDays className="h-3 w-3 text-primary" />
                                              {format(new Date(booking.end_date), "dd 'DE' MMM", { locale: ptBR })}
                                           </div>
                                        </div>
                                        <div className="text-right shrink-0 min-w-[100px]">
                                           <div className="text-sm font-black text-zinc-100">
                                              {(() => {
                                                 let amount = booking.total_amount;
                                                 if (isFulfiller && !isOwner) amount = amount * 0.5;
                                                 else if (isOwner && fulfillmentId && fulfillmentId !== tenantId) amount = amount * 0.5;
                                                 return formatCurrency(amount);
                                              })()}
                                           </div>
                                           <p className="text-[8px] uppercase font-black text-zinc-600 tracking-widest">{booking.status}</p>
                                        </div>
                                     </div>
                                  </div>
                                );
                              })}
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
             <div className="space-y-12">
               <InventoryTab
                  tenantId={tenantId || undefined}
                  onAdd={handleAddEquipment}
                  onEdit={handleEditEquipment}
                  onDelete={handleDeleteRequest}
               />
               {tenantId && <InventoryStatusReport companyId={tenantId} />}
             </div>
           )}

           {activeTab === 'bookings' && (() => {
             // Uma lista só: pedidos recebidos (sou a locadora) e enviados (eu aluguei)
             const byId = new Map<string, any>();
             (bookingsReceived || []).forEach((b: any) => byId.set(b.id, { ...b, _direction: 'received' }));
             (bookingsRequested || []).forEach((b: any) => { if (!byId.has(b.id)) byId.set(b.id, { ...b, _direction: 'sent' }); });
             const orders = [...byId.values()].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
             const order = openOrderId ? orders.find(o => o.id === openOrderId) : null;

             const counterpart = (o: any) => o._direction === 'received'
               ? (o.renter?.company?.name || o.renter?.full_name || 'Cliente')
               : (o.owner_company?.name || 'Locadora');
             const orderAmount = (o: any) => {
               if (o._direction === 'sent') return o.total_amount;
               const fulfillmentId = getFulfillmentId(o);
               const isFulfiller = fulfillmentId === tenantId;
               const isOwner = o.company_id === tenantId;
               if (isFulfiller && !isOwner) return o.total_amount * 0.5;
               if (isOwner && fulfillmentId && fulfillmentId !== tenantId) return o.total_amount * 0.5;
               return o.total_amount;
             };
             const statusBadge = (o: any) => {
               const st = ORDER_STATUS[o.status] || { label: o.status, className: '' };
               return <Badge className={`text-[10px] uppercase font-black tracking-wide ${st.className}`}>{st.label}</Badge>;
             };
             const directionBadge = (o: any) => o._direction === 'received'
               ? <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-400"><Inbox className="h-3 w-3" /> Recebido</span>
               : <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-sky-400"><Send className="h-3 w-3" /> Enviado</span>;
             const shortDate = (d: string) => format(new Date(d + 'T00:00'), 'dd/MM');

             // Ações rápidas de aprovação (locadora) e aceite de sub-locação
             const approvalActions = (o: any) => {
               const d = getDelivery(o);
               const fulfillmentId = getFulfillmentId(o);
               const isFulfiller = fulfillmentId === tenantId;
               const isOwner = o.company_id === tenantId;
               if (d?.subrental_status === 'pending' && isFulfiller && !isOwner) {
                 return (
                   <div className="flex flex-wrap items-center justify-end gap-3">
                     <p className="flex-1 text-[10px] text-amber-500 font-black uppercase tracking-widest">Aguardando seu aceite</p>
                     <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(o.id, 'rejected')} className="h-10 text-destructive font-black uppercase text-[10px] hover:bg-destructive/5 tracking-widest">Recusar</Button>
                     <Button size="sm" disabled={updatingId === d.id} onClick={() => handleAcceptSubrental(d.id)} className="h-10 bg-amber-500 text-black hover:bg-amber-400 font-black uppercase text-[10px] tracking-widest rounded-lg px-6">
                       {updatingId === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Aceitar Sub-locação'}
                     </Button>
                   </div>
                 );
               }
               if (o._direction === 'received' && o.status === 'pending') {
                 return (
                   <div className="flex justify-end gap-3">
                     <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(o.id, 'rejected')} className="h-10 text-destructive font-black uppercase text-[10px] hover:bg-destructive/5 tracking-widest">Recusar</Button>
                     <Button size="sm" disabled={updatingId === o.id} onClick={() => handleApproveBooking(o)} className="h-10 bg-emerald-600 hover:bg-emerald-500 font-black uppercase text-[10px] tracking-widest rounded-lg px-6">
                       {updatingId === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Aprovar agora'}
                     </Button>
                   </div>
                 );
               }
               return null;
             };

             // ── Detalhe do pedido (com a logística dentro) ──
             if (openOrderId) {
               if (!order) {
                 return (
                   <div className="text-center py-20 space-y-4">
                     <p className="text-zinc-500 font-bold">Pedido não encontrado.</p>
                     <Button variant="outline" onClick={closeOrder} className="rounded-xl">Voltar aos pedidos</Button>
                   </div>
                 );
               }
               const d = getDelivery(order);
               const actions = approvalActions(order);
               return (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                   <button onClick={closeOrder} className="flex items-center gap-2 h-11 -ml-2 px-2 rounded-xl text-zinc-400 hover:text-white transition-colors">
                     <ArrowLeft className="h-5 w-5" />
                     <span className="text-sm font-bold uppercase tracking-tighter">Pedidos</span>
                   </button>

                   <Card className="bg-zinc-900/30 border-zinc-900 rounded-3xl overflow-hidden">
                     <div className="p-5 md:p-8 space-y-6">
                       <div className="flex gap-4 items-start">
                         <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                           {order.equipment?.images?.[0]
                             ? <img src={order.equipment.images[0]} alt="" className="h-full w-full object-cover" />
                             : <Package className="h-6 w-6 text-zinc-700" />}
                         </div>
                         <div className="min-w-0 flex-1 space-y-1.5">
                           <div className="flex flex-wrap items-center gap-3">{directionBadge(order)}{statusBadge(order)}</div>
                           <h2 className="text-xl md:text-3xl font-black tracking-tighter uppercase leading-tight">{order.equipment?.name}</h2>
                           <p className="text-sm text-zinc-400 font-medium">
                             {order._direction === 'received' ? 'Cliente: ' : 'Locadora: '}
                             <span className="text-zinc-200 font-bold">{counterpart(order)}</span>
                           </p>
                         </div>
                       </div>

                       <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                         {[
                           { label: 'Período', value: `${shortDate(order.start_date)} → ${shortDate(order.end_date)}` },
                           { label: 'Quantidade', value: `${order.quantity || 1} un.` },
                           { label: 'Valor', value: formatCurrency(orderAmount(order)) },
                           { label: 'Entrega', value: order.delivery_method === 'delivery' ? 'Receber no local' : 'Retirada' },
                         ].map(info => (
                           <div key={info.label} className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-4 min-w-0">
                             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{info.label}</p>
                             <p className="text-sm font-black text-zinc-100 truncate">{info.value}</p>
                           </div>
                         ))}
                       </div>

                       {order.delivery_method === 'delivery' && order.delivery_address && (
                         <p className="text-sm text-zinc-400 flex gap-2"><MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {order.delivery_address}</p>
                       )}

                       {actions && <div className="pt-5 border-t border-zinc-800">{actions}</div>}

                       {(order._direction === 'received' || isAdmin) && (
                         <div className="flex gap-2 justify-end">
                           {order._direction === 'received' && (
                             <Button variant="ghost" size="sm" onClick={() => setEditingBooking(order)} className="h-10 rounded-xl text-zinc-400 hover:text-white gap-2 text-[11px] font-bold">
                               <Pencil className="h-3.5 w-3.5" /> Editar
                             </Button>
                           )}
                           {isAdmin && (
                             <Button variant="ghost" size="sm" disabled={deletingBookingId === order.id} onClick={() => setDeletingBookingId(order.id)} className="h-10 rounded-xl text-zinc-400 hover:text-red-500 gap-2 text-[11px] font-bold">
                               {deletingBookingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Excluir
                             </Button>
                           )}
                         </div>
                       )}
                     </div>
                   </Card>

                   {/* Localização ao vivo: visível para a locadora e para o cliente */}
                   {d?.status === 'shipped' && (
                     <div className="space-y-3">
                       <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Localização do equipamento</h3>
                       <div className="h-80 md:h-96 rounded-3xl overflow-hidden border border-zinc-800">
                         <DeliveryMap bookingId={order.id} />
                       </div>
                     </div>
                   )}

                   <div className="space-y-3">
                     <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Entrega</h3>
                     <LogisticsTab tenantId={tenantId || ''} bookingId={order.id} />
                   </div>
                 </div>
               );
             }

             // ── Lista de pedidos ──
             return (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <header className="mb-8">
                   <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase mb-2">Pedidos</h2>
                   <p className="text-zinc-500 font-medium">Toque em um pedido para ver os detalhes, a entrega e a localização.</p>
                 </header>

                 {orders.length === 0 ? (
                   <div className="border border-dashed border-zinc-800 rounded-3xl p-12 text-center">
                     <p className="text-zinc-500 font-bold">Nenhum pedido ainda.</p>
                   </div>
                 ) : (
                   <div className="space-y-3">
                     {orders.map((o: any) => {
                       const actions = approvalActions(o);
                       return (
                         <Card key={o.id} className="bg-zinc-900/30 border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
                           <button onClick={() => openOrder(o.id)} className="w-full text-left p-4 md:p-6 flex items-center gap-4">
                             <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                               {o.equipment?.images?.[0]
                                 ? <img src={o.equipment.images[0]} alt="" className="h-full w-full object-cover" />
                                 : <Package className="h-5 w-5 text-zinc-700" />}
                             </div>
                             <div className="min-w-0 flex-1 space-y-1">
                               {directionBadge(o)}
                               <p className="font-black text-zinc-100 tracking-tight uppercase truncate">{o.equipment?.name}</p>
                               <p className="text-xs text-zinc-500 truncate">
                                 {counterpart(o)} · {shortDate(o.start_date)} → {shortDate(o.end_date)} · {o.quantity || 1} un.
                               </p>
                             </div>
                             <div className="text-right shrink-0 space-y-1.5">
                               <p className="text-base md:text-lg font-black text-zinc-100">{formatCurrency(orderAmount(o))}</p>
                               {statusBadge(o)}
                             </div>
                             <ChevronRight className="h-5 w-5 text-zinc-600 shrink-0 hidden sm:block" />
                           </button>
                           {actions && <div className="px-4 md:px-6 py-3 bg-zinc-900/50 border-t border-zinc-800">{actions}</div>}
                         </Card>
                       );
                     })}
                   </div>
                 )}
               </div>
             );
           })()}

           {activeTab === 'projects' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <ProjectsTab />
             </div>
           )}

           {activeTab === 'transfers' && (
             <InternalTransfersSection />
           )}

            {activeTab === 'reports' && (
              <ReportsTab tenantId={tenantId || undefined} />
            )}

           {activeTab === 'network' && (
             <BranchesTab tenantId={tenantId || ''} />
           )}

            {activeTab === 'audit' && (
              <AuditTab />
            )}

            {activeTab === 'history' && (
              <OrderHistoryTab />
            )}

            {activeTab === 'favorites' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="mb-10">
                   <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">Favoritos</h2>
                   <p className="text-zinc-500 font-medium">Itens que você salvou para acesso rápido.</p>
                </header>
                
                <FavoritesTabContent onSelect={(eq) => {
                  setEditingEquipment(eq); // Opcional: mostrar detalhes ou abrir modal de reserva
                  // Para este protótipo, podemos redirecionar ou abrir um modal
                }} />
              </div>
            )}

            {activeTab === 'settings' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="mb-10">
                   <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">Ajustes</h2>
                   <p className="text-zinc-500 font-medium">Configurações da sua locadora e conta.</p>
                </header>
                
                {company && (
                  <div className="space-y-12">
                    <CompanyProfileSettings />
                    <FinancialSettings 
                      companyId={company.id} 
                      initialConfig={(company as any).financial_config} 
                    />
                    <PrivacySettings />
                   </div>
                )}
              </div>
            )}
            </motion.div>
           </AnimatePresence>

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

      
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
      />

      <EditBookingModal
        booking={editingBooking}
        isOpen={!!editingBooking}
        onClose={() => setEditingBooking(null)}
      />

      <ConfirmDeleteModal
        isOpen={!!deletingBookingId}
        onClose={() => setDeletingBookingId(null)}
        onConfirm={async () => {
          if (deletingBookingId) {
            await deleteBookingMutation.mutateAsync(deletingBookingId);
            setDeletingBookingId(null);
          }
        }}
        loading={deleteBookingMutation.isPending}
      />

    </div>
  );
}

// ─── Favorites Tab Content ──────────────────────────────────────────────
function FavoritesTabContent({ onSelect }: { onSelect: (eq: any) => void }) {
  const { favoriteIds, isLoading: isLoadingIds } = useFavorites();
  const { data: favoriteEquipmentsPage, isLoading: isLoadingEquipments } = useEquipments({
    ids: favoriteIds && favoriteIds.length > 0 ? favoriteIds : ['__none__']
  });
  const favoriteEquipments = favoriteEquipmentsPage?.items ?? [];

  if (isLoadingIds || isLoadingEquipments) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-zinc-500 font-black uppercase text-[10px] tracking-widest">Sincronizando Favoritos...</p>
      </div>
    );
  }

  if (!favoriteIds || favoriteIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-20 w-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
          <Heart className="h-8 w-8 text-zinc-700" />
        </div>
        <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Lista Vazia</h3>
        <p className="text-zinc-500 max-w-xs mb-8">Você ainda não salvou nenhum equipamento como favorito.</p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-800 h-10 px-6 text-sm font-black uppercase tracking-widest transition-colors hover:bg-zinc-900 hover:text-zinc-100 text-zinc-300"
        >
          Explorar Marketplace
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {favoriteEquipments?.map((item) => (
        <EquipmentCard 
          key={item.id} 
          item={item} 
          onClick={() => onSelect(item)} 
        />
      ))}
    </div>
  );
}

