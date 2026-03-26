import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Loader2, 
  Plus, 
  Package, 
  TrendingUp, 
  CalendarDays, 
  AlertCircle, 
  BarChart3, 
  ArrowRight,
  MapPin
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
import { DeliveryMap } from '@/components/DeliveryMap';

// New Professional Components
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { InventoryTab } from '@/components/dashboard/InventoryTab';
import { ConfirmDeleteModal } from '@/components/dashboard/ConfirmDeleteModal';

type TabType = 'overview' | 'inventory' | 'bookings' | 'logistics' | 'settings';
const VALID_TABS: TabType[] = ['overview', 'inventory', 'bookings', 'logistics', 'settings'];

export default function Dashboard() {
  const { user } = useAuth();
  const { company, isLoading: isLoadingTenant, tenantId } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab is driven by URL ?tab= param — enables mobile BottomNav to switch tabs
  const rawTab = searchParams.get('tab') as TabType | null;
  const activeTab: TabType = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'overview';
  const setActiveTab = (tab: TabType) => setSearchParams({ tab }, { replace: true });
  
  const { data: bookingsReceived, isLoading: isLoadingReceived } = useBookings({
    companyId: tenantId || undefined
  });

  const { data: bookingsRequested } = useBookings({
    renterId: user?.id
  });

  const { data: equipments, isLoading: isLoadingEquipments } = useEquipments({
    companyId: tenantId || undefined
  });
  
  const deleteMutation = useDeleteEquipment();
  const updateStatusMutation = useUpdateBookingStatus();

  // Other UI state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHubDialogOpen, setIsHubDialogOpen] = useState(false);
  const [trackingBookingId, setTrackingBookingId] = useState<string | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<any | undefined>();
  const [bookingFilter, setBookingFilter] = useState<'received' | 'requested'>('received');
  
  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

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
          <h2 className="text-4xl font-black tracking-tighter italic uppercase">Análise em Curso</h2>
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

  const handleUpdateStatus = async (id: string, status: any) => {
    await updateStatusMutation.mutateAsync({ id, status });
  };

  return (
    <div className="flex bg-zinc-950 min-h-screen">
      {/* Desktop Sidebar */}
      <DashboardSidebar 
        activeTab={activeTab} 
        onTabChange={(tab) => setActiveTab(tab)} 
        companyName={company?.name} 
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header Section (Mobile Visible) */}
        <header className="h-20 border-b border-zinc-900 flex items-center justify-between px-6 md:px-10 shrink-0">
           <div className="flex items-center gap-3 md:hidden">
              <Package className="h-6 w-6 text-primary" />
              <span className="font-black italic uppercase tracking-tighter text-lg">{company?.name}</span>
           </div>
           
           <div className="hidden md:block">
              <h1 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500 italic">Área de Gestão</h1>
           </div>

           <div className="flex items-center gap-4">
              <Button 
                onClick={() => setIsHubDialogOpen(true)} 
                variant="outline"
                className="h-10 text-[10px] font-black uppercase tracking-widest border-primary/30 text-primary hover:bg-primary/5 rounded-xl hidden sm:flex"
              >
                Solicitar Suplemento
              </Button>
              <div className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
           </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-24 md:pb-10 md:p-10 custom-scrollbar">
           
           {/* Tab Rendering */}
           {activeTab === 'overview' && (
             <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <header>
                   <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Visão Geral</h2>
                   <p className="text-zinc-500 font-medium">O pulso financeiro e operacional da sua locadora hoje.</p>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                   <Card className="bg-zinc-900/50 border-zinc-900 rounded-3xl overflow-hidden hover:border-primary/20 transition-all group">
                      <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                         <CardTitle className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em]">Receita Total</CardTitle>
                         <TrendingUp className="h-4 w-4 text-emerald-500" />
                      </CardHeader>
                      <CardContent className="p-6 pt-0">
                         <div className="text-3xl font-black italic tracking-tighter text-zinc-100 mb-1">
                            {formatCurrency(totalRevenue)}
                         </div>
                         <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Baseado em itens entregues</p>
                      </CardContent>
                   </Card>

                   <Card className="bg-zinc-900/50 border-zinc-900 rounded-3xl overflow-hidden hover:border-primary/20 transition-all">
                      <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                         <CardTitle className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em]">Reservas Ativas</CardTitle>
                         <CalendarDays className="h-4 w-4 text-zinc-600" />
                      </CardHeader>
                      <CardContent className="p-6 pt-0">
                         <div className="text-3xl font-black italic tracking-tighter text-zinc-100 mb-1">{activeBookings}</div>
                         <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{pendingBookingsCount} Pendentes</p>
                      </CardContent>
                   </Card>

                   <Card className="bg-zinc-900/50 border-zinc-900 rounded-3xl overflow-hidden hover:border-primary/20 transition-all">
                      <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                         <CardTitle className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em]">Frota Estocada</CardTitle>
                         <Package className="h-4 w-4 text-zinc-600" />
                      </CardHeader>
                      <CardContent className="p-6 pt-0">
                         <div className="text-3xl font-black italic tracking-tighter text-zinc-100 mb-1">{equipments?.length || 0}</div>
                         <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Itens cadastrados</p>
                      </CardContent>
                   </Card>

                   <Card className="bg-zinc-900/50 border-zinc-900 rounded-3xl overflow-hidden hover:border-destructive/20 transition-all">
                      <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                         <CardTitle className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em]">Em Manutenção</CardTitle>
                         <AlertCircle className="h-4 w-4 text-destructive" />
                      </CardHeader>
                      <CardContent className="p-6 pt-0">
                         <div className="text-3xl font-black italic tracking-tighter text-destructive mb-1">{maintenanceCount}</div>
                         <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Atenção requerida</p>
                      </CardContent>
                   </Card>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                   <Card className="xl:col-span-2 bg-zinc-950 border-zinc-900 rounded-3xl">
                      <CardHeader className="p-8 border-b border-zinc-900 flex flex-row items-center justify-between">
                         <CardTitle className="text-xl font-black italic tracking-tighter uppercase">Pedidos Recentes</CardTitle>
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
                                         <p className="text-sm font-black text-zinc-100 italic uppercase truncate">{(booking as any).equipment?.name}</p>
                                         <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest truncate">Cliente: {booking.renter?.full_name || 'Usuário'}</p>
                                      </div>
                                   </div>
                                   <div className="text-right shrink-0">
                                      <div className="text-sm font-black text-zinc-100 italic">{formatCurrency(booking.total_amount)}</div>
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
                         <CardTitle className="text-xl font-black italic tracking-tighter uppercase">Destaques</CardTitle>
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
                      <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Pedidos</h2>
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
                             <div className="h-12 w-12 rounded-2xl bg-zinc-800 flex items-center justify-center font-black text-zinc-500 border border-zinc-700">
                                {booking.renter?.full_name?.charAt(0) || 'U'}
                             </div>
                             <div>
                                <p className="font-black text-zinc-100 tracking-tight">{booking.renter?.full_name || 'Minha Empresa'}</p>
                                <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">{booking.equipment?.name}</p>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-8">
                             <div className="text-right hidden sm:block">
                                <p className="text-[9px] uppercase font-black text-zinc-600 tracking-widest mb-1">Período</p>
                                <p className="text-xs font-bold text-zinc-400">{format(new Date(booking.start_date), "dd/MM")} - {format(new Date(booking.end_date), "dd/MM")}</p>
                             </div>
                             <div className="text-right">
                                <div className="text-lg font-black italic text-zinc-100">{formatCurrency(booking.total_amount)}</div>
                                <Badge className="text-[8px] uppercase font-black uppercase tracking-tighter h-4">{booking.status}</Badge>
                             </div>
                          </div>
                       </div>
                       
                       {bookingFilter === 'received' && booking.status === 'pending' && (
                         <div className="px-6 py-4 bg-zinc-900/50 flex justify-end gap-3 border-t border-zinc-800">
                            <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(booking.id, 'rejected')} className="text-destructive font-black uppercase text-[10px] hover:bg-destructive/5 tracking-widest">Recusar</Button>
                            <Button size="sm" onClick={() => handleUpdateStatus(booking.id, 'approved')} className="bg-emerald-600 hover:bg-emerald-500 font-black uppercase text-[10px] tracking-widest rounded-lg px-6">Aprovar agora</Button>
                         </div>
                       )}
                    </Card>
                  ))}
                </div>
             </div>
           )}

           {activeTab === 'logistics' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="mb-10">
                   <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Logística</h2>
                   <p className="text-zinc-500 font-medium">Controle de entradas e saídas diárias.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden">
                      <CardHeader className="p-8 border-b border-zinc-900">
                         <div className="flex items-center gap-3">
                            <ArrowRight className="h-5 w-5 text-emerald-500 rotate-45" />
                            <CardTitle className="text-xl font-black italic tracking-tighter uppercase">Saídas Hoje</CardTitle>
                         </div>
                      </CardHeader>
                      <CardContent className="p-8">
                         <p className="text-zinc-600 text-sm font-medium italic">Nenhuma saída pendente para hoje.</p>
                      </CardContent>
                   </Card>

                   <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden">
                      <CardHeader className="p-8 border-b border-zinc-900">
                         <div className="flex items-center gap-3">
                            <ArrowRight className="h-5 w-5 text-blue-500 -rotate-[135deg]" />
                            <CardTitle className="text-xl font-black italic tracking-tighter uppercase">Retornos Hoje</CardTitle>
                         </div>
                      </CardHeader>
                      <CardContent className="p-8">
                         <p className="text-zinc-600 text-sm font-medium italic">Nenhum retorno esperado para hoje.</p>
                      </CardContent>
                   </Card>
                </div>
             </div>
           )}

           {activeTab === 'settings' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="mb-10">
                   <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Ajustes</h2>
                   <p className="text-zinc-500 font-medium">Configurações da sua locadora e conta.</p>
                </header>
                <Card className="bg-zinc-900/20 border-zinc-900 border-dashed rounded-3xl p-20 text-center">
                   <AlertCircle className="h-10 w-10 text-zinc-800 mx-auto mb-4" />
                   <p className="text-zinc-600 font-medium">Configurações financeiras e dados fiscais em breve.</p>
                </Card>
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
        isOpen={!!trackingBookingId} 
        onClose={() => setTrackingBookingId(null)}
        title="Rastreio da Entrega"
      >
        {trackingBookingId && <DeliveryMap bookingId={trackingBookingId} />}
      </Dialog>
      
      <ConfirmDeleteModal 
        isOpen={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)} 
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
