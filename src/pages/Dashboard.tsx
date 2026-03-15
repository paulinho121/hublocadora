import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Package,
  CalendarDays,
  Settings,
  TrendingUp,
  AlertCircle,
  Plus,
  Loader2,
  Edit2,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuth } from '@/contexts/AuthContext';
import { useBookings } from '@/hooks/useBookings';
import { useEquipments, useCompany, useDeleteEquipment } from '@/hooks/useEquipments';
import { Dialog } from '@/components/ui/dialog';
import { EquipmentForm } from '@/components/inventory/EquipmentForm';
import { Equipment } from '@/types/database';

import { CompanySetup } from '@/components/auth/CompanySetup';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: company, isLoading: isLoadingCompany } = useCompany(user?.id);
  
  const { data: bookings, isLoading: isLoadingBookings } = useBookings({
    companyId: company?.id
  });
  const { data: equipments, isLoading: isLoadingEquipments } = useEquipments({
    companyId: company?.id
  });
  
  const deleteMutation = useDeleteEquipment();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | undefined>();
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'bookings' | 'settings'>('overview');

  if (isLoadingCompany) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <div className="max-w-md space-y-6">
          <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Cadastro em Análise</h2>
          <p className="text-muted-foreground text-lg">
            Estamos revisando os dados da <strong>{company.name}</strong>. 
            Isso geralmente leva menos de 24 horas. Você receberá um e-mail assim que sua locadora for aprovada!
          </p>
          <div className="pt-6">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Verificar Status
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (company?.status === 'rejected') {
    return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <div className="max-w-md space-y-6">
          <div className="bg-destructive/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-destructive">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Cadastro Rejeitado</h2>
          <p className="text-muted-foreground text-lg">
            Infelizmente não pudemos aprovar o cadastro da sua locadora neste momento. 
            Entre em contato com o suporte para mais detalhes.
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const totalRevenue = bookings

    ?.filter(b => b.status === 'completed' || b.status === 'approved')
    .reduce((acc, curr) => acc + curr.total_amount, 0) || 0;

  const activeBookings = bookings?.filter(b => b.status === 'active' || b.status === 'approved').length || 0;
  const pendingBookingsCount = bookings?.filter(b => b.status === 'pending').length || 0;
  const maintenanceCount = equipments?.filter(e => e.status === 'maintenance').length || 0;

  const handleCreate = () => {
    setEditingEquipment(undefined);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: Equipment) => {
    setEditingEquipment(item);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este equipamento?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        alert('Erro ao excluir equipamento');
      }
    }
  };


  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      {/* Mobile Dashboard Tabs */}
      <div className="md:hidden sticky top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border/40 overflow-x-auto hide-scrollbar">
        <div className="flex p-2 min-w-max gap-2">
          <Button 
            variant={activeTab === 'overview' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setActiveTab('overview')}
            className="text-xs font-bold uppercase tracking-wider h-9"
          >
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Visão Geral
          </Button>
          <Button 
            variant={activeTab === 'inventory' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setActiveTab('inventory')}
            className="text-xs font-bold uppercase tracking-wider h-9"
          >
            <Package className="mr-1.5 h-3.5 w-3.5" /> Inventário
          </Button>
          <Button 
            variant={activeTab === 'bookings' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setActiveTab('bookings')}
            className="text-xs font-bold uppercase tracking-wider h-9"
          >
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Reservas
          </Button>
          <Button 
            variant={activeTab === 'settings' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setActiveTab('settings')}
            className="text-xs font-bold uppercase tracking-wider h-9"
          >
            <Settings className="mr-1.5 h-3.5 w-3.5" /> Ajustes
          </Button>
        </div>
      </div>

      {/* Sidebar (Desktop) */}
      <aside className="w-64 border-r bg-muted/20 hidden md:block shrink-0">
        <div className="p-6">
          <h2 className="text-lg font-semibold tracking-tight uppercase italic truncate">
            {company?.name || 'Locadora'}
          </h2>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate">{user?.email}</p>
        </div>
        <nav className="space-y-1 px-3">
          <Button 
            variant={activeTab === 'overview' ? 'secondary' : 'ghost'} 
            className="w-full justify-start font-bold text-xs uppercase tracking-widest"
            onClick={() => setActiveTab('overview')}
          >
            <BarChart3 className="mr-2 h-4 w-4" /> Visão Geral
          </Button>
          <Button 
            variant={activeTab === 'inventory' ? 'secondary' : 'ghost'} 
            className="w-full justify-start font-bold text-xs uppercase tracking-widest"
            onClick={() => setActiveTab('inventory')}
          >
            <Package className="mr-2 h-4 w-4" /> Inventário
          </Button>
          <Button 
            variant={activeTab === 'bookings' ? 'secondary' : 'ghost'} 
            className="w-full justify-start font-bold text-xs uppercase tracking-widest"
            onClick={() => setActiveTab('bookings')}
          >
            <CalendarDays className="mr-2 h-4 w-4" /> Reservas
          </Button>
          <Button 
            variant={activeTab === 'settings' ? 'secondary' : 'ghost'} 
            className="w-full justify-start font-bold text-xs uppercase tracking-widest"
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="mr-2 h-4 w-4" /> Configurações
          </Button>
        </nav>
      </aside>


      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground">Acompanhe o desempenho real da sua locadora.</p>
          </div>
          <Button onClick={handleCreate} className="w-full sm:w-auto h-11 font-bold">
            <Plus className="mr-2 h-4 w-4" /> Novo Equipamento
          </Button>
        </div>

        {activeTab === 'overview' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Stats Grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Bruta (Total)</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">Baseado nas reservas aprovadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reservas Ativas</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeBookings}</div>
              <p className="text-xs text-muted-foreground">
                {pendingBookingsCount > 0 ? `${pendingBookingsCount} aguardando aprovação` : 'Nenhuma pendência'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Itens no Inventário</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{equipments?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Total de itens cadastrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Manutenção</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{maintenanceCount}</div>
              <p className="text-xs text-muted-foreground">Requer verificação</p>
            </CardContent>
          </Card>
        </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
              {/* Recent Bookings Snapshot */}
              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Reservas Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingBookings ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                  ) : bookings?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma reserva encontrada.</p>
                  ) : (
                    <div className="space-y-6">
                      {bookings?.slice(0, 5).map((booking) => (
                        <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                          <div className="space-y-1">
                            <p className="text-sm font-bold leading-none">
                              {(booking as any).renter?.full_name || (booking as any).renter?.email || 'Usuário'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(booking as any).equipment?.name}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-medium italic">
                              {format(new Date(booking.start_date), "dd/MM", { locale: ptBR })} - {format(new Date(booking.end_date), "dd/MM", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-4">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold px-2 py-0">
                              {booking.status}
                            </Badge>
                            <div className="font-black text-sm tracking-tighter">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(booking.total_amount)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Inventory Snapshot */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Inventário em Alta</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingEquipments ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                  ) : equipments?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Vazio por enquanto.</p>
                  ) : (
                    <div className="space-y-4">
                      {equipments?.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{item.name}</p>
                            <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">{item.category}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-primary">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.daily_rate)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tab: Inventory Full List */}
        {activeTab === 'inventory' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold uppercase tracking-tight italic">Seu Inventário Completo</h2>
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {equipments?.map((item) => (
                <Card key={item.id} className="group relative overflow-hidden bg-zinc-950/20 border-zinc-900">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="min-w-0 pr-4">
                        <h3 className="font-bold text-base truncate group-hover:text-primary transition-colors">{item.name}</h3>
                        <p className="text-xs text-muted-foreground uppercase font-medium">{item.category}</p>
                      </div>
                      <Badge variant={item.status === 'available' ? 'outline' : 'secondary'} className="text-[10px] uppercase font-bold">
                        {item.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-xl font-black tracking-tighter">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.daily_rate)}
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest ml-1">/ dia</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-8 w-8">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Bookings Full List */}
        {activeTab === 'bookings' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold uppercase tracking-tight italic mb-6">Todas as Reservas</h2>
            <div className="space-y-4">
              {bookings?.map((booking) => (
                 <Card key={booking.id} className="border-border/40">
                    <CardContent className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div className="flex gap-4 items-center">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {((booking as any).renter?.full_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{(booking as any).renter?.full_name || (booking as any).renter?.email}</p>
                          <p className="text-xs text-muted-foreground">{(booking as any).equipment?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-4 sm:pt-0">
                         <div className="text-xs">
                            <p className="text-zinc-500 uppercase font-bold text-[9px]">Período</p>
                            <p className="font-medium">{format(new Date(booking.start_date), "dd/MM/yy")} - {format(new Date(booking.end_date), "dd/MM/yy")}</p>
                         </div>
                         <div className="text-right">
                            <Badge className="mb-1">{booking.status}</Badge>
                            <p className="font-black text-base">{formatCurrency(booking.total_amount)}</p>
                         </div>
                      </div>
                    </CardContent>
                 </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Settings */}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <h2 className="text-xl font-bold uppercase tracking-tight italic mb-6">Configurações da Locadora</h2>
             <Card>
                <CardContent className="p-8 text-center space-y-4">
                   <Settings className="w-12 h-12 mx-auto text-zinc-700 animate-spin-slow" />
                   <p className="text-muted-foreground">Em breve você poderá gerenciar sua conta bancária (Stripe) e dados fiscais por aqui.</p>
                   <Button variant="outline" className="h-11">Editar Dados da Empresa</Button>
                </CardContent>
             </Card>
          </div>
        )}


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
      </main>
    </div>
  );
}
