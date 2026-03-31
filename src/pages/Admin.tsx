import { useState, useMemo } from 'react';
import { 
  Users, 
  Building2, 
  DollarSign, 
  Activity,
  ShieldCheck,
  Ban,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Search,
  Trash2,
  MoreVertical,
  MapPin,
  Calendar,
  Package,
  Truck,
  Store,
  Hash,
  ChevronRight,
  Filter,
  Package2,
  TrendingUp,
  Tag
} from 'lucide-react';
import { 
  useAdminStats, 
  usePendingCompanies, 
  useApproveCompany,
  useAllCompanies,
  useDeleteCompany,
  useAllBookings,
  useUpdateBookingStatus
} from '@/hooks/useAdmin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Select } from '@/components/ui/select';

import { CategoryManagement } from '@/components/inventory/CategoryManagement';

type AdminTab = 'overview' | 'companies' | 'bookings' | 'users' | 'finance' | 'insurance' | 'categories';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  
  const { data: stats, isLoading: isLoadingStats } = useAdminStats();
  const { data: pendingCompanies, isLoading: isLoadingPending } = usePendingCompanies();
  const { data: allCompanies, isLoading: isLoadingCompanies } = useAllCompanies();
  const { data: allBookings, isLoading: isLoadingBookings } = useAllBookings();
  
  const approveMutation = useApproveCompany();
  const deleteMutation = useDeleteCompany();
  const updateBookingStatus = useUpdateBookingStatus();

  const handleApprove = async (id: string) => {
    if (confirm('Aprovar esta locadora para operar no marketplace?')) {
      await approveMutation.mutateAsync({ id, status: 'approved' });
    }
  };

  const handleReject = async (id: string) => {
    if (confirm('Rejeitar esta locadora?')) {
      await approveMutation.mutateAsync({ id, status: 'rejected' });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('ATENÇÃO: Isso excluirá permanentemente esta locadora e todos os seus equipamentos. Deseja continuar?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleUpdateBookingStatus = async (id: string, status: any) => {
    await updateBookingStatus.mutateAsync({ id, status });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const filteredCompanies = allCompanies?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.document.includes(searchQuery) ||
    c.address_city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBookings = allBookings?.filter(b => {
    const matchesSearch = (b as any).equipment?.name?.toLowerCase().includes(bookingSearch.toLowerCase()) ||
                        (b as any).company?.name?.toLowerCase().includes(bookingSearch.toLowerCase());
    const matchesStatus = bookingStatusFilter === 'all' || b.status === bookingStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const sidebarLinks = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'companies', label: 'Locadoras', icon: Building2 },
    { id: 'bookings', label: 'Suplementos', icon: Calendar },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'categories', label: 'Categorias', icon: Tag },
    { id: 'finance', label: 'Financeiro', icon: DollarSign },
    { id: 'insurance', label: 'Seguros', icon: ShieldCheck },
  ];

  return (
    <div className="flex bg-zinc-950 min-h-[calc(100vh-4rem)]">
      {/* Sidebar Desktop */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-950 hidden md:flex flex-col shrink-0">
        <div className="p-8">
           <h2 className="text-xl font-black italic tracking-tighter uppercase text-emerald-500 mb-1">Gestão HUB</h2>
           <p className="text-[9px] uppercase font-black text-zinc-500 tracking-[0.2em]">Authority Panel</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id as AdminTab)}
                className={cn(
                  "group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                  isActive 
                    ? "bg-emerald-500/10 text-emerald-500 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.2)]" 
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50"
                )}
              >
                <link.icon className={cn("h-4 w-4", isActive && "scale-110")} />
                <span className="text-xs font-black uppercase tracking-widest">{link.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-zinc-900/50">
           <div className="p-4 bg-zinc-900/30 rounded-xl border border-zinc-900 space-y-3">
              <div className="flex items-center gap-2">
                 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                 <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Hub Online</p>
              </div>
              <p className="text-[10px] text-zinc-600 leading-relaxed italic font-medium">Todos os sistemas de checkout e KYC operantes.</p>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-950">
        {/* Mobile Nav Top */}
        <div className="md:hidden border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md p-2 flex overflow-x-auto hide-scrollbar gap-1 shrink-0">
           {sidebarLinks.map((link) => (
             <Button
               key={link.id}
               size="sm"
               variant={activeTab === link.id ? 'secondary' : 'ghost'}
               onClick={() => setActiveTab(link.id as AdminTab)}
               className="h-10 text-[10px] font-black uppercase shrink-0 px-4"
             >
                <link.icon className="w-3 h-3 mr-1.5" />
                {link.label}
             </Button>
           ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
          
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <header>
                <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Hub Overview</h1>
                <p className="text-zinc-500 font-medium">Métricas globais do marketplace em tempo real.</p>
              </header>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-zinc-900/40 border-zinc-900 rounded-3xl overflow-hidden hover:border-emerald-500/20 transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                       <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">GMV Acumulado</p>
                       <DollarSign className="h-4 w-4 text-emerald-500" />
                    </div>
                    {isLoadingStats ? <Skeleton className="h-8 w-24" /> : <div className="text-3xl font-black italic tracking-tighter">{formatCurrency(stats?.gmv || 0)}</div>}
                    <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-widest mt-1">Total via Stripe</p>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900/40 border-zinc-900 rounded-3xl overflow-hidden hover:border-emerald-500/20 transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                       <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Receita Taxa (15%)</p>
                       <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    {isLoadingStats ? <Skeleton className="h-8 w-24" /> : <div className="text-3xl font-black italic tracking-tighter text-emerald-500">{formatCurrency(stats?.revenue || 0)}</div>}
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Líquido estimado</p>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900/40 border-zinc-900 rounded-3xl overflow-hidden hover:border-emerald-500/20 transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                       <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Locadoras</p>
                       <Building2 className="h-4 w-4 text-zinc-400" />
                    </div>
                    {isLoadingStats ? <Skeleton className="h-8 w-12" /> : <div className="text-3xl font-black italic tracking-tighter">{stats?.companiesTotal}</div>}
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">{stats?.companiesPending} em aprovação</p>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900/40 border-zinc-900 rounded-3xl overflow-hidden hover:border-emerald-500/20 transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                       <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Usuários</p>
                       <Users className="h-4 w-4 text-zinc-400" />
                    </div>
                    {isLoadingStats ? <Skeleton className="h-8 w-12" /> : <div className="text-3xl font-black italic tracking-tighter">{stats?.usersTotal}</div>}
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Cadastros totais</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <Card className="lg:col-span-3 bg-zinc-950 border-zinc-900 rounded-3xl">
                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                       Locadoras Pendentes
                       {pendingCompanies?.length ? <Badge className="bg-red-600 text-white border-none h-5 px-1.5 text-[9px] animate-pulse">{pendingCompanies.length}</Badge> : null}
                    </CardTitle>
                    <CardDescription className="text-zinc-500">Verifique os dados de KYC antes de liberar acesso.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 pt-4">
                    {isLoadingPending ? (
                      <div className="space-y-4">
                         {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                      </div>
                    ) : pendingCompanies?.length === 0 ? (
                      <div className="text-center py-10 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl">
                         <CheckCircle2 className="w-10 h-10 mx-auto text-zinc-800 mb-3" />
                         <p className="text-xs text-zinc-500 font-medium">Tudo limpo! Nenhuma locadora aguardando.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pendingCompanies.map((company) => (
                          <div key={company.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/30 border border-zinc-900 hover:border-emerald-500/20 transition-all group">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black italic text-zinc-100 uppercase tracking-tight">{company.name}</p>
                              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">CNPJ: {company.document}</p>
                              <p className="text-xs text-zinc-400 line-clamp-1 italic">"{company.description}"</p>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <Button 
                                size="sm" 
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 h-9 font-black uppercase text-[10px] tracking-widest"
                                onClick={() => handleApprove(company.id)}
                              >
                                Aprovar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-red-500 hover:bg-red-500/5"
                                onClick={() => handleReject(company.id)}
                              >
                                Bloquear
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 bg-zinc-950 border-zinc-900 rounded-3xl">
                   <CardHeader className="p-8">
                      <CardTitle className="text-xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                        Infraestrutura
                      </CardTitle>
                      <CardDescription className="text-zinc-500">Monitoramento de serviços críticos.</CardDescription>
                   </CardHeader>
                   <CardContent className="p-8 pt-0 space-y-6">
                      <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-900 flex items-start gap-4">
                         <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-5 h-5 text-orange-500" />
                         </div>
                         <div>
                            <p className="text-xs font-black uppercase text-zinc-200 tracking-wider mb-1">Cinehub Insurance</p>
                            <p className="text-[10px] text-zinc-500 leading-relaxed">Emissão imediata de apólices pela Porto Seguro disponível.</p>
                         </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-900 flex items-start gap-4">
                         <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                            <Ban className="w-5 h-5 text-blue-500" />
                         </div>
                         <div>
                            <p className="text-xs font-black uppercase text-zinc-200 tracking-wider mb-1">Gateways API</p>
                            <p className="text-[10px] text-zinc-500 leading-relaxed">Stripe Radar (Fraude) rodando sem anomalias nas últimas 24h.</p>
                         </div>
                      </div>
                   </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* COMPANIES TAB */}
          {activeTab === 'companies' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
               <div className="flex flex-col md:flex-row items-end justify-between gap-4 bg-zinc-950 border border-zinc-900 p-6 rounded-3xl">
                  <div className="flex-1 w-full space-y-2">
                     <h2 className="text-xl font-black italic uppercase tracking-tighter">Locadoras Parceiras</h2>
                     <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input 
                          placeholder="Buscar por nome, documento ou cidade..." 
                          className="pl-10 h-11 bg-zinc-900/50 border-zinc-800 rounded-xl"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                     </div>
                  </div>
               </div>

               <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-zinc-900/50 border-b border-zinc-900">
                          <tr className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">
                             <th className="px-8 py-5">Locadora</th>
                             <th className="px-8 py-5">Documento</th>
                             <th className="px-8 py-5">Localização</th>
                             <th className="px-8 py-5">Status</th>
                             <th className="px-8 py-5 text-right">Ações</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-zinc-900/50">
                          {isLoadingCompanies ? (
                            [1, 2, 3].map(i => (
                              <tr key={i}><td colSpan={5} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                            ))
                          ) : filteredCompanies?.map((company) => (
                            <tr key={company.id} className="hover:bg-zinc-900/20 transition-colors group">
                               <td className="px-8 py-6">
                                  <div className="flex items-center gap-4">
                                     <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                                        <Store className="w-5 h-5" />
                                     </div>
                                     <div>
                                        <p className="text-sm font-black italic text-zinc-100 uppercase">{company.name}</p>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Desde {new Date(company.created_at).getFullYear()}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-8 py-6 text-xs text-zinc-400 font-mono tracking-tighter">{company.document}</td>
                               <td className="px-8 py-6">
                                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                                     <MapPin className="w-3.5 h-3.5 text-zinc-600" />
                                     {company.address_city}, {company.address_state}
                                  </div>
                               </td>
                               <td className="px-8 py-6">
                                  <Badge className={cn(
                                    "uppercase text-[9px] font-black italic h-5",
                                    company.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                  )}>
                                     {company.status === 'approved' ? 'Verificada' : 'Pendente'}
                                  </Badge>
                               </td>
                               <td className="px-8 py-6 text-right">
                                  <div className="flex justify-end gap-1">
                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 hover:text-white">
                                        <MoreVertical className="w-4 h-4" />
                                     </Button>
                                     <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-zinc-800 hover:text-red-500 hover:bg-red-500/10"
                                      onClick={() => handleDelete(company.id)}
                                     >
                                        <Trash2 className="w-4 h-4" />
                                     </Button>
                                  </div>
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>
               </Card>
            </div>
          )}

          {/* BOOKINGS TAB (SUPLEMENTOS) */}
          {activeTab === 'bookings' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
               <header className="flex flex-col md:flex-row items-end justify-between gap-4 bg-zinc-950 border border-zinc-900 p-8 rounded-[32px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]">
                  <div className="flex-1 w-full space-y-6">
                     <div>
                        <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-1">Gestão de Suplementos</h1>
                        <p className="text-zinc-500 text-sm font-medium">Controle de locações inter-empresas e pedidos do HUB.</p>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pb-2">
                        <div className="md:col-span-8 relative group">
                           <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                           <Input 
                             placeholder="Pesquisar por equipamento ou locadora parceira..." 
                             className="pl-11 h-12 bg-zinc-900/50 border-zinc-800 focus:border-emerald-500/50 rounded-2xl transition-all"
                             value={bookingSearch}
                             onChange={(e) => setBookingSearch(e.target.value)}
                           />
                        </div>
                        <div className="md:col-span-4">
                           <Select 
                              value={bookingStatusFilter} 
                              onChange={(e: any) => setBookingStatusFilter(e.target.value)}
                              className="h-12 bg-zinc-900/50 border-zinc-800 rounded-2xl px-4 appearance-none"
                           >
                              <option value="all">Todos Status</option>
                              <option value="pending">Pendentes</option>
                              <option value="approved">Aprovados</option>
                              <option value="active">Em Trânsito</option>
                              <option value="completed">Finalizados</option>
                           </Select>
                        </div>
                     </div>
                  </div>
               </header>

               <div className="grid grid-cols-1 gap-6">
                  {isLoadingBookings ? (
                    [1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-3xl" />)
                  ) : filteredBookings?.length === 0 ? (
                    <div className="py-20 text-center bg-zinc-950 border border-dashed border-zinc-900 rounded-[32px]">
                       <Package2 className="h-12 w-12 mx-auto text-zinc-800 mb-4" />
                       <h3 className="text-xl font-bold uppercase italic tracking-tighter">Nenhum pedido encontrado</h3>
                       <p className="text-zinc-600 max-w-xs mx-auto text-sm mt-2">Aperte em limpar filtros ou tente uma busca diferente.</p>
                    </div>
                  ) : filteredBookings?.map((booking: any) => {
                    const equipmentImage = booking.equipment?.images?.[0];
                    return (
                      <Card key={booking.id} className="group overflow-hidden bg-zinc-950 border-zinc-900/80 hover:border-emerald-500/30 transition-all rounded-[32px] shadow-lg">
                        <CardContent className="p-0">
                           <div className="flex flex-col lg:flex-row items-stretch min-h-[160px]">
                              {/* Thumbnail Section */}
                              <div className="w-full lg:w-48 bg-zinc-900/80 border-r border-zinc-900/50 flex items-center justify-center shrink-0 relative overflow-hidden">
                                 {equipmentImage ? (
                                    <img 
                                      src={equipmentImage} 
                                      alt={booking.equipment?.name} 
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                    />
                                 ) : (
                                    <div className="flex flex-col items-center gap-2 text-zinc-700">
                                       <Package className="h-8 w-8" />
                                       <span className="text-[10px] uppercase font-black tracking-widest text-zinc-800">No Image</span>
                                    </div>
                                 )}
                                 <Badge className="absolute top-2 left-2 bg-emerald-600/20 text-emerald-500 border-none text-[8px] uppercase font-black h-4 px-1.5 flex lg:hidden">
                                    {(booking as any).equipment?.category}
                                 </Badge>
                              </div>

                              {/* Info Content */}
                              <div className="flex-1 p-8 flex flex-col md:flex-row justify-between gap-8">
                                 <div className="space-y-4 max-w-xl">
                                    <div className="space-y-1">
                                       <Badge variant="outline" className="hidden lg:inline-flex bg-zinc-900 border-zinc-800 text-zinc-500 uppercase font-bold text-[9px] mb-2">
                                          {(booking as any).equipment?.category}
                                       </Badge>
                                       <h3 className="text-2xl font-black italic tracking-tighter uppercase text-zinc-100 group-hover:text-emerald-500 transition-colors">
                                          {(booking as any).equipment?.name}
                                       </h3>
                                       <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest leading-none">
                                          Solicitante: <span className="text-zinc-300 italic">{(booking as any).company?.name}</span>
                                       </p>
                                    </div>

                                    <div className="flex flex-wrap gap-6 pt-2">
                                       <div className="flex items-center gap-2">
                                          <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                             <Calendar className="h-4 w-4 text-zinc-500" />
                                          </div>
                                          <div>
                                             <p className="text-[9px] uppercase font-black text-zinc-600 tracking-widest">Período</p>
                                             <p className="text-xs font-bold text-zinc-400">{new Date(booking.start_date).toLocaleDateString('pt-BR')} - {new Date(booking.end_date).toLocaleDateString('pt-BR')}</p>
                                          </div>
                                       </div>

                                       <div className="flex items-center gap-2">
                                          <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                             <Hash className="h-4 w-4 text-zinc-500" />
                                          </div>
                                          <div>
                                             <p className="text-[9px] uppercase font-black text-zinc-600 tracking-widest">Quantidade</p>
                                             <p className="text-xs font-bold text-zinc-400">{booking.quantity || 1} Unidades</p>
                                          </div>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="flex flex-col md:items-end justify-between border-t md:border-t-0 md:border-l border-zinc-900 pt-6 md:pt-0 md:pl-8 min-w-[200px]">
                                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 mb-4">
                                       <Badge className={cn(
                                          "uppercase text-[10px] font-black italic tracking-tighter h-6 px-3 rounded-full",
                                          booking.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                                          booking.status === 'approved' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 
                                          booking.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400'
                                       )}>
                                          {booking.status}
                                       </Badge>
                                       <div className="text-2xl font-black italic tracking-tighter text-zinc-100">
                                          {formatCurrency(booking.total_amount)}
                                       </div>
                                    </div>

                                    {booking.status === 'pending' && (
                                       <div className="flex gap-2 w-full mt-auto pt-2">
                                          <Button 
                                             size="sm" 
                                             className="flex-1 bg-emerald-600 hover:bg-emerald-500 h-10 font-black uppercase text-[10px] tracking-widest rounded-xl"
                                             onClick={() => handleUpdateBookingStatus(booking.id, 'approved')}
                                          >
                                             Aprovar
                                          </Button>
                                          <Button 
                                             size="sm" 
                                             variant="ghost" 
                                             className="h-10 px-4 text-zinc-500 hover:text-red-500 uppercase font-bold text-[10px]"
                                             onClick={() => handleUpdateBookingStatus(booking.id, 'rejected')}
                                          >
                                             Recusar
                                          </Button>
                                       </div>
                                    )}
                                    
                                    {booking.status === 'approved' && (
                                       <Button 
                                          size="sm" 
                                          className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 h-10 font-black uppercase text-[10px] tracking-widest rounded-xl"
                                          onClick={() => handleUpdateBookingStatus(booking.id, 'active')}
                                       >
                                          Iniciar Entrega
                                       </Button>
                                    )}
                                 </div>
                              </div>
                           </div>
                        </CardContent>
                      </Card>
                    );
                  })}
               </div>
            </div>
          )}

          {/* CATEGORIES TAB */}
          {activeTab === 'categories' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-4xl">
               <header>
                  <h1 className="text-3xl font-black italic tracking-tighter uppercase mb-1">Gestão de Categorias</h1>
                  <p className="text-zinc-500 text-sm font-medium">Controle global das categorias de equipamentos do marketplace.</p>
               </header>
               
               <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] p-8 shadow-2xl">
                  <CategoryManagement />
               </Card>
            </div>
          )}

          {/* Fallback developing tabs */}
          {activeTab !== 'overview' && 
           activeTab !== 'companies' && 
           activeTab !== 'bookings' && 
           activeTab !== 'categories' && (
             <div className="h-full flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-500">
                <div className="h-24 w-24 rounded-[32px] bg-zinc-900/50 border border-zinc-900 flex items-center justify-center mb-6">
                   <Clock className="w-10 h-10 text-emerald-500/30 animate-spin-slow" />
                </div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Módulo Restrito</h2>
                <p className="text-zinc-600 max-w-xs text-center font-medium leading-relaxed">
                   Integração avançada com {
                     activeTab === 'users' ? 'Supabase Edge Functions' : 
                     activeTab === 'finance' ? 'Stripe Connect' : 'Porto Seguro API'
                   } em andamento.
                </p>
                <Button variant="outline" onClick={() => setActiveTab('overview')} className="mt-8 rounded-xl border-zinc-800 font-bold uppercase text-[10px] tracking-widest h-11 px-8">
                   Voltar ao Overview
                </Button>
             </div>
          )}

        </div>
      </main>
    </div>
  );
}
