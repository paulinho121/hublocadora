import { useState, useEffect } from 'react';
import { friendlyError } from '@/lib/errors';
import { toast } from 'sonner';
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
import { confirmAction } from '@/components/ui/confirm-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { weekdayShort, formatShootDays } from '@/lib/schedule';

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
import { OrderLiveLocation } from '@/components/DeliveryMap';
import { OrderReturnPanel } from '@/components/dashboard/OrderReturnPanel';
import { OrderProgress } from '@/components/dashboard/OrderProgress';
import { ThemeToggle } from '@/components/ui/theme-toggle';

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
import { PendingActions, buildPendingActions } from '@/components/dashboard/PendingActions';
import { OverviewHero } from '@/components/dashboard/OverviewHero';
import { QuickShortcuts } from '@/components/dashboard/QuickShortcuts';
import { FileText, History, Settings, LayoutGrid, Clapperboard, ShoppingBag } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

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

  // Prorrogações aguardando resposta (selo na lista de pedidos). Sem a V41 a tabela
  // não existe: a consulta falha e a lista só fica sem o selo.
  const { data: pendingExtensionIds } = useQuery({
    queryKey: ['booking-extensions-pending'],
    queryFn: async () => {
      const { data, error } = await supabase.from('booking_extensions').select('booking_id').eq('status', 'pending');
      if (error) return new Set<string>();
      return new Set((data || []).map((e: any) => e.booking_id as string));
    },
    staleTime: 30_000,
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
  // Aprovação/recusa do pedido inteiro (vários itens do mesmo carrinho)
  const [bulkUpdatingKey, setBulkUpdatingKey] = useState<string | null>(null);

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
              <div className="relative bg-zinc-900 w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-zinc-800 shadow-2xl">
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

  // Na Visão geral (celular) o cabeçalho usa a cor da marca, emendado com o topo
  const onBrandHeader = activeTab === 'overview';

  // Perfil: quem ainda não tem equipamento nem pedido recebido usa o app só para alugar
  const isRenterOnly = !isLoadingEquipments && !isLoadingReceived
    && equipments.length === 0 && (bookingsReceived?.length || 0) === 0;
  const sentLive = (bookingsRequested || []).filter((b: any) => !['rejected', 'cancelled'].includes(b.status));
  const sentInProgress = sentLive.filter((b: any) => b.status === 'approved' || b.status === 'active').length;
  const sentAwaiting = sentLive.filter((b: any) => b.status === 'pending').length;
  const sentTotal = sentLive.reduce((acc: number, b: any) => acc + (b.total_amount || 0), 0);

  // Mais alugados (pedidos recebidos confirmados, por equipamento)
  type TopItem = { name: string; image?: string; count: number };
  const topRented = Object.values<TopItem>(
    (bookingsReceived || [])
      .filter((b: any) => ['approved', 'active', 'completed'].includes(b.status))
      .reduce((acc: Record<string, TopItem>, b: any) => {
        const key = b.equipment?.name || b.equipment_id;
        acc[key] = acc[key] || { name: b.equipment?.name || 'Equipamento', image: b.equipment?.images?.[0], count: 0 };
        acc[key].count += b.quantity || 1;
        return acc;
      }, {}),
  ).sort((a, b) => b.count - a.count).slice(0, 3);

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
      toast.error('Não foi possível atualizar o pedido. Tente novamente.');
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
      toast.error('Não foi possível aceitar a sub-locação.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Ao clicar "Aprovar agora": busca sub-locadoras que têm o item para o master escolher
  // Cliente confirma que recebeu o equipamento: entrega "confirmada" e pedido "em andamento"
  const handleConfirmReceipt = async (booking: any, delivery: any) => {
    setUpdatingId(delivery.id);
    try {
      const { error } = await supabase.from('deliveries').update({ status: 'confirmed' }).eq('id', delivery.id);
      if (error) throw error;
      const { error: bookingError } = await supabase.from('bookings').update({ status: 'active' }).eq('id', booking.id);
      if (bookingError) throw bookingError;
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    } catch (error: any) {
      toast.error(`Não foi possível confirmar: ${friendlyError(error)}`);
    } finally {
      setUpdatingId(null);
    }
  };

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
                 <p className="text-emerald-950 text-[11px] font-bold tracking-tighter">O Hub acaba de direcionar um pedido para sua unidade.</p>
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
        {/* No celular (app instalado) o topo começa abaixo da barra de status do aparelho */}
        {/* Na Visão geral o cabeçalho do celular faz parte do topo colorido: sem linha divisória.
            (sem a classe border-zinc-900, que o tema claro pinta de cinza; --color-white volta a ser branco) */}
        <header className={`box-content h-16 md:h-20 pt-[env(safe-area-inset-top)] md:pt-0 flex items-center justify-between px-4 md:px-10 shrink-0 ${onBrandHeader
          ? 'max-md:bg-[#2b2b30] max-md:text-white max-md:[--color-white:#fff] md:border-b md:border-zinc-800'
          : 'border-b border-zinc-900'}`}>
           <div className="flex items-center gap-3 md:hidden min-w-0">
              <div className={`h-10 w-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${onBrandHeader ? 'bg-white/15' : 'bg-zinc-900 border border-zinc-800'}`}>
                {company?.logo_url
                  ? <img src={company.logo_url} alt="" className="h-full w-full object-cover" />
                  : <span className={`text-sm font-bold ${onBrandHeader ? 'text-white' : 'text-primary'}`}>{(company?.name || 'C').trim().charAt(0).toUpperCase()}</span>}
              </div>
              <div className="min-w-0 leading-tight">
                <p className={`text-xs ${onBrandHeader ? 'text-white/75' : 'text-zinc-500'}`}>Olá,</p>
                <p className="text-base font-semibold truncate">{isBranchManager ? branch?.name : company?.name}</p>
              </div>
           </div>
           
           <div className="hidden md:block">
              <h1 className="text-sm font-black uppercase tracking-wider text-zinc-500">Área de Gestão</h1>
           </div>

           <div className="flex items-center gap-2 md:gap-3">
              {/* Refresh button — visible on mobile (PWA) */}
              <button aria-label="Atualizar aplicativo"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`md:hidden h-10 w-10 flex items-center justify-center transition-all active:scale-95 ${onBrandHeader
                  ? 'rounded-full bg-white/15 text-white hover:bg-white/25'
                  : 'rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5'}`}
                title="Atualizar aplicativo"
              >
                <RefreshCw className={`h-4 w-4 transition-transform duration-700 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>

              {/* No celular o menu do topo some no painel: tema e sino ficam aqui */}
              <ThemeToggle className="md:hidden" onBrand={onBrandHeader} />
              <div className="md:hidden">
                 <NotificationCenter onBrand={onBrandHeader} />
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
                 <div>
                <h2 className="sr-only">Visão geral</h2>
                {isRenterOnly ? (
                  <OverviewHero
                    label="Total em locações"
                    value={formatCurrency(sentTotal)}
                    sub={`${sentInProgress} em andamento · ${sentAwaiting} aguardando aprovação`}
                    actions={[
                      { label: 'Alugar equipamento', onClick: () => { window.location.href = '/'; } },
                      { label: 'Meus pedidos', onClick: () => setActiveTab('bookings') },
                    ]}
                  />
                ) : (
                  <OverviewHero
                    label="Ganhos líquidos"
                    value={formatCurrency(totalRevenue)}
                    sub={pendingRevenue > 0
                      ? `+ ${formatCurrency(pendingRevenue)} a confirmar`
                      : thisMonthRevenue > 0
                        ? `${formatCurrency(thisMonthRevenue)} este mês`
                        : 'Nenhuma receita confirmada ainda'}
                    actions={[
                      { label: 'Ver pedidos', onClick: () => setActiveTab('bookings') },
                      { label: 'Novo equipamento', onClick: () => { setActiveTab('inventory'); handleAddEquipment(); } },
                    ]}
                  />
                )}

                {/* Folha clara com cantos arredondados que sobe por cima do topo (no celular) */}
                <div className="relative -mt-8 md:mt-8 -mx-4 md:mx-0 px-4 md:px-0 pt-5 md:pt-0 rounded-t-3xl md:rounded-none bg-zinc-950 md:bg-transparent space-y-8 md:space-y-10">

                {/* Atalhos (no computador a barra lateral faz esse papel) */}
                <div className="md:hidden">
                  <QuickShortcuts
                    items={[
                      { id: 'bookings',  label: 'Pedidos',     icon: CalendarDays, onClick: () => setActiveTab('bookings'),
                        badge: buildPendingActions({ bookingsReceived: bookingsReceived || [], bookingsRequested: bookingsRequested || [], pendingExtensionIds, tenantId }).length },
                      isRenterOnly
                        ? { id: 'favorites', label: 'Favoritos',  icon: Heart,        onClick: () => setActiveTab('favorites') }
                        : { id: 'inventory', label: 'Inventário', icon: Package,      onClick: () => setActiveTab('inventory') },
                      { id: 'market',    label: 'Marketplace', icon: ShoppingBag,  onClick: () => { window.location.href = '/'; } },
                      { id: 'projects',  label: 'Projetos',    icon: Clapperboard, onClick: () => setActiveTab('projects') },
                      { id: 'reports',   label: 'Relatórios',  icon: FileText,     onClick: () => setActiveTab('reports') },
                      { id: 'history',   label: 'Histórico',   icon: History,      onClick: () => setActiveTab('history') },
                      { id: 'settings',  label: 'Ajustes',     icon: Settings,     onClick: () => setActiveTab('settings') },
                      { id: 'more',      label: 'Ver mais',    icon: LayoutGrid,   onClick: () => window.dispatchEvent(new Event('cinehub-open-menu')) },
                    ]}
                  />
                </div>

                {/* O que precisa ser feito agora (aprovar, separar, entregar, devolver…) */}
                <PendingActions
                  bookingsReceived={bookingsReceived || []}
                  bookingsRequested={bookingsRequested || []}
                  pendingExtensionIds={pendingExtensionIds}
                  tenantId={tenantId}
                  onOpen={openOrder}
                />

                {/* Stats Grid */}
                {isRenterOnly ? (
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    {[
                      { label: 'Em andamento', value: String(sentInProgress), sub: 'aprovados ou com você', icon: CalendarDays },
                      { label: 'Aguardando', value: String(sentAwaiting), sub: 'aprovação da locadora', icon: AlertCircle },
                    ].map(({ label, value, sub, icon: Icon }) => (
                      <Card key={label} className="clay-card">
                        <CardHeader className="p-3 md:p-4 pb-1 md:pb-1 flex flex-row items-start justify-between gap-2 space-y-0">
                          <CardTitle className="text-[11px] md:text-xs font-semibold text-zinc-500 leading-tight">{label}</CardTitle>
                          <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 text-zinc-400" />
                        </CardHeader>
                        <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
                          <div className="text-lg md:text-2xl font-bold tracking-tight text-zinc-100 mb-1 truncate">{value}</div>
                          <p className="text-[11px] md:text-xs leading-snug text-zinc-400 font-medium">{sub}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                 <div className="grid grid-cols-6 lg:grid-cols-4 gap-2 md:gap-4">
                    <Card className="clay-card col-span-6 lg:col-span-1">
                       <CardHeader className="p-3 md:p-4 pb-1 md:pb-1 flex flex-row items-start justify-between gap-2 space-y-0">
                          <CardTitle className="text-[11px] md:text-xs font-semibold text-zinc-500 leading-tight">Taxas e repasses</CardTitle>
                          <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 text-red-500" />
                       </CardHeader>
                       <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
                          <div className={`text-lg md:text-2xl font-bold tracking-tight mb-1 ${totalDebt > 0 ? 'text-red-400' : 'text-zinc-100'}`}>
                             {formatCurrency(totalDebt)}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <p className="text-[11px] md:text-xs leading-snug text-zinc-400 font-medium">
                              Taxa CineHub (15%): {formatCurrency(hubFee)}
                            </p>
                            {partnerDebt > 0 && (
                              <p className="text-[11px] md:text-xs leading-snug text-zinc-400 font-medium">
                                Parceiros: {formatCurrency(partnerDebt)}
                              </p>
                            )}
                          </div>
                       </CardContent>
                    </Card>

                    <Card className="clay-card col-span-2 lg:col-span-1">
                       <CardHeader className="p-3 md:p-4 pb-1 md:pb-1 flex flex-row items-start justify-between gap-2 space-y-0">
                          <CardTitle className="text-[11px] md:text-xs font-semibold text-zinc-500 leading-tight">Pedidos ativos</CardTitle>
                          <CalendarDays className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 text-zinc-400" />
                       </CardHeader>
                       <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
                          <div className="text-lg md:text-2xl font-bold tracking-tight text-zinc-100 mb-1">{activeBookings}</div>
                          <div className="flex flex-col gap-0.5">
                            {pendingBookingsCount > 0 && (
                              <p className="text-[11px] md:text-xs leading-snug text-amber-500/80 font-medium">
                                {pendingBookingsCount} aguardando aprovação
                              </p>
                            )}
                            <p className="text-[11px] md:text-xs leading-snug text-zinc-400 font-medium">
                              {completedBookings > 0 ? `${completedBookings} concluídas` : 'Nenhuma concluída'}
                            </p>
                          </div>
                       </CardContent>
                    </Card>

                    <Card className="clay-card col-span-2 lg:col-span-1">
                       <CardHeader className="p-3 md:p-4 pb-1 md:pb-1 flex flex-row items-start justify-between gap-2 space-y-0">
                          <CardTitle className="text-[11px] md:text-xs font-semibold text-zinc-500 leading-tight">Equipamentos</CardTitle>
                          <Package className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 text-zinc-400" />
                       </CardHeader>
                       <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
                          <div className="text-lg md:text-2xl font-bold tracking-tight text-zinc-100 mb-1">{equipments?.length || 0}</div>
                          <p className="text-[11px] md:text-xs leading-snug text-zinc-400 font-medium">
                            {maintenanceCount > 0
                              ? `${(equipments?.length || 0) - maintenanceCount} disponíveis`
                              : 'Todos disponíveis'}
                          </p>
                       </CardContent>
                    </Card>

                    <Card className="clay-card col-span-2 lg:col-span-1">
                       <CardHeader className="p-3 md:p-4 pb-1 md:pb-1 flex flex-row items-start justify-between gap-2 space-y-0">
                          <CardTitle className="text-[11px] md:text-xs font-semibold text-zinc-500 leading-tight">Em Manutenção</CardTitle>
                          <AlertCircle className={`h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 ${maintenanceCount > 0 ? 'text-destructive' : 'text-zinc-400'}`} />
                       </CardHeader>
                       <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
                          {/* Só alerta quando há equipamento parado; zero é bom sinal */}
                          <div className={`text-lg md:text-2xl font-bold tracking-tight mb-1 ${maintenanceCount > 0 ? 'text-destructive' : 'text-zinc-100'}`}>{maintenanceCount}</div>
                          <p className="text-[11px] md:text-xs leading-snug text-zinc-400 font-medium">{maintenanceCount > 0 ? 'Precisam de atenção' : 'Nenhum parado'}</p>
                       </CardContent>
                    </Card>
                 </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
                   <Card className="xl:col-span-2 bg-zinc-950 border-zinc-900 rounded-2xl">
                      <CardHeader className="p-4 md:p-6 border-b border-zinc-900 flex flex-row items-center justify-between">
                         <CardTitle className="text-lg font-black tracking-tighter uppercase">Pedidos Recentes</CardTitle>
                         <Button variant="ghost" onClick={() => setActiveTab('bookings')} className="h-10 text-[11px] font-semibold text-zinc-500 hover:text-white">Ver Todos</Button>
                      </CardHeader>
                      <CardContent className="p-0">
                         {recentOrders.length === 0 ? (
                           <EmptyState
                             compact
                             icon={Inbox}
                             title="Nenhum pedido recente"
                             description="Seus pedidos mais novos aparecem aqui."
                           />
                         ) : (
                           <div className="divide-y divide-zinc-900/50">
                              {recentOrders.map((booking: any) => {
                                const isRequested = booking.renter_id === user?.id;
                                const fulfillmentId = getFulfillmentId(booking);
                                const isFulfiller = fulfillmentId === tenantId;
                                const isOwner = booking.company_id === tenantId;
                                
                                return (
                                  <button
                                    key={booking.id}
                                    onClick={() => openOrder(booking.id)}
                                    className="w-full text-left p-4 md:p-6 flex items-center justify-between gap-3 hover:bg-zinc-900/30 transition-all group/item"
                                  >
                                     <div className="flex gap-4 items-center min-w-0 flex-1">
                                        <div className="relative">
                                           <div className="h-12 w-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-400 overflow-hidden shrink-0">
                                              {booking.equipment?.images?.[0] ? (
                                                <img src={booking.equipment.images[0]} alt="" className="w-full h-full object-cover group-hover/item:scale-110 transition-transform" />
                                              ) : (
                                                <Package className="h-4 w-4 text-zinc-500" />
                                              )}
                                           </div>
                                           <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-zinc-950 flex items-center justify-center shadow-xl ${isRequested ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                                              {isRequested ? <ArrowUpRight className="h-2.5 w-2.5 text-black" /> : <ArrowDownLeft className="h-2.5 w-2.5 text-black" />}
                                           </div>
                                        </div>
                                        <div className="min-w-0">
                                           <div className="flex items-center gap-2 mb-0.5">
                                              <p className="text-sm font-black text-zinc-100 uppercase truncate">{(booking as any).equipment?.name}</p>
                                              <Badge variant="outline" className={`text-[11px] h-3.5 px-1.5 font-semibold border-none ${isRequested ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                 {isRequested ? 'Saída' : 'Entrada'}
                                              </Badge>
                                           </div>
                                           <p className="text-[11px] text-zinc-500 font-bold truncate">
                                              {isRequested ? 'Destino: Seu Estoque' : `Solicitante: ${booking.renter?.company?.name || booking.renter?.full_name || 'Desconhecido'}`}
                                           </p>
                                        </div>
                                     </div>
                                     
                                     <div className="flex items-center gap-8">
                                        <div className="text-right hidden sm:block">
                                           <p className="text-[11px] font-semibold text-zinc-400 mb-1">Previsão Retorno</p>
                                           <div className="flex items-center justify-end gap-1.5 text-[11px] font-semibold text-zinc-400 tracking-tighter">
                                              <CalendarDays className="h-3 w-3 text-primary" />
                                              {/* 'T00:00' = meia-noite local; só a data seria lida como UTC e cairia no dia anterior */}
                                              {format(new Date(booking.end_date + 'T00:00'), "dd 'DE' MMM", { locale: ptBR })}
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
                                           <p className="text-[11px] font-semibold text-zinc-500 ">{ORDER_STATUS[booking.status]?.label || booking.status}</p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0 hidden sm:block" />
                                     </div>
                                  </button>
                                );
                              })}
                           </div>
                         )}
                      </CardContent>
                   </Card>

                   <Card className="bg-zinc-950 border-zinc-900 rounded-2xl">
                      <CardHeader className="p-4 md:p-6 border-b border-zinc-900">
                         <CardTitle className="text-lg font-black tracking-tighter uppercase">{isRenterOnly ? 'Tem equipamentos?' : 'Mais alugados'}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 md:p-6 space-y-4">
                         {isRenterOnly ? (
                           <p className="text-sm text-zinc-400 leading-relaxed">
                             Cadastre o seu inventário e comece a receber pedidos de outras produtoras.
                           </p>
                         ) : topRented.length === 0 ? (
                           <p className="text-sm text-zinc-500 leading-relaxed">
                             Assim que seus pedidos forem aprovados, os equipamentos mais alugados aparecem aqui.
                           </p>
                         ) : (
                           <ol className="space-y-3">
                             {topRented.map((item, i) => (
                               <li key={item.name} className="flex items-center gap-3">
                                 <span className="text-sm font-bold text-zinc-500 w-4">{i + 1}</span>
                                 <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                                   {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : <Package className="h-4 w-4 text-zinc-500" />}
                                 </div>
                                 <span className="flex-1 min-w-0 text-sm font-semibold text-zinc-200 truncate">{item.name}</span>
                                 <span className="text-xs font-semibold text-zinc-500 shrink-0">{item.count} {item.count === 1 ? 'locação' : 'locações'}</span>
                               </li>
                             ))}
                           </ol>
                         )}
                         <Button onClick={() => setActiveTab('inventory')} className="w-full rounded-xl font-semibold h-12 text-xs group">
                            {isRenterOnly ? 'Cadastrar equipamento' : 'Gerenciar inventário'} <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                         </Button>
                      </CardContent>
                   </Card>
                </div>
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

             // Itens finalizados juntos no carrinho (mesmo project_id) aparecem como um pedido só
             const groupMap = new Map<string, any[]>();
             orders.forEach(o => {
               const key = o.project_id || o.id;
               groupMap.set(key, [...(groupMap.get(key) || []), o]);
             });
             const groups = [...groupMap.entries()].map(([key, items]) => ({ key, items }));
             const openGroup = openOrderId && !order ? groupMap.get(openOrderId) : null;
             // Status do pedido = o do item menos avançado (recusados/cancelados só contam se forem todos)
             const STATUS_RANK: Record<string, number> = { pending: 0, approved: 1, active: 2, completed: 3, rejected: 4, cancelled: 5 };
             const groupLead = (items: any[]) => {
               const live = items.filter(o => o.status !== 'rejected' && o.status !== 'cancelled');
               return [...(live.length ? live : items)].sort((a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9))[0];
             };
             const projectLabel = (o: any) => {
               const line = (o.notes || '').split('\n')[0];
               const name = line.startsWith('Projeto: ') ? line.slice(9).trim() : '';
               return name && name !== 'Projeto via HUB' ? name : null;
             };
             const unitsOf = (items: any[]) => items.reduce((sum, o) => sum + (o.quantity || 1), 0);

             const handleApproveAll = async (key: string, items: any[]) => {
               setBulkUpdatingKey(key);
               try {
                 for (const o of items.filter(o => o.status === 'pending')) await handleApproveBooking(o);
               } finally {
                 setBulkUpdatingKey(null);
               }
             };
             const handleRejectAll = async (key: string, items: any[]) => {
               const pending = items.filter(o => o.status === 'pending');
               const ok = await confirmAction({
                 title: 'Recusar o pedido inteiro?',
                 description: `${pending.length} ${pending.length === 1 ? 'equipamento será recusado' : 'equipamentos serão recusados'}.`,
                 confirmLabel: 'Recusar tudo',
                 destructive: true,
               });
               if (!ok) return;
               setBulkUpdatingKey(key);
               try {
                 for (const o of pending) await handleUpdateStatus(o.id, 'rejected');
               } finally {
                 setBulkUpdatingKey(null);
               }
             };

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
               return <Badge className={`text-[11px] font-semibold tracking-wide ${st.className}`}>{st.label}</Badge>;
             };
             const directionBadge = (o: any) => o._direction === 'received'
               ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400"><Inbox className="h-3 w-3" /> Recebido</span>
               : <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400"><Send className="h-3 w-3" /> Enviado</span>;
             const shortDate = (d: string) => format(new Date(d + 'T00:00'), 'dd/MM');
             // Gravação (cobrada) quando o pedido tem; pedidos antigos mostram retirada → devolução
             const shootLabel = (o: any) => o.shoot_dates?.length
               ? formatShootDays(o.shoot_dates)
               : o.shoot_start_date
                 ? `${shortDate(o.shoot_start_date)}${o.shoot_end_date && o.shoot_end_date !== o.shoot_start_date ? ` a ${shortDate(o.shoot_end_date)}` : ''}`
                 : `${shortDate(o.start_date)} → ${shortDate(o.end_date)}`;
             const periodLine = (o: any) => o.shoot_start_date
               ? `grava ${shootLabel(o)}`
               : `${shortDate(o.start_date)} → ${shortDate(o.end_date)}`;
             const pickupReturn = (o: any) => `Retirada ${weekdayShort(o.start_date)} · Devolução ${weekdayShort(o.end_date)}`;

             // Ações rápidas de aprovação (locadora) e aceite de sub-locação
             const approvalActions = (o: any) => {
               const d = getDelivery(o);
               const fulfillmentId = getFulfillmentId(o);
               const isFulfiller = fulfillmentId === tenantId;
               const isOwner = o.company_id === tenantId;
               if (d?.subrental_status === 'pending' && isFulfiller && !isOwner) {
                 return (
                   <div className="flex flex-wrap items-center justify-end gap-3">
                     <p className="flex-1 text-[11px] text-amber-500 font-semibold ">Aguardando seu aceite</p>
                     <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(o.id, 'rejected')} className="h-10 text-destructive font-semibold text-[11px] hover:bg-destructive/5 ">Recusar</Button>
                     <Button size="sm" disabled={updatingId === d.id} onClick={() => handleAcceptSubrental(d.id)} className="h-10 bg-amber-500 text-black hover:bg-amber-400 font-semibold text-[11px] rounded-lg px-6">
                       {updatingId === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Aceitar Sub-locação'}
                     </Button>
                   </div>
                 );
               }
               // Cliente: o equipamento chegou → confirma o recebimento e o pedido fica "em andamento"
               if (o._direction === 'sent' && d?.status === 'delivered') {
                 return (
                   <div className="flex flex-wrap items-center justify-end gap-3">
                     <p className="flex-1 min-w-[180px] text-sm text-zinc-300">O equipamento foi entregue. Confira e confirme o recebimento.</p>
                     <Button
                       size="sm"
                       disabled={updatingId === d.id}
                       onClick={() => handleConfirmReceipt(o, d)}
                       className="h-11 bg-emerald-600 hover:bg-emerald-500 font-semibold text-[11px] rounded-xl px-6"
                     >
                       {updatingId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Recebi — confirmar e aceitar'}
                     </Button>
                   </div>
                 );
               }
               if (o._direction === 'received' && o.status === 'pending') {
                 return (
                   <div className="flex justify-end gap-3">
                     <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(o.id, 'rejected')} className="h-10 text-destructive font-semibold text-[11px] hover:bg-destructive/5 ">Recusar</Button>
                     <Button size="sm" disabled={updatingId === o.id} onClick={() => handleApproveBooking(o)} className="h-10 bg-emerald-600 hover:bg-emerald-500 font-semibold text-[11px] rounded-lg px-6">
                       {updatingId === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Aprovar agora'}
                     </Button>
                   </div>
                 );
               }
               return null;
             };

             // ── Pedido com vários itens: resumo + lista de itens ──
             if (openGroup && openGroup.length > 0) {
               const lead = groupLead(openGroup);
               const label = projectLabel(lead);
               const total = openGroup.reduce((sum, o) => sum + orderAmount(o), 0);
               const pendingCount = lead._direction === 'received' ? openGroup.filter(o => o.status === 'pending').length : 0;
               const busy = bulkUpdatingKey === openOrderId;
               return (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                   <button onClick={closeOrder} className="flex items-center gap-2 h-11 -ml-2 px-2 rounded-xl text-zinc-400 hover:text-white transition-colors">
                     <ArrowLeft className="h-5 w-5" />
                     <span className="text-sm font-bold uppercase tracking-tighter">Pedidos</span>
                   </button>

                   <Card className="bg-zinc-900/30 border-zinc-900 rounded-2xl overflow-hidden">
                     <div className="p-5 md:p-8 space-y-6">
                       <div className="space-y-1.5">
                         <div className="flex flex-wrap items-center gap-3">{directionBadge(lead)}{statusBadge(lead)}</div>
                         <h2 className="text-xl md:text-3xl font-black tracking-tighter uppercase leading-tight">
                           {label || `Pedido com ${openGroup.length} equipamentos`}
                         </h2>
                         <p className="text-sm text-zinc-400 font-medium">
                           {lead._direction === 'received' ? 'Cliente: ' : 'Locadora: '}
                           <span className="text-zinc-200 font-bold">{[...new Set(openGroup.map(counterpart))].join(', ')}</span>
                         </p>
                       </div>

                       <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                         {[
                           { label: lead.shoot_start_date ? 'Gravação' : 'Período', value: shootLabel(lead) },
                           { label: 'Itens', value: `${openGroup.length} equip. · ${unitsOf(openGroup)} un.` },
                           { label: 'Valor total', value: formatCurrency(total) },
                           { label: 'Entrega', value: lead.delivery_method === 'delivery' ? 'Receber no local' : 'Retirada' },
                         ].map(info => (
                           <div key={info.label} className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-4 min-w-0">
                             <p className="text-[11px] font-semibold text-zinc-500 mb-1">{info.label}</p>
                             <p className="text-sm font-black text-zinc-100 truncate">{info.value}</p>
                           </div>
                         ))}
                       </div>

                       <p className="text-sm text-zinc-400 flex gap-2"><CalendarDays className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {pickupReturn(lead)}</p>

                       {lead.delivery_method === 'delivery' && lead.delivery_address && (
                         <p className="text-sm text-zinc-400 flex gap-2"><MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {lead.delivery_address}</p>
                       )}

                       {pendingCount > 0 && (
                         <div className="pt-5 border-t border-zinc-800 flex flex-wrap items-center justify-end gap-3">
                           <p className="flex-1 min-w-[180px] text-sm text-zinc-300">
                             {pendingCount === openGroup.length ? 'Aprove o pedido inteiro ou cada item abaixo.' : `${pendingCount} ${pendingCount === 1 ? 'item aguarda' : 'itens aguardam'} sua aprovação.`}
                           </p>
                           <Button variant="ghost" size="sm" disabled={busy} onClick={() => handleRejectAll(openOrderId!, openGroup)} className="h-11 text-destructive font-semibold text-xs hover:bg-destructive/5">
                             Recusar tudo
                           </Button>
                           <Button size="sm" disabled={busy} onClick={() => handleApproveAll(openOrderId!, openGroup)} className="h-11 bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs rounded-xl px-6">
                             {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Aprovar tudo (${pendingCount})`}
                           </Button>
                         </div>
                       )}
                     </div>
                   </Card>

                   <div className="space-y-3">
                     <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Equipamentos</h3>
                     <p className="text-sm text-zinc-500 -mt-1">Toque em um item para ver a entrega, a localização e a devolução.</p>
                     {openGroup.map((o: any) => {
                       const itemActions = approvalActions(o);
                       return (
                         <Card key={o.id} className="bg-zinc-900/30 border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
                           <button onClick={() => openOrder(o.id)} className="w-full text-left p-4 md:p-5 flex items-center gap-4">
                             <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                               {o.equipment?.images?.[0]
                                 ? <img src={o.equipment.images[0]} alt="" className="h-full w-full object-cover" />
                                 : <Package className="h-5 w-5 text-zinc-500" />}
                             </div>
                             <div className="min-w-0 flex-1 space-y-1">
                               <p className="font-black text-zinc-100 tracking-tight uppercase truncate">{o.equipment?.name}</p>
                               <p className="text-xs text-zinc-500 truncate">{o.quantity || 1} un. · {formatCurrency(orderAmount(o))}</p>
                               <OrderProgress compact bookingStatus={o.status} deliveryStatus={getDelivery(o)?.status} />
                             </div>
                             <div className="shrink-0">{statusBadge(o)}</div>
                             <ChevronRight className="h-5 w-5 text-zinc-400 shrink-0 hidden sm:block" />
                           </button>
                           {itemActions && <div className="px-4 md:px-5 py-3 bg-zinc-900/50 border-t border-zinc-800">{itemActions}</div>}
                         </Card>
                       );
                     })}
                   </div>
                 </div>
               );
             }

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
               const actions = approvalActions(order);
               const parentKey = order.project_id && (groupMap.get(order.project_id)?.length || 0) > 1 ? order.project_id : null;
               return (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                   <button onClick={() => parentKey ? openOrder(parentKey) : closeOrder()} className="flex items-center gap-2 h-11 -ml-2 px-2 rounded-xl text-zinc-400 hover:text-white transition-colors">
                     <ArrowLeft className="h-5 w-5" />
                     <span className="text-sm font-bold uppercase tracking-tighter">{parentKey ? 'Pedido completo' : 'Pedidos'}</span>
                   </button>

                   <Card className="bg-zinc-900/30 border-zinc-900 rounded-2xl overflow-hidden">
                     <div className="p-5 md:p-8 space-y-6">
                       <div className="flex gap-4 items-start">
                         <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                           {order.equipment?.images?.[0]
                             ? <img src={order.equipment.images[0]} alt="" className="h-full w-full object-cover" />
                             : <Package className="h-6 w-6 text-zinc-500" />}
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

                       <OrderProgress bookingStatus={order.status} deliveryStatus={getDelivery(order)?.status} />

                       <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                         {[
                           { label: order.shoot_start_date ? 'Gravação' : 'Período', value: shootLabel(order) },
                           { label: 'Quantidade', value: `${order.quantity || 1} un.` },
                           { label: 'Valor', value: formatCurrency(orderAmount(order)) },
                           { label: 'Entrega', value: order.delivery_method === 'delivery' ? 'Receber no local' : 'Retirada' },
                         ].map(info => (
                           <div key={info.label} className="bg-zinc-950/60 border border-zinc-800/60 rounded-2xl p-4 min-w-0">
                             <p className="text-[11px] font-semibold text-zinc-500 mb-1">{info.label}</p>
                             <p className="text-sm font-black text-zinc-100 truncate">{info.value}</p>
                           </div>
                         ))}
                       </div>

                       <p className="text-sm text-zinc-400 flex gap-2"><CalendarDays className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {pickupReturn(order)}</p>

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
                   <OrderLiveLocation
                     bookingId={order.id}
                     title={order._direction === 'sent' ? 'Seu pedido está a caminho' : 'Equipamento a caminho do cliente'}
                   />

                   <div className="space-y-3">
                     <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Entrega</h3>
                     <LogisticsTab tenantId={tenantId || ''} bookingId={order.id} viewerRole={order._direction === 'sent' ? 'renter' : 'provider'} />
                   </div>

                   {/* Logística reversa: devolução e prorrogação */}
                   <OrderReturnPanel order={order} />
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
                   <EmptyState
                     icon={Inbox}
                     title="Nenhum pedido ainda"
                     description={equipments.length > 0
                       ? 'Os pedidos que você receber ou fizer aparecem aqui, com a entrega e a localização.'
                       : 'Quando você alugar um equipamento, o pedido aparece aqui para acompanhar a entrega.'}
                     action={{ label: 'Explorar equipamentos', onClick: () => { window.location.href = '/'; } }}
                     secondaryAction={equipments.length === 0 ? { label: 'Cadastrar equipamento', onClick: () => setActiveTab('inventory') } : undefined}
                   />
                 ) : (
                   <div className="space-y-3">
                     {groups.map(({ key, items }) => {
                       if (items.length > 1) {
                         const lead = groupLead(items);
                         const label = projectLabel(lead);
                         const total = items.reduce((sum, o) => sum + orderAmount(o), 0);
                         const names = items.map(o => o.equipment?.name).filter(Boolean).join(' + ');
                         const pendingCount = lead._direction === 'received' ? items.filter(o => o.status === 'pending').length : 0;
                         const busy = bulkUpdatingKey === key;
                         return (
                           <Card key={key} className="bg-zinc-900/30 border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
                             <button onClick={() => openOrder(key)} className="w-full text-left p-4 md:p-6 flex items-center gap-4">
                               {/* Fotos empilhadas dos itens */}
                               <div className="relative h-12 w-12 shrink-0">
                                 {items.slice(0, 2).map((o, i) => (
                                   <div key={o.id} className={`absolute h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center ${i === 0 ? 'top-0 left-0' : 'bottom-0 right-0 shadow-sm'}`}>
                                     {o.equipment?.images?.[0]
                                       ? <img src={o.equipment.images[0]} alt="" className="h-full w-full object-cover" />
                                       : <Package className="h-4 w-4 text-zinc-500" />}
                                   </div>
                                 ))}
                                 <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center">{items.length}</span>
                               </div>
                               <div className="min-w-0 flex-1 space-y-1">
                                 {directionBadge(lead)}
                                 <p className="font-black text-zinc-100 tracking-tight uppercase truncate">{label || `${items.length} equipamentos`}</p>
                                 <p className="text-xs text-zinc-500 truncate">{names}</p>
                                 <p className="text-xs text-zinc-500 truncate">
                                   {counterpart(lead)} · {periodLine(lead)} · {unitsOf(items)} un.
                                 </p>
                                 <OrderProgress compact bookingStatus={lead.status} deliveryStatus={getDelivery(lead)?.status} />
                               </div>
                               <div className="text-right shrink-0 space-y-1.5">
                                 <p className="text-base md:text-lg font-black text-zinc-100">{formatCurrency(total)}</p>
                                 {statusBadge(lead)}
                               </div>
                               <ChevronRight className="h-5 w-5 text-zinc-400 shrink-0 hidden sm:block" />
                             </button>
                             {pendingCount > 0 && (
                               <div className="px-4 md:px-6 py-3 bg-zinc-900/50 border-t border-zinc-800 flex justify-end gap-3">
                                 <Button variant="ghost" size="sm" disabled={busy} onClick={() => handleRejectAll(key, items)} className="h-10 text-destructive font-semibold text-[11px] hover:bg-destructive/5">Recusar tudo</Button>
                                 <Button size="sm" disabled={busy} onClick={() => handleApproveAll(key, items)} className="h-10 bg-emerald-600 hover:bg-emerald-500 font-semibold text-[11px] rounded-lg px-6">
                                   {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : `Aprovar tudo (${pendingCount})`}
                                 </Button>
                               </div>
                             )}
                           </Card>
                         );
                       }

                       const o = items[0];
                       const actions = approvalActions(o);
                       return (
                         <Card key={o.id} className="bg-zinc-900/30 border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
                           <button onClick={() => openOrder(o.id)} className="w-full text-left p-4 md:p-6 flex items-center gap-4">
                             <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                               {o.equipment?.images?.[0]
                                 ? <img src={o.equipment.images[0]} alt="" className="h-full w-full object-cover" />
                                 : <Package className="h-5 w-5 text-zinc-500" />}
                             </div>
                             <div className="min-w-0 flex-1 space-y-1">
                               {directionBadge(o)}
                               <p className="font-black text-zinc-100 tracking-tight uppercase truncate">{o.equipment?.name}</p>
                               <p className="text-xs text-zinc-500 truncate">
                                 {counterpart(o)} · {periodLine(o)} · {o.quantity || 1} un.
                               </p>
                               <OrderProgress compact bookingStatus={o.status} deliveryStatus={getDelivery(o)?.status} />
                               {(() => {
                                 const rev = getDelivery(o)?.reverse_logistics_status;
                                 const tags: string[] = [];
                                 if (pendingExtensionIds?.has(o.id)) tags.push('Prorrogação pendente');
                                 if (rev === 'requested') tags.push('Devolução pedida');
                                 if (rev === 'collecting' || rev === 'in_transit') tags.push('Coleta em andamento');
                                 if (rev === 'returned') tags.push('Devolvido · em conferência');
                                 return tags.length > 0 && (
                                   <p className="text-[11px] font-bold text-amber-400 truncate">{tags.join(' · ')}</p>
                                 );
                               })()}
                             </div>
                             <div className="text-right shrink-0 space-y-1.5">
                               <p className="text-base md:text-lg font-black text-zinc-100">{formatCurrency(orderAmount(o))}</p>
                               {statusBadge(o)}
                             </div>
                             <ChevronRight className="h-5 w-5 text-zinc-400 shrink-0 hidden sm:block" />
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
        <p className="text-zinc-500 font-semibold text-[11px] ">Carregando favoritos...</p>
      </div>
    );
  }

  if (!favoriteIds || favoriteIds.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Nenhum favorito ainda"
        description="Toque no coração de um equipamento no marketplace para salvá-lo aqui."
        action={{ label: 'Explorar equipamentos', onClick: () => { window.location.href = '/'; } }}
      />
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

