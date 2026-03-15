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
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/20 hidden md:block">
        <div className="p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            {company?.name || 'Painel da Locadora'}
          </h2>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
        </div>
        <nav className="space-y-1 px-3">
          <Button variant="secondary" className="w-full justify-start">
            <BarChart3 className="mr-2 h-4 w-4" /> Visão Geral
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Package className="mr-2 h-4 w-4" /> Inventário ({equipments?.length || 0})
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <CalendarDays className="mr-2 h-4 w-4" /> Reservas ({activeBookings})
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <AlertCircle className="mr-2 h-4 w-4" /> Manutenções
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="mr-2 h-4 w-4" /> Configurações
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Acompanhe o desempenho real da sua locadora.</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Novo Equipamento
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Recent Bookings */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Reservas Recentes</CardTitle>
              <CardDescription>Acompanhamentos das últimas solicitações.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBookings ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : bookings?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma reserva encontrada.</p>
              ) : (
                <div className="space-y-8">
                  {bookings?.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="flex items-center">
                      <div className="ml-4 space-y-1 flex-1">
                        <p className="text-sm font-medium leading-none">
                          {(booking as any).renter?.full_name || (booking as any).renter?.email || 'Usuário Desconhecido'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(booking as any).equipment?.name} • {' '}
                          {format(new Date(booking.start_date), "dd 'de' MMM", { locale: ptBR })} a {' '}
                          {format(new Date(booking.end_date), "dd 'de' MMM", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={
                          booking.status === 'pending' ? 'outline' :
                            booking.status === 'approved' ? 'default' :
                              booking.status === 'active' ? 'secondary' : 'destructive'
                        }>
                          {booking.status}
                        </Badge>
                        <div className="font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(booking.total_amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Equipments / Inventory snapshot */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Seu Inventário</CardTitle>
              <CardDescription>Gerencie seus equipamentos cadastrados.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingEquipments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : equipments?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Você ainda não tem equipamentos.</p>
              ) : (
                <div className="space-y-6">
                  {equipments?.slice(0, 10).map((item) => (
                    <div key={item.id} className="flex items-center group">
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium leading-none">{item.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{item.category}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 mr-4">
                        <Badge variant={item.status === 'available' ? 'outline' : 'secondary'} className="text-[10px]">
                          {item.status}
                        </Badge>
                        <div className="font-medium text-sm">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.daily_rate)}/dia
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
