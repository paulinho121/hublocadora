import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  History, 
  Search, 
  Filter, 
  CalendarDays, 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useBookings } from '@/hooks/useBookings';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function OrderHistoryTab() {
  const { user } = useAuth();
  const { tenantId, company, branchId, isBranchManager } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'cancelled' | 'rejected'>('all');

  const { data: bookingsReceived, isLoading: isLoadingReceived } = useBookings({
    companyId: tenantId || undefined,
    branchId: isBranchManager ? branchId : undefined,
    includeEquipmentSubrental: true,
  });

  const { data: bookingsRequested, isLoading: isLoadingRequested } = useBookings({
    renterId: user?.id
  });

  const isLoading = isLoadingReceived || isLoadingRequested;

  const allBookings = [...(bookingsReceived || []), ...(bookingsRequested || [])]
    .filter(b => ['completed', 'cancelled', 'rejected'].includes(b.status))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredBookings = allBookings.filter(booking => {
    const matchesSearch = 
      booking.equipment?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.renter?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.renter?.company?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-3 w-3" />;
      case 'cancelled': return <XCircle className="h-3 w-3" />;
      case 'rejected': return <AlertCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'cancelled': return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-zinc-500/10 text-zinc-500';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">Histórico</h2>
          <p className="text-zinc-500 font-medium">Registro de todas as operações finalizadas ou canceladas.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Buscar por item ou cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-[300px] bg-zinc-900/50 border-zinc-800 rounded-xl"
            />
          </div>
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <Button 
              variant={filterStatus === 'all' ? 'secondary' : 'ghost'} 
              onClick={() => setFilterStatus('all')}
              className="h-9 rounded-lg text-[10px] font-black uppercase px-4"
            >
              Todos
            </Button>
            <Button 
              variant={filterStatus === 'completed' ? 'secondary' : 'ghost'} 
              onClick={() => setFilterStatus('completed')}
              className="h-9 rounded-lg text-[10px] font-black uppercase px-4"
            >
              Concluídos
            </Button>
            <Button 
              variant={filterStatus === 'cancelled' ? 'secondary' : 'ghost'} 
              onClick={() => setFilterStatus('cancelled')}
              className="h-9 rounded-lg text-[10px] font-black uppercase px-4"
            >
              Cancelados
            </Button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Carregando Histórico...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-zinc-900 rounded-3xl">
          <History className="h-12 w-12 text-zinc-800 mx-auto mb-4" />
          <h3 className="text-xl font-black text-zinc-700 uppercase tracking-tighter">Nenhum registro encontrado</h3>
          <p className="text-zinc-600 font-medium max-w-xs mx-auto mt-2">
            O histórico aparecerá aqui quando houver pedidos finalizados ou cancelados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBookings.map((booking: any) => {
            const isRequested = booking.renter_id === user?.id;
            const isFulfiller = booking.delivery?.fulfilling_company_id === tenantId;
            const isOwner = booking.company_id === tenantId;
            
            return (
              <Card key={booking.id} className="bg-zinc-900/20 border-zinc-900 hover:border-zinc-800 transition-all group overflow-hidden rounded-2xl">
                <CardContent className="p-0">
                  <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5 min-w-0 flex-1 w-full">
                      <div className="relative">
                        <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                          {booking.equipment?.images?.[0] ? (
                            <img src={booking.equipment.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-6 w-6 text-zinc-800" />
                          )}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-2 border-zinc-950 flex items-center justify-center shadow-xl ${isRequested ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                          {isRequested ? <ArrowUpRight className="h-3 w-3 text-black" /> : <ArrowDownLeft className="h-3 w-3 text-black" />}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-lg font-black text-zinc-100 uppercase truncate tracking-tight">{booking.equipment?.name}</p>
                          <Badge className={`text-[8px] uppercase font-black tracking-widest h-4 px-2 border-none ${getStatusColor(booking.status)}`}>
                            <span className="mr-1">{getStatusIcon(booking.status)}</span>
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3 text-primary" />
                            {format(new Date(booking.start_date), "dd/MM/yy")} - {format(new Date(booking.end_date), "dd/MM/yy")}
                          </span>
                          <span className="text-zinc-800">•</span>
                          <span>
                            {isRequested ? 'Destino: Sua Unidade' : `Solicitante: ${booking.renter?.company?.name || booking.renter?.full_name}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 w-full md:w-auto">
                      <div className="text-2xl font-black text-zinc-100 tracking-tighter">
                        {(() => {
                          let amount = booking.total_amount;
                          if (isFulfiller && !isOwner) amount = amount * 0.5;
                          else if (isOwner && booking.delivery?.fulfilling_company_id && booking.delivery?.fulfilling_company_id !== tenantId) amount = amount * 0.5;
                          return formatCurrency(amount);
                        })()}
                      </div>
                      <p className="text-[10px] uppercase font-black text-zinc-600 tracking-[0.2em]">Valor Final</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
