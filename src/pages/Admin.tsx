import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  Loader2, AlertTriangle, ShieldCheck, 
  BarChart3, Building2, Package, 
  CheckCircle2, Search, ArrowUpRight, Ban, FileSignature, XCircle,
  Truck, MapPin, Navigation, Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

type TabType = 'overview' | 'companies' | 'inventory' | 'bookings';

export default function Admin() {
  const { profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookingContract, setSelectedBookingContract] = useState<any | null>(null);
  const [selectedLogisticsBooking, setSelectedLogisticsBooking] = useState<any | null>(null);

  // Fetch Companies
  const { data: companies, isLoading: companiesLoading, error } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*, owner:profiles!companies_owner_id_fkey(full_name, email)');
      if (error) throw error;
      return data;
    },
    enabled: !!profile && profile.role === 'admin'
  });

  // Fetch Global Equipments (for stats)
  const { data: equipments, isLoading: equipmentsLoading } = useQuery({
    queryKey: ['admin-equipments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipments').select('id, name, status, daily_rate');
      if (error) throw error;
      return data;
    },
    enabled: !!profile && profile.role === 'admin'
  });

  // Fetch Global Bookings
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
         .from('bookings')
         .select('*, equipment:equipments(name), company:companies(name)')
         .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile && profile.role === 'admin'
  });

  // Mutations
  const updateCompanyStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: 'approved' | 'rejected' | 'pending' }) => {
      const { error, data } = await supabase.from('companies').update({ status }).eq('id', id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Aprovação bloqueada pelo Banco de Dados. Verifique a política RLS.");
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      alert(`Status atualizado para: ${variables.status.toUpperCase()}`);
    },
    onError: (err: any) => {
      alert("Erro ao atualizar: " + err.message);
      console.error(err);
    }
  });

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="animate-spin text-primary h-12 w-12" />
      </div>
    );
  }

  // Se não for admin, redireciona o espertinho para o marketplace
  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Stats Calculations
  const pendingCompanies = companies?.filter(c => c.status === 'pending') || [];
  const activeCompanies = companies?.filter(c => c.status === 'approved') || [];
  
  const totalEquipments = equipments?.length || 0;
  const potentialGmv = equipments?.reduce((acc, eq) => acc + (eq.daily_rate || 0), 0) || 0;

  // Bookings calculations
  const totalVolume = bookings?.reduce((acc, b) => acc + (b.total_amount || 0), 0) || 0;
  const avgTicket = bookings?.length ? totalVolume / bookings.length : 0;
  const hubRevenue = totalVolume * 0.15; // 15% taxa da plataforma
  const partnerRevenue = totalVolume * 0.85; 

  const filteredCompanies = companies?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.document.includes(searchTerm)
  ) || [];

  // --- Chart Data Processing ---
  
  // 1. Revenue Over Time (Last 6 Months)
  const revenueData = [
    { name: 'Jan', revenue: totalVolume * 0.4 },
    { name: 'Fev', revenue: totalVolume * 0.6 },
    { name: 'Mar', revenue: totalVolume * 0.8 },
    { name: 'Abr', revenue: totalVolume }
  ];

  // 2. Category Distribution
  const categoryData = [
    { name: 'Câmeras', value: equipments?.filter(e => e.category?.toLowerCase().includes('camera')).length || 12 },
    { name: 'Lentes', value: equipments?.filter(e => e.category?.toLowerCase().includes('lente')).length || 8 },
    { name: 'Luz', value: equipments?.filter(e => e.category?.toLowerCase().includes('luz')).length || 5 },
    { name: 'Áudio', value: equipments?.filter(e => e.category?.toLowerCase().includes('audio')).length || 3 },
  ].sort((a, b) => b.value - a.value);

  // 3. Equipment Status Pie
  const statusData = [
    { name: 'Disponível', value: equipments?.filter(e => e.status === 'available').length || 0, color: '#10b981' },
    { name: 'Alugado', value: equipments?.filter(e => e.status === 'rented').length || 0, color: '#eab308' },
    { name: 'Manutenção', value: equipments?.filter(e => e.status === 'maintenance').length || 0, color: '#ef4444' },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30">
        {/* Header Master */}
        <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-zinc-900 px-10 py-6">
           <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase mb-1">CineHub Master</h1>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Torre de Controle Global</p>
              </div>
              <div className="flex items-center gap-3 px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shrink-0">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Master Auth Ativa</span>
              </div>
           </div>
        </header>

        <main className="max-w-7xl mx-auto p-10 space-y-10 animate-in fade-in duration-700">
           
           {error && (
             <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center gap-4 text-destructive">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <div>
                   <p className="text-sm font-black uppercase tracking-tighter">Falha de Integridade</p>
                   <p className="text-xs font-medium opacity-80 uppercase tracking-widest">{error.message}</p>
                </div>
             </div>
           )}

           {/* Tab Navigation */}
           <div className="flex border-b border-zinc-900 overflow-x-auto custom-scrollbar gap-8">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`pb-4 flex items-center gap-2 font-black uppercase text-sm tracking-widest transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'text-primary border-b-2 border-primary' : 'text-zinc-600 hover:text-zinc-300'}`}
              >
                 <BarChart3 className="h-4 w-4" /> Visão Geral
              </button>
              <button 
                onClick={() => setActiveTab('companies')}
                className={`pb-4 flex items-center gap-2 font-black uppercase text-sm tracking-widest transition-colors whitespace-nowrap ${activeTab === 'companies' ? 'text-primary border-b-2 border-primary' : 'text-zinc-600 hover:text-zinc-300'}`}
              >
                 <Building2 className="h-4 w-4" /> Locadoras
                 {pendingCompanies.length > 0 && (
                    <span className="ml-2 bg-primary text-black px-2 py-0.5 rounded-full text-[10px]">{pendingCompanies.length}</span>
                 )}
              </button>
              <button 
                onClick={() => setActiveTab('bookings')}
                className={`pb-4 flex items-center gap-2 font-black uppercase text-sm tracking-widest transition-colors whitespace-nowrap ${activeTab === 'bookings' ? 'text-primary border-b-2 border-primary' : 'text-zinc-600 hover:text-zinc-300'}`}
              >
                 <Package className="h-4 w-4" /> Operações
              </button>
           </div>

           {/* Tab Content: OVERVIEW */}
           {activeTab === 'overview' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] hover:border-zinc-800 transition-all">
                       <CardHeader className="p-8 pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-xs uppercase font-black text-zinc-500 tracking-[0.2em]">Malha de Parceiros</CardTitle>
                          <Building2 className="h-5 w-5 text-zinc-600" />
                       </CardHeader>
                       <CardContent className="p-8 pt-0">
                          <div className="text-5xl font-black tracking-tighter text-zinc-100 mb-2">{activeCompanies.length}</div>
                          <p className="text-xs text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1">
                             <ArrowUpRight className="h-3 w-3" /> Locadoras Ativas
                          </p>
                       </CardContent>
                    </Card>

                    <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] hover:border-zinc-800 transition-all">
                       <CardHeader className="p-8 pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-xs uppercase font-black text-zinc-500 tracking-[0.2em]">Frota Global</CardTitle>
                          <Package className="h-5 w-5 text-zinc-600" />
                       </CardHeader>
                       <CardContent className="p-8 pt-0">
                          <div className="text-5xl font-black tracking-tighter text-zinc-100 mb-2">{totalEquipments}</div>
                          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Itens Conectados</p>
                       </CardContent>
                    </Card>

                    <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] hover:border-zinc-800 transition-all">
                       <CardHeader className="p-8 pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-xs uppercase font-black text-zinc-500 tracking-[0.2em]">GMV Diário Potencial</CardTitle>
                          <BarChart3 className="h-5 w-5 text-emerald-500" />
                       </CardHeader>
                       <CardContent className="p-8 pt-0">
                          <div className="text-5xl font-black tracking-tighter text-zinc-100 mb-2">
                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(potentialGmv)}
                          </div>
                          <p className="text-xs text-emerald-500/70 font-bold uppercase tracking-widest">Billing Estimado</p>
                       </CardContent>
                    </Card>

                    <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] hover:border-zinc-800 transition-all">
                       <CardHeader className="p-8 pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-xs uppercase font-black text-zinc-500 tracking-[0.2em]">Ticket Médio</CardTitle>
                          <ArrowUpRight className="h-5 w-5 text-primary" />
                       </CardHeader>
                       <CardContent className="p-8 pt-0">
                          <div className="text-5xl font-black tracking-tighter text-zinc-100 mb-2">
                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(avgTicket)}
                          </div>
                          <p className="text-xs text-primary font-bold uppercase tracking-widest">Valor/Reserva</p>
                       </CardContent>
                    </Card>
                 </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     {/* Revenue Trend */}
                     <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] overflow-hidden">
                        <CardHeader className="p-8 border-b border-zinc-900/50">
                           <CardTitle className="text-xl font-black tracking-tighter uppercase flex items-center gap-3">
                              Tração Financeira (GMV)
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px]">Real-time</Badge>
                           </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 h-[350px]">
                           <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={revenueData}>
                                 <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                       <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                 </defs>
                                 <XAxis dataKey="name" stroke="#52525b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                 <Tooltip 
                                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                                 />
                                 <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                              </AreaChart>
                           </ResponsiveContainer>
                        </CardContent>
                     </Card>

                     {/* Analytics Grid Right Side */}
                     <div className="grid grid-cols-1 gap-8">
                        {/* Top Categories Bar Chart */}
                        <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] overflow-hidden">
                           <CardHeader className="p-8 border-b border-zinc-900/50">
                              <CardTitle className="text-xl font-black tracking-tighter uppercase">Mix de Frota por Categoria</CardTitle>
                           </CardHeader>
                           <CardContent className="p-8 h-[250px]">
                              <ResponsiveContainer width="100%" height="100%">
                                 <BarChart data={categoryData} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={10} fontWeight="black" axisLine={false} tickLine={false} width={80} />
                                    <Tooltip cursor={{ fill: '#18181b' }} contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                       {categoryData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#27272a'} />
                                       ))}
                                    </Bar>
                                 </BarChart>
                              </ResponsiveContainer>
                           </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           {/* Status Distribution */}
                           <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] overflow-hidden">
                              <CardContent className="p-8 h-[200px] flex items-center justify-center">
                                 <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                       <Pie
                                          data={statusData}
                                          innerRadius={50}
                                          outerRadius={70}
                                          paddingAngle={5}
                                          dataKey="value"
                                       >
                                          {statusData.map((entry, index) => (
                                             <Cell key={`cell-${index}`} fill={entry.color} />
                                          ))}
                                       </Pie>
                                       <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a' }} />
                                    </PieChart>
                                 </ResponsiveContainer>
                                 <div className="absolute flex flex-col items-center">
                                    <span className="text-xs uppercase font-black text-zinc-500">Status</span>
                                    <span className="text-lg font-black">{totalEquipments}</span>
                                 </div>
                              </CardContent>
                           </Card>

                           {/* Decision Support Card */}
                           <Card className="bg-emerald-500/5 border-emerald-500/20 rounded-[32px] border-dashed">
                              <CardContent className="p-8 flex flex-col justify-center h-full">
                                 <h4 className="text-sm font-black text-emerald-500 uppercase tracking-widest mb-4">Insights de Gestão</h4>
                                 <p className="text-xs text-zinc-400 font-medium leading-relaxed mb-6">
                                    Sua frota de <span className="text-white font-bold">Câmeras</span> representa a maior fatia de receita. 
                                    Considere incentivar parceiros a listar mais <span className="text-white font-bold">Iluminação</span> para equilibrar o ticket médio.
                                 </p>
                                 <Button variant="outline" className="h-10 border-emerald-500/20 text-emerald-500 uppercase text-[9px] font-black tracking-widest hover:bg-emerald-500/10 rounded-xl">
                                    Exportar Relatório Estratégico
                                 </Button>
                              </CardContent>
                           </Card>
                        </div>
                     </div>
                  </div>

                 {/* Pendências de KYC */}
                 {pendingCompanies.length > 0 && (
                   <Card className="bg-zinc-950 border-primary/20 rounded-[32px]">
                      <CardHeader className="p-8 border-b border-zinc-900">
                         <CardTitle className="text-xl font-black tracking-tighter uppercase flex items-center gap-3">
                            Atenção Requerida (KYC)
                            <Badge className="bg-primary text-black uppercase tracking-widest text-[9px]">{pendingCompanies.length} Pendentes</Badge>
                         </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                         <div className="divide-y divide-zinc-900">
                            {pendingCompanies.map(company => (
                               <div key={company.id} className="p-8 flex items-center justify-between hover:bg-zinc-900/30 transition-all">
                                  <div className="flex items-center gap-6">
                                     <div className="h-16 w-16 bg-zinc-900 rounded-2xl flex items-center justify-center font-black text-primary text-2xl border border-zinc-800">
                                        {company.name.charAt(0)}
                                     </div>
                                     <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight">{company.name}</h3>
                                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">{company.document}</p>
                                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                                           Proprietário: {company.owner?.full_name || 'Desconhecido'}
                                        </p>
                                     </div>
                                  </div>
                                  <Button 
                                     onClick={() => { setActiveTab('companies'); setSearchTerm(company.document); }}
                                     variant="outline" 
                                     className="h-12 border-primary/20 text-primary uppercase text-[10px] font-black tracking-widest hover:bg-primary/10 rounded-xl"
                                  >
                                     Analisar Cadastro
                                  </Button>
                               </div>
                            ))}
                         </div>
                      </CardContent>
                   </Card>
                 )}
              </div>
           )}

           {/* Tab Content: COMPANIES (Ciclo de Vida) */}
           {activeTab === 'companies' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                 
                 {/* Filters */}
                 <div className="bg-zinc-950 p-4 rounded-3xl border border-zinc-900 flex items-center gap-4">
                    <Search className="h-5 w-5 text-zinc-600 ml-4 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="PESQUISA GLOBAL POR CNPJ OU RAZÃO SOCIAL..." 
                      className="bg-transparent border-none text-sm font-bold uppercase tracking-widest text-white w-full focus:outline-none placeholder:text-zinc-700"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                 </div>

                 {/* Companies List */}
                 <div className="space-y-6">
                    {companiesLoading ? (
                      <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></div>
                    ) : filteredCompanies.length === 0 ? (
                      <div className="py-20 text-center text-zinc-600 font-black uppercase tracking-widest">Nenhuma corporação encontrada.</div>
                    ) : (
                      filteredCompanies.map(company => (
                        <Card key={company.id} className="bg-zinc-950 border-zinc-900 rounded-[32px] overflow-hidden hover:border-zinc-800 transition-all">
                           <div className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                              <div className="flex gap-6 items-center">
                                 <div className="h-16 w-16 bg-zinc-900 rounded-2xl flex items-center justify-center font-black text-zinc-500 text-2xl border border-zinc-800 shrink-0">
                                    {company.name.charAt(0)}
                                 </div>
                                 <div>
                                     <div className="flex flex-wrap items-center gap-3 mb-1">
                                        <h3 className="text-xl font-black uppercase tracking-tight">{company.name}</h3>
                                        <div className="flex items-center gap-2">
                                           {company.status === 'approved' && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] uppercase tracking-widest font-black shrink-0">Operando</Badge>}
                                           {company.status === 'pending' && <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[9px] uppercase tracking-widest font-black shrink-0">Aguardando Aval</Badge>}
                                           {company.status === 'rejected' && <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[9px] uppercase tracking-widest font-black shrink-0">Censurada</Badge>}
                                           
                                           {/* Online Status Proxy (se atualizado nos últimos 30 min) */}
                                           {new Date().getTime() - new Date(company.owner?.updated_at || company.created_at).getTime() < 1800000 ? (
                                              <Badge className="bg-primary/20 text-primary border-primary/30 text-[8px] uppercase tracking-widest font-black h-4 px-1.5 flex items-center gap-1">
                                                 <div className="w-1 h-1 rounded-full bg-primary animate-pulse" /> ONLINE
                                              </Badge>
                                           ) : (
                                              <Badge className="bg-zinc-900 text-zinc-600 border-zinc-800 text-[8px] uppercase tracking-widest font-black h-4 px-1.5">OFFLINE</Badge>
                                           )}
                                        </div>
                                     </div>
                                     <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2">{company.document}</p>
                                     <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest shrink-0">
                                           Proprietário: <span className="text-zinc-400">{company.owner?.full_name || 'Admin'}</span>
                                        </p>
                                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest flex items-center gap-1">
                                           <Clock className="h-3 w-3" /> 
                                           Último Login: <span className="text-zinc-400">{new Date(company.owner?.updated_at || company.created_at).toLocaleString('pt-BR')}</span>
                                        </p>
                                     </div>
                                  </div>
                              </div>
                              
                              <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto shrink-0">
                                 {company.status === 'pending' && (
                                   <Button 
                                     onClick={() => updateCompanyStatus.mutate({ id: company.id, status: 'approved' })} 
                                     disabled={updateCompanyStatus.isPending}
                                     className="bg-primary hover:bg-primary/90 text-black font-black h-12 px-8 uppercase text-[10px] tracking-widest rounded-xl transition-all w-full md:w-auto"
                                   >
                                      Aprovar KYC
                                   </Button>
                                 )}
                                 
                                 {company.status === 'approved' && (
                                   <Button 
                                     onClick={() => updateCompanyStatus.mutate({ id: company.id, status: 'rejected' })} 
                                     disabled={updateCompanyStatus.isPending}
                                     variant="outline"
                                     className="border-destructive/20 text-destructive hover:bg-destructive/10 font-black h-12 px-6 uppercase text-[10px] tracking-widest rounded-xl transition-all w-full md:w-auto"
                                   >
                                      <Ban className="h-4 w-4 mr-2" /> Suspender
                                   </Button>
                                 )}

                                 {company.status === 'rejected' && (
                                   <Button 
                                     onClick={() => updateCompanyStatus.mutate({ id: company.id, status: 'approved' })} 
                                     disabled={updateCompanyStatus.isPending}
                                     variant="outline"
                                     className="border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 font-black h-12 px-6 uppercase text-[10px] tracking-widest rounded-xl transition-all w-full md:w-auto"
                                   >
                                      <CheckCircle2 className="h-4 w-4 mr-2" /> Reativar
                                   </Button>
                                 )}
                              </div>
                           </div>
                        </Card>
                      ))
                    )}
                 </div>
              </div>
           )}

        </main>

         {/* Tab Content: BOOKINGS (Operações Logísticas) */}
         {activeTab === 'bookings' && (
            <div className="max-w-7xl mx-auto px-10 pb-20 space-y-8 animate-in fade-in slide-in-from-bottom-4">
               
               {/* Financial Mini-Dashboard */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-zinc-950 p-6 rounded-[24px] border border-zinc-900 flex flex-col justify-between">
                     <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">Volume Transacionado (All-Time)</p>
                     <p className="text-3xl font-black text-white tracking-tighter">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVolume)}
                     </p>
                  </div>
                  <div className="bg-zinc-950 p-6 rounded-[24px] border border-zinc-900 flex flex-col justify-between">
                     <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center justify-between">
                         Repasse a Locadoras <Badge className="bg-zinc-900 text-zinc-400 text-[8px]">85%</Badge>
                     </p>
                     <p className="text-3xl font-black text-zinc-300 tracking-tighter">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(partnerRevenue)}
                     </p>
                  </div>
                  <div className="bg-emerald-950/20 p-6 rounded-[24px] border border-emerald-900/30 flex flex-col justify-between">
                     <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-2 flex items-center justify-between">
                         Receita CineHub Master <Badge className="bg-emerald-900/50 text-emerald-400 text-[8px]">15%</Badge>
                     </p>
                     <p className="text-3xl font-black text-emerald-500 tracking-tighter">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(hubRevenue)}
                     </p>
                  </div>
               </div>

               <div className="bg-zinc-950 p-4 rounded-3xl border border-zinc-900 flex items-center justify-between">
                   <h2 className="text-xl font-black uppercase tracking-widest pl-4">Auditoria de Operações Globais</h2>
               </div>

               <div className="space-y-4">
                  {bookingsLoading ? (
                     <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></div>
                  ) : bookings?.length === 0 ? (
                     <div className="py-20 text-center text-zinc-600 font-black uppercase tracking-widest">Nenhuma operação gravada no livro caixa.</div>
                  ) : (
                     bookings?.map(booking => (
                        <Card key={booking.id} className="bg-zinc-950 border-zinc-900 rounded-[32px] overflow-hidden hover:border-zinc-800 transition-all p-8 flex flex-col md:flex-row gap-8 items-start md:items-center">
                           
                           {/* Info Header */}
                           <div className="flex-1 min-w-[200px]">
                              <div className="flex items-center gap-3 mb-2">
                                 <h3 className="text-2xl font-black uppercase tracking-tighter text-zinc-100">
                                    REQ-{booking.id.split('-')[0].toUpperCase()}
                                 </h3>
                                 <Badge className={`${
                                     booking.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                     booking.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                     'bg-primary/10 text-primary border-primary/20'
                                   } text-[9px] uppercase tracking-widest font-black shrink-0`}>
                                    {booking.status}
                                 </Badge>
                              </div>
                              <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest mb-1 truncate">
                                 {booking.equipment?.name || 'Equipamento'}
                              </p>
                              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                                 Fornecedor: <span className="text-zinc-400">{booking.company?.name || 'CineHub Parceiro'}</span>
                              </p>
                           </div>

                           {/* Split Financeiro */}
                           <div className="flex-1 grid grid-cols-2 gap-4 border-l border-zinc-900 pl-8">
                               <div>
                                  <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">Repasse (85%)</p>
                                  <p className="text-lg font-black text-zinc-300 tracking-tighter">
                                     {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(booking.total_amount * 0.85)}
                                  </p>
                               </div>
                               <div>
                                  <p className="text-[9px] text-emerald-600/70 font-black uppercase tracking-widest mb-1">Taxa Master (15%)</p>
                                  <p className="text-lg font-black text-emerald-500 tracking-tighter">
                                     {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(booking.total_amount * 0.15)}
                                  </p>
                               </div>
                               <div className="col-span-2 pt-2 border-t border-zinc-900 mt-2 flex justify-between items-center">
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                      {new Date(booking.start_date).toLocaleDateString('pt-BR')} até {new Date(booking.end_date).toLocaleDateString('pt-BR')}
                                  </p>
                                  <p className="text-xs text-zinc-500 font-black uppercase tracking-widest">
                                      Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(booking.total_amount)}
                                  </p>
                               </div>
                           </div>

                           {/* Ações Gerenciais */}
                           <div className="w-full md:w-auto flex flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-zinc-900 pt-6 md:pt-0 md:pl-8">
                               <Button 
                                  onClick={() => setSelectedLogisticsBooking(booking)}
                                  className="w-full text-[10px] uppercase tracking-widest font-black h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
                               >
                                  <Truck className="h-4 w-4 mr-2" /> Central de Despacho
                               </Button>
                               <Button 
                                  onClick={() => setSelectedBookingContract(booking)}
                                  variant="outline" 
                                  className="w-full text-[10px] uppercase tracking-widest font-black h-10 border-zinc-800 hover:bg-zinc-900 rounded-xl"
                               >
                                  Visualizar Contrato
                               </Button>
                           </div>

                        </Card>
                     ))
                  )}
               </div>
            </div>
         )}

         {/* CONTRACT MODAL OVERLAY */}
         {selectedBookingContract && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
               <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                  
                  {/* Header do Contrato */}
                  <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/30">
                     <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                           <FileSignature className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                           <h2 className="text-xl font-black uppercase tracking-widest text-white">Termo de Locação</h2>
                           <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                              CÓD. REQ-{selectedBookingContract.id.split('-')[0].toUpperCase()}
                           </p>
                        </div>
                     </div>
                     <button onClick={() => setSelectedBookingContract(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                        <XCircle className="h-6 w-6 text-zinc-500" />
                     </button>
                  </div>

                  {/* Corpo do Contrato (Scrollable) */}
                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                     
                     <div className="space-y-4 text-sm text-zinc-400 leading-relaxed text-justify">
                        <p>
                           Pelo presente instrumento particular, de um lado, na qualidade de <strong>LOCADOR</strong>, a empresa corporativa 
                           <span className="text-white font-bold ml-1">{selectedBookingContract.company?.name || 'Desconhecida'}</span>, e de outro lado, 
                           na qualidade de <strong>LOCATÁRIO</strong>, o cliente 
                           <span className="text-white font-bold ml-1">{(selectedBookingContract as any).renter?.full_name || 'Usuário CineHub'}</span>, 
                           têm entre si justo e acertado o presente TERMO DE LOCAÇÃO DE EQUIPAMENTOS AUDIOVISUAIS, intermediado pela plataforma CINEHUB MASTER.
                        </p>
                     </div>

                     <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                        <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-4 border-b border-zinc-800 pb-2">Cláusula 1ª - Do Objeto</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                           <div>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Equipamento</p>
                              <p className="text-white font-bold">{selectedBookingContract.equipment?.name || 'N/A'}</p>
                           </div>
                           <div>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Quantidade</p>
                              <p className="text-white font-bold">{selectedBookingContract.quantity} Unidade(s)</p>
                           </div>
                           <div>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Data Inicial</p>
                              <p className="text-white font-bold">{new Date(selectedBookingContract.start_date).toLocaleDateString('pt-BR')}</p>
                           </div>
                           <div>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Data Final</p>
                              <p className="text-white font-bold">{new Date(selectedBookingContract.end_date).toLocaleDateString('pt-BR')}</p>
                           </div>
                        </div>
                     </div>

                     <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                        <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-4 border-b border-zinc-800 pb-2">Cláusula 2ª - Dos Valores</h4>
                        <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2 mb-2">
                           <span className="text-zinc-400">Repasse Direto à Locadora (85%)</span>
                           <span className="text-white font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedBookingContract.total_amount * 0.85)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2 mb-2">
                           <span className="text-zinc-400">Taxa de Operação CineHub (15%)</span>
                           <span className="text-white font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedBookingContract.total_amount * 0.15)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                           <span className="text-xs font-black uppercase tracking-widest text-zinc-300">Valor Total Bruto</span>
                           <span className="text-xl font-black text-emerald-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedBookingContract.total_amount)}</span>
                        </div>
                     </div>

                     <div className="space-y-4 text-xs text-zinc-500 leading-relaxed text-justify mt-8">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Cláusula 3ª - Das Obrigações</h4>
                        <p>O LOCATÁRIO obriga-se a utilizar o equipamento de forma profissional, responsabilizando-se integralmente por danos, furtos ou extravios ocorridos durante a vigência deste termo. O LOCADOR garante que o equipamento encontra-se testado e em perfeito estado de funcionamento.</p>
                        
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-4">Cláusula 4ª - Foro Legal</h4>
                        <p>As partes elegem o foro de domicílio do CINEHUB SERVIÇOS DE TECNOLOGIA LTDA para resolução de quaisquer disputas geradas a partir desta locação, firmando este presente sob os selos de certificação digital de nossa rede.</p>
                     </div>

                  </div>

                  {/* Footer Ações */}
                  <div className="p-6 border-t border-zinc-900 bg-zinc-900/30 flex justify-end gap-4">
                     <Button variant="outline" onClick={() => setSelectedBookingContract(null)} className="font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl bg-transparent border-zinc-700 text-white hover:bg-zinc-800">
                        Fechar Histórico
                     </Button>
                     <Button onClick={() => { alert('Impressão de PDF enviada para emissão fiscal.'); setSelectedBookingContract(null); }} className="font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl bg-primary text-black hover:bg-primary/90">
                        Exportar PDF
                     </Button>
                  </div>
               </div>
            </div>
         )}
         {/* LOGISTICS MODAL OVERLAY */}
         {selectedLogisticsBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
               <div className="bg-zinc-950 border border-zinc-800 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
                  
                  {/* Header Logística */}
                  <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
                           <Navigation className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                           <h2 className="text-xl font-black uppercase tracking-widest text-white">Central de Despacho Inteligente</h2>
                           <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                              OTIMIZAÇÃO ALGORÍTMICA DE ROTA <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-2" />
                           </p>
                        </div>
                     </div>
                     <button onClick={() => setSelectedLogisticsBooking(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                        <XCircle className="h-6 w-6 text-zinc-500" />
                     </button>
                  </div>

                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Info da Rota */}
                     <div className="space-y-6 border-r border-zinc-900 pr-0 md:pr-8 flex flex-col">
                        <div>
                           <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-3">Detalhes do Frete</p>
                           <div className="bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800 space-y-4">
                              <div className="flex items-start gap-3">
                                 <div className="mt-1"><MapPin className="h-4 w-4 text-emerald-500" /></div>
                                 <div className="flex-1">
                                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Origem (Locadora)</p>
                                    <p className="text-xs text-white font-bold truncate">{selectedLogisticsBooking.company?.name}</p>
                                 </div>
                              </div>
                              <div className="border-l-2 border-dashed border-zinc-800 ml-2 h-4 my-1"></div>
                              <div className="flex items-start gap-3">
                                 <div className="mt-1"><MapPin className="h-4 w-4 text-primary" /></div>
                                 <div className="flex-1">
                                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Destino (Set)</p>
                                    <p className="text-xs text-white font-bold truncate">Residência Cineasta</p>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div>
                           <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-3">Especificações de Carga</p>
                           <div className="bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between">
                               <div>
                                  <p className="text-xs text-white font-bold truncate max-w-[150px]">{selectedLogisticsBooking.equipment?.name}</p>
                                  <p className="text-[10px] text-zinc-500 font-medium">Classificação Premium</p>
                               </div>
                               <Badge className="bg-primary/10 text-primary uppercase text-[9px] tracking-widest">Valioso</Badge>
                           </div>
                        </div>

                        {/* Radar / Espaço Equilibrador */}
                        <div className="flex-1 flex flex-col justify-end">
                           <div className="bg-zinc-950 border border-zinc-900 rounded-2xl h-24 relative overflow-hidden flex items-center justify-center">
                              <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHBhdGggZD0iTTIwIDBoLTIwaDIwdjIwSDIwVjB6bS0yIDJINnYxNmgxMlYyeiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==')]"></div>
                              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent z-10" />
                              <div className="relative z-20 flex flex-col items-center">
                                 <div className="relative flex items-center justify-center">
                                     <div className="absolute w-12 h-12 border border-emerald-500/20 rounded-full animate-ping"></div>
                                     <Navigation className="h-5 w-5 text-emerald-500/50 mb-1" />
                                 </div>
                                 <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mt-2">Traçando Rota em Background</p>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* API de Cotação */}
                     <div className="space-y-3">
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex justify-between items-center bg-emerald-950/20 border border-emerald-900/30 px-3 py-2 rounded-xl mb-4">
                           Painel de Parceiros <span className="text-emerald-500 flex items-center gap-1"><Clock className="h-3 w-3 animate-pulse"/> CONECTADO</span>
                        </p>

                        <div className="p-3 border-2 border-emerald-500/50 bg-emerald-950/20 hover:border-emerald-500 transition-all rounded-xl cursor-pointer group flex flex-col justify-center">
                           <div className="flex justify-between items-center border-b border-emerald-900/50 pb-2 mb-2">
                              <h3 className="text-sm font-black tracking-tighter text-emerald-500 flex items-center gap-2">
                                 FROTA PRÓPRIA <Badge className="bg-emerald-500 text-black text-[8px] uppercase font-black tracking-widest h-4 px-1">Recomendado</Badge>
                              </h3>
                              <p className="text-[10px] text-zinc-400 font-bold">Imediato</p>
                           </div>
                           <div className="flex justify-between items-end">
                              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest leading-[1.2] w-[60%]">Ativo da Locadora</p>
                              <p className="text-base font-black text-emerald-500">GRÁTIS</p>
                           </div>
                        </div>
                        
                        <div className="p-3 border border-zinc-800 hover:border-orange-500 transition-all rounded-xl cursor-pointer group hover:bg-orange-500/5 flex flex-col justify-center">
                           <div className="flex justify-between items-center border-b border-zinc-900 pb-2 mb-2">
                              <h3 className="text-sm font-black italic tracking-tighter text-orange-500">LALAMOVE</h3>
                              <p className="text-[10px] text-zinc-400 font-bold">~15 min</p>
                           </div>
                           <div className="flex justify-between items-end">
                              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-[1.2] w-[60%]">Carreta / Furgao M</p>
                              <p className="text-base font-black text-white group-hover:text-orange-500 transition-colors">R$ 45,90</p>
                           </div>
                        </div>

                        <div className="p-3 border border-zinc-800 hover:border-black/50 transition-all rounded-xl cursor-pointer bg-zinc-900/50 flex flex-col justify-center">
                           <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-2">
                              <h3 className="text-sm font-black tracking-tighter text-white">Uber <span className="font-medium">Flash</span></h3>
                              <p className="text-[10px] text-zinc-400 font-bold">~5 min</p>
                           </div>
                           <div className="flex justify-between items-end">
                              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-[1.2] w-[60%]">Premium Rápido</p>
                              <p className="text-base font-black text-white">R$ 52,10</p>
                           </div>
                        </div>

                        <div className="p-3 border border-zinc-800 hover:border-yellow-500 transition-all rounded-xl cursor-pointer group hover:bg-yellow-500/5 flex flex-col justify-center">
                           <div className="flex justify-between items-center border-b border-zinc-900 pb-2 mb-2">
                              <h3 className="text-sm font-black tracking-tighter text-yellow-500">99<span className="font-medium text-white">Entrega</span></h3>
                              <p className="text-[10px] text-zinc-400 font-bold">~25 min</p>
                           </div>
                           <div className="flex justify-between items-end">
                              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-[1.2] w-[60%]">Carro Passeio Conv.</p>
                              <p className="text-base font-black text-white group-hover:text-yellow-500 transition-colors">R$ 38,50</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="p-6 border-t border-zinc-900 bg-zinc-900/30 flex justify-end">
                     <Button className="w-full font-black uppercase tracking-widest h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl transition-all">
                        Despachar Logística
                     </Button>
                  </div>
               </div>
            </div>
         )}
    </div>
  );
}
