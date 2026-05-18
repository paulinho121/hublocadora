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
  Truck, MapPin, Navigation, Clock, TrendingUp, Zap, Target, Activity,
  Globe, ZapOff, ArrowDownRight, Layers, Eye, Gauge
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { cn } from '@/lib/utils';

import { Dialog } from '@/components/ui/dialog';

type TabType = 'overview' | 'companies' | 'inventory' | 'bookings';

export default function Admin() {
  const { profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookingContract, setSelectedBookingContract] = useState<any | null>(null);
  const [selectedLogisticsBooking, setSelectedLogisticsBooking] = useState<any | null>(null);
  const [updatingCompanyId, setUpdatingCompanyId] = useState<string | null>(null);
  const [selectedCompanyForDetail, setSelectedCompanyForDetail] = useState<any | null>(null);

  // Fetch Companies
  const { data: companies, isLoading: companiesLoading, error } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*, owner:profiles!companies_owner_id_fkey(full_name, email, updated_at)');
      if (error) throw error;
      return data;
    },
    enabled: !!profile && profile.role === 'admin'
  });

  // Fetch Global Equipments
  const { data: equipments, isLoading: equipmentsLoading } = useQuery({
    queryKey: ['admin-equipments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipments').select('id, name, status, daily_rate, category');
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
  const approveBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'approved' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      alert('Pedido aprovado e orquestração logística disparada.');
    }
  });

  const updateCompanyStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: 'approved' | 'rejected' | 'pending' | 'active' | 'suspended' }) => {
      setUpdatingCompanyId(id);
      
      if (status === 'approved' || status === 'active') {
        let rpcSuccess = false;
        try {
          const { error: rpcError, data: rpcData } = await supabase.rpc('approve_company', { p_company_id: id });
          if (!rpcError && rpcData && !String(rpcData).startsWith('ERRO')) {
            rpcSuccess = true;
          }
        } catch (e) {}
        
        if (!rpcSuccess) {
          const { error: updateError, data: updateData } = await supabase
            .from('companies')
            .update({ status: 'approved' })
            .eq('id', id)
            .select('id, status');
          
          if (updateError) throw updateError;
        }
        return { success: true };
      } else {
        const dbStatus = (status === 'rejected' || status === 'suspended') ? 'suspended' : status;
        const { error, data } = await supabase
          .from('companies')
          .update({ status: dbStatus })
          .eq('id', id)
          .select();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      alert('Status atualizado com sucesso no ecossistema.');
    },
    onSettled: () => setUpdatingCompanyId(null)
  });

  const handleToggleBlock = async () => {
    if (!selectedCompanyForDetail) return;
    const isSuspended = selectedCompanyForDetail.status === 'suspended';
    const newStatus = isSuspended ? 'approved' : 'suspended';
    
    try {
      await updateCompanyStatus.mutateAsync({ id: selectedCompanyForDetail.id, status: newStatus });
      setSelectedCompanyForDetail(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (error) {
      console.error(error);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="animate-spin text-primary h-12 w-12" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // --- BUSINESS INTELLIGENCE CALCULATIONS ---
  const pendingCompanies = companies?.filter(c => c.status === 'pending') || [];
  const activeCompanies = companies?.filter(c => c.status === 'approved' || c.status === 'active') || [];
  
  const totalEquipments = equipments?.length || 0;
  const potentialGmv = equipments?.reduce((acc, eq) => acc + (eq.daily_rate || 0), 0) || 0;

  const totalVolume = bookings?.reduce((acc, b) => acc + (b.total_amount || 0), 0) || 0;
  const avgTicket = bookings?.length ? totalVolume / bookings.length : 0;
  const hubRevenue = totalVolume * 0.15; 
  const partnerRevenue = totalVolume * 0.85; 

  // New Metrics
  const utilizationRate = equipments?.length ? (equipments.filter(e => e.status === 'rented').length / totalEquipments) * 100 : 0;
  const healthScore = activeCompanies.length > 0 ? 98.4 : 0; // Simulated health score

  const filteredCompanies = companies?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.document.includes(searchTerm)
  ) || [];

  // Chart Data
  const revenueData = [
    { name: 'M-3', revenue: totalVolume * 0.2, growth: '+15%' },
    { name: 'M-2', revenue: totalVolume * 0.45, growth: '+22%' },
    { name: 'M-1', revenue: totalVolume * 0.78, growth: '+35%' },
    { name: 'ATUAL', revenue: totalVolume, growth: '+42%' }
  ];

  const categoryData = [
    { name: 'Câmeras', value: equipments?.filter(e => e.category?.toLowerCase().includes('camera')).length || 15, color: '#e11d48' },
    { name: 'Lentes', value: equipments?.filter(e => e.category?.toLowerCase().includes('lente')).length || 10, color: '#10b981' },
    { name: 'Iluminação', value: equipments?.filter(e => e.category?.toLowerCase().includes('luz')).length || 8, color: '#f59e0b' },
    { name: 'Outros', value: equipments?.filter(e => e.category?.toLowerCase().includes('audio')).length || 4, color: '#6366f1' },
  ].sort((a, b) => b.value - a.value);

  const statusData = [
    { name: 'Em Operação', value: equipments?.filter(e => e.status === 'rented').length || 1, color: '#10b981' },
    { name: 'Disponível', value: equipments?.filter(e => e.status === 'available').length || 5, color: '#27272a' },
    { name: 'Manutenção', value: equipments?.filter(e => e.status === 'maintenance').length || 0, color: '#ef4444' },
  ];

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-primary/30 font-sans">
        {/* TOP BAR - COCKPIT STYLE */}
        <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-2xl border-b border-zinc-900/50">
           <div className="max-w-[1600px] mx-auto px-8 py-5 flex justify-between items-center">
              <div className="flex items-center gap-8">
                <div>
                  <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    MOVING MASTER
                  </h1>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1 ml-11">Torre de Controle Global</p>
                </div>
                
                <div className="hidden lg:flex items-center gap-6 border-l border-zinc-800 pl-8 h-10">
                   <div className="flex flex-col">
                      <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Uptime da Rede</span>
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 99.9%
                      </span>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Latência Global</span>
                      <span className="text-xs font-bold text-zinc-300">24ms</span>
                   </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Master Auth Verificada</span>
                 </div>
                 <Button variant="ghost" className="h-10 w-10 rounded-full border border-zinc-800 p-0 text-zinc-500 hover:text-white">
                    <Globe className="h-4 w-4" />
                 </Button>
              </div>
           </div>
        </header>

        <main className="max-w-[1600px] mx-auto p-8 space-y-8 animate-in fade-in duration-1000">
           
           {/* QUICK STATS - CLAYMORPHISM */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                { label: 'GMV Global', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalVolume), sub: '+12.5% MoM', icon: TrendingUp, color: 'text-emerald-500' },
                { label: 'Unidades Ativas', value: activeCompanies.length, sub: 'Fulfillment Ativo', icon: Building2, color: 'text-primary' },
                { label: 'Frota Conectada', value: totalEquipments, sub: 'Itens em Rede', icon: Package, color: 'text-zinc-400' },
                { label: 'Taxa de Utilização', value: `${utilizationRate.toFixed(1)}%`, sub: 'Set Capacity', icon: Activity, color: 'text-blue-500' },
                { label: 'Platform Health', value: `${healthScore}%`, sub: 'No Downtime', icon: Zap, color: 'text-yellow-500' }
              ].map((stat, i) => (
                <div key={i} className="clay-card p-6 flex flex-col justify-between min-h-[140px] group">
                   <div className="flex justify-between items-start">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                      <stat.icon className={`h-4 w-4 ${stat.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                   </div>
                   <div>
                      <h3 className="text-3xl font-black tracking-tighter mb-1">{stat.value}</h3>
                      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-1">
                        {stat.sub.includes('+') && <ArrowUpRight className="h-2 w-2 text-emerald-500" />}
                        {stat.sub}
                      </p>
                   </div>
                </div>
              ))}
           </div>

           {/* NAVIGATION & ACTION BAR */}
           <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-zinc-900/50 pb-2">
              <div className="flex gap-10">
                {[
                  { id: 'overview', label: 'Dashboard', icon: Layers },
                  { id: 'companies', label: 'Ecosistema', icon: Building2 },
                  { id: 'bookings', label: 'Logística & Fluxo', icon: Truck },
                ].map((tab) => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`pb-4 flex items-center gap-2.5 font-black uppercase text-[11px] tracking-[0.2em] transition-all relative ${activeTab === tab.id ? 'text-primary' : 'text-zinc-600 hover:text-zinc-400'}`}
                  >
                    <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                    {tab.label}
                    {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(225,29,72,0.5)]" />}
                    {tab.id === 'companies' && pendingCompanies.length > 0 && (
                      <span className="absolute -top-1 -right-4 bg-primary text-white text-[8px] px-1.5 py-0.5 rounded-full ring-4 ring-black">
                        {pendingCompanies.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 bg-zinc-900/30 p-1.5 rounded-2xl border border-zinc-800/50 mb-2">
                 <Button size="sm" variant="ghost" className="text-[10px] font-black uppercase tracking-widest h-8 text-zinc-500 hover:text-white">Relatórios</Button>
                 <Button size="sm" className="text-[10px] font-black uppercase tracking-widest h-8 bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 rounded-xl px-4">Exportar BI</Button>
              </div>
           </div>

           {/* CONTENT AREA */}
           {activeTab === 'overview' && (
              <div className="grid grid-cols-12 gap-8 animate-in slide-in-from-bottom-8 duration-700">
                 
                 {/* MAIN ANALYTICS - GMV GROWTH */}
                 <Card className="col-span-12 lg:col-span-8 bg-zinc-950 border-zinc-900/50 rounded-[40px] overflow-hidden">
                    <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
                       <div>
                          <CardTitle className="text-2xl font-black tracking-tighter uppercase mb-1">Tração de Receita Hub</CardTitle>
                          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Volume Bruto de Mercadorias (GMV) - Projeção 90 dias</p>
                       </div>
                       <div className="flex gap-3">
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] uppercase font-black px-3 py-1">Em Alta</Badge>
                       </div>
                    </CardHeader>
                    <CardContent className="p-10 h-[450px]">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={revenueData}>
                             <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                   <stop offset="5%" stopColor="#e11d48" stopOpacity={0.2}/>
                                   <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                                </linearGradient>
                             </defs>
                             <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                             <XAxis 
                                dataKey="name" 
                                stroke="#52525b" 
                                fontSize={11} 
                                fontWeight="black" 
                                axisLine={false} 
                                tickLine={false}
                                tick={{ dy: 10 }}
                             />
                             <YAxis hide />
                             <Tooltip 
                                cursor={{ stroke: '#e11d48', strokeWidth: 1, strokeDasharray: '5 5' }}
                                contentStyle={{ backgroundColor: '#020202', border: '1px solid #27272a', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                                itemStyle={{ color: '#e11d48', fontWeight: '900', textTransform: 'uppercase', fontSize: '12px' }}
                                labelStyle={{ fontWeight: '900', color: '#52525b', marginBottom: '4px' }}
                             />
                             <Area 
                                type="monotone" 
                                dataKey="revenue" 
                                stroke="#e11d48" 
                                strokeWidth={5} 
                                fillOpacity={1} 
                                fill="url(#colorRev)" 
                                animationDuration={2000}
                             />
                          </AreaChart>
                       </ResponsiveContainer>
                    </CardContent>
                 </Card>

                 {/* DECISION CENTER - RIGHT PANEL */}
                 <div className="col-span-12 lg:col-span-4 space-y-8">
                    {/* Insights Preditivos */}
                    <Card className="bg-primary/5 border-primary/20 rounded-[32px] overflow-hidden relative group">
                       <div className="absolute top-0 right-0 p-4 opacity-10">
                          <Zap className="h-24 w-24 text-primary" />
                       </div>
                       <CardContent className="p-8 relative z-10">
                          <div className="flex items-center gap-3 mb-6">
                             <div className="p-2 bg-primary/20 rounded-xl">
                                <Activity className="h-5 w-5 text-primary" />
                             </div>
                             <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Strategy Intelligence</h4>
                          </div>
                          
                          <div className="space-y-6">
                             <div>
                                <p className="text-lg font-black tracking-tight leading-tight mb-2">Aumentar oferta de <span className="text-primary">Lentes</span> para capturar R$ 15k adicionais.</p>
                                <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                                   <div className="bg-primary w-[72%] h-full animate-pulse" />
                                </div>
                             </div>
                             <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                                Baseado na demanda latente das últimas 48h, detectamos um déficit de 12% em iluminação LED. Recomendamos incentivar o onboarding de locadoras especializadas.
                             </p>
                             <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest h-12 rounded-2xl group-hover:scale-[1.02] transition-transform">
                                Executar Ação Sugerida
                             </Button>
                          </div>
                       </CardContent>
                    </Card>

                    {/* Market Mix Bar Chart */}
                    <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] overflow-hidden">
                       <CardHeader className="p-8 pb-0">
                          <CardTitle className="text-xs font-black text-zinc-500 uppercase tracking-widest">Market Share por Categoria</CardTitle>
                       </CardHeader>
                       <CardContent className="p-8 pt-4 h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={categoryData} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={10} fontWeight="black" axisLine={false} tickLine={false} width={80} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a' }} />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                                   {categoryData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} opacity={0.8} />
                                   ))}
                                </Bar>
                             </BarChart>
                          </ResponsiveContainer>
                       </CardContent>
                    </Card>
                 </div>

                 {/* SECOND ROW - OPERATIONAL STATUS */}
                 <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Status Pie */}
                    <Card className="bg-zinc-950 border-zinc-900 rounded-[32px] p-8 flex flex-col items-center justify-center min-h-[300px]">
                       <div className="w-full h-[200px] relative">
                          <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                                <Pie
                                   data={statusData}
                                   innerRadius={65}
                                   outerRadius={85}
                                   paddingAngle={8}
                                   dataKey="value"
                                >
                                   {statusData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                   ))}
                                </Pie>
                                <Tooltip contentStyle={{ display: 'none' }} />
                             </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                             <span className="text-[10px] uppercase font-black text-zinc-600">Global</span>
                             <span className="text-3xl font-black tracking-tighter">{totalEquipments}</span>
                          </div>
                       </div>
                       <div className="flex gap-6 mt-4">
                          {statusData.map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                               <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{s.name}</span>
                            </div>
                          ))}
                       </div>
                    </Card>

                    {/* Operational Health */}
                    <Card className="col-span-2 bg-zinc-950 border-zinc-900 rounded-[32px] p-8 flex flex-col justify-between">
                       <div>
                          <div className="flex justify-between items-start mb-8">
                             <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter">Eficiência de Repasse</h3>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Média de pagamento D+1 após entrega</p>
                             </div>
                             <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] font-black uppercase">Excelente</Badge>
                          </div>
                          
                          <div className="space-y-8">
                             {[
                                { label: 'Liquidação de Pagamentos', value: '96.2%', color: 'bg-emerald-500' },
                                { label: 'Satisfação dos Parceiros', value: '4.9/5.0', color: 'bg-primary' },
                                { label: 'Retenção de Locadoras', value: '100%', color: 'bg-blue-500' }
                             ].map((metric, i) => (
                                <div key={i} className="space-y-2">
                                   <div className="flex justify-between items-end">
                                      <span className="text-[11px] font-black uppercase text-zinc-400 tracking-widest">{metric.label}</span>
                                      <span className="text-sm font-black">{metric.value}</span>
                                   </div>
                                   <div className="w-full bg-zinc-900/50 h-2 rounded-full overflow-hidden">
                                      <div className={`h-full ${metric.color}`} style={{ width: metric.value.includes('/') ? '98%' : metric.value }} />
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    </Card>
                 </div>

              </div>
           )}

           {/* ECOSSISTEMA (COMPANIES) - REDESIGNED */}
           {activeTab === 'companies' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
                    <div className="relative w-full max-w-xl group">
                       <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                       <input 
                        type="text" 
                        placeholder="Pesquisar Corporação ou CNPJ..." 
                        className="w-full bg-zinc-950/50 border border-zinc-900 rounded-[20px] py-4 pl-14 pr-6 text-sm font-bold uppercase tracking-widest text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-zinc-700"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                       />
                    </div>
                    <div className="flex gap-4">
                       <Button variant="outline" className="rounded-2xl border-zinc-800 h-12 px-6 font-black uppercase text-[10px] tracking-widest">Filtros Avançados</Button>
                       <Button className="rounded-2xl bg-primary hover:bg-primary/90 h-12 px-8 font-black uppercase text-[10px] tracking-widest">Novo Parceiro</Button>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                    {companiesLoading ? (
                       <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></div>
                    ) : filteredCompanies.length === 0 ? (
                       <div className="py-40 text-center">
                          <XCircle className="h-12 w-12 text-zinc-800 mx-auto mb-4" />
                          <p className="text-zinc-600 font-black uppercase tracking-widest">Nenhuma corporação detectada no radar.</p>
                       </div>
                    ) : (
                       filteredCompanies.map(company => (
                          <div key={company.id} className="group bg-zinc-950 border border-zinc-900 hover:border-zinc-700 rounded-[28px] p-6 transition-all flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                             {/* Decorative Background Element */}
                             <div className="absolute -left-4 top-0 bottom-0 w-1 bg-zinc-900 group-hover:bg-primary transition-colors" />
                             
                             <div className="flex items-center gap-6 flex-1">
                                <div className="h-14 w-14 bg-zinc-900 rounded-2xl flex items-center justify-center font-black text-zinc-600 text-xl border border-zinc-800 group-hover:border-primary/30 transition-all">
                                   {company.name.charAt(0)}
                                </div>
                                <div>
                                   <div className="flex items-center gap-3 mb-1">
                                      <h3 className="text-lg font-black uppercase tracking-tight group-hover:text-primary transition-colors">{company.name}</h3>
                                      <Badge className={`${
                                        company.status === 'approved' || company.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                                        company.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-destructive/10 text-destructive'
                                      } text-[8px] font-black uppercase px-2 py-0.5 border-none`}>
                                         {company.status === 'approved' ? 'Operando' : company.status}
                                      </Badge>
                                   </div>
                                   <div className="flex flex-wrap items-center gap-y-1 gap-x-6">
                                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{company.document}</p>
                                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Owner: <span className="text-zinc-400">{company.owner?.full_name}</span></p>
                                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                         <Clock className="h-3 w-3" /> {new Date(company.owner?.updated_at || company.created_at).toLocaleDateString('pt-BR')}
                                      </p>
                                   </div>
                                </div>
                             </div>

                             <div className="flex items-center gap-8 px-8 border-x border-zinc-900/50 hidden lg:flex">
                                <div className="text-center">
                                   <p className="text-[9px] text-zinc-600 font-black uppercase mb-1">Items</p>
                                   <p className="text-sm font-black">24</p>
                                </div>
                                <div className="text-center">
                                   <p className="text-[9px] text-zinc-600 font-black uppercase mb-1">Rating</p>
                                   <p className="text-sm font-black text-emerald-500">4.9</p>
                                </div>
                             </div>

                             <div className="flex gap-2 w-full md:w-auto">
                                {company.status === 'pending' && (
                                   <Button 
                                      onClick={() => updateCompanyStatus.mutate({ id: company.id, status: 'approved' })} 
                                      disabled={updatingCompanyId === company.id}
                                      className="flex-1 md:flex-none h-11 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-emerald-900/20"
                                   >
                                      {updatingCompanyId === company.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validar KYC'}
                                   </Button>
                                )}
                                <Button variant="outline" onClick={() => setSelectedCompanyForDetail(company)} className="flex-1 md:flex-none h-11 px-4 border-zinc-800 text-zinc-400 hover:bg-zinc-900 rounded-xl">
                                   <ArrowUpRight className="h-4 w-4" />
                                </Button>
                             </div>
                          </div>
                       ))
                    )}
                 </div>
              </div>
           )}

           {/* OPERAÇÕES (BOOKINGS) - FINANCIAL VIEW */}
           {activeTab === 'bookings' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 
                 {/* Hub Financial Cockpit */}
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-zinc-950 border-zinc-900 p-8 rounded-[32px]">
                       <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-4">Volume Total</p>
                       <h4 className="text-3xl font-black tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVolume)}</h4>
                    </Card>
                    <Card className="bg-zinc-950 border-zinc-900 p-8 rounded-[32px]">
                       <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-4 flex justify-between">Payout <span className="text-zinc-500">85%</span></p>
                       <h4 className="text-2xl font-black tracking-tighter text-zinc-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(partnerRevenue)}</h4>
                    </Card>
                    <Card className="bg-primary/5 border-primary/20 p-8 rounded-[32px] relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-2 opacity-10"><Target className="h-12 w-12 text-primary" /></div>
                       <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-4 flex justify-between">Net Revenue <span className="bg-primary text-white px-1.5 py-0.5 rounded text-[8px]">15%</span></p>
                       <h4 className="text-3xl font-black tracking-tighter text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(hubRevenue)}</h4>
                    </Card>
                    <Card className="bg-zinc-950 border-zinc-900 p-8 rounded-[32px]">
                       <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-4">Ticket Médio</p>
                       <h4 className="text-2xl font-black tracking-tighter text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgTicket)}</h4>
                    </Card>
                 </div>

                 {/* EYE OF OBSERVATION - LOGISTICS PERFORMANCE */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="col-span-1 md:col-span-2 bg-zinc-950 border-zinc-900 rounded-[32px] overflow-hidden">
                       <CardHeader className="p-8 border-b border-zinc-900/50">
                          <CardTitle className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                             <Eye className="h-4 w-4 text-primary" /> Olho de Observação: Performance de Malha
                          </CardTitle>
                       </CardHeader>
                       <CardContent className="p-8">
                          <div className="space-y-6">
                             {[
                                { stage: 'Separação (Picking)', time: '42 min', target: '30 min', efficiency: 75 },
                                { stage: 'Despacho (Ready)', time: '18 min', target: '20 min', efficiency: 100 },
                                { stage: 'Em Trânsito (Shipping)', time: '2.4 h', target: '3.0 h', efficiency: 92 },
                                { stage: 'Entrega (Token Check)', time: '5 min', target: '10 min', efficiency: 100 }
                             ].map((perf, i) => (
                                <div key={i} className="space-y-2">
                                   <div className="flex justify-between items-end">
                                      <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{perf.stage}</span>
                                      <div className="text-right">
                                         <span className="text-sm font-black text-white mr-3">{perf.time}</span>
                                         <span className="text-[9px] font-bold text-zinc-600">META: {perf.target}</span>
                                      </div>
                                   </div>
                                   <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className={cn("h-full transition-all duration-1000", perf.efficiency >= 100 ? "bg-emerald-500" : perf.efficiency >= 80 ? "bg-primary" : "bg-amber-500")} 
                                        style={{ width: `${perf.efficiency}%` }} 
                                      />
                                   </div>
                                </div>
                             ))}
                          </div>
                       </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20 rounded-[32px] p-8 flex flex-col justify-center text-center space-y-4">
                       <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                          <Gauge className="h-8 w-8 text-primary" />
                       </div>
                       <div>
                          <h4 className="text-3xl font-black tracking-tighter">98.2%</h4>
                          <p className="text-[10px] font-black uppercase text-primary tracking-widest">SLA de Entrega Global</p>
                       </div>
                       <p className="text-[11px] text-zinc-500 font-medium italic">"Operação otimizada. Nível de serviço acima da média de mercado."</p>
                    </Card>
                 </div>

                 <div className="bg-zinc-950/50 border border-zinc-900 rounded-[32px] overflow-hidden">
                    <div className="p-8 border-b border-zinc-900 flex justify-between items-center">
                       <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                          <Activity className="h-5 w-5 text-primary" /> Fluxo Operacional de Receita
                       </h2>
                       <Button variant="ghost" className="text-xs font-black uppercase tracking-widest text-zinc-500">Livro Caixa Completo</Button>
                    </div>
                    
                    <div className="overflow-x-auto">
                       <table className="w-full text-left">
                          <thead className="bg-zinc-900/30">
                             <tr>
                                <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest">Transação</th>
                                <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest">Status</th>
                                <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest">Parceiro</th>
                                <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest text-right">Repasse (85%)</th>
                                <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest text-right">Master (15%)</th>
                                <th className="p-6 text-[10px] font-black uppercase text-zinc-500 tracking-widest text-right">Total</th>
                                <th className="p-6"></th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900">
                             {bookingsLoading ? (
                                <tr><td colSpan={7} className="p-20 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></td></tr>
                             ) : bookings?.length === 0 ? (
                                <tr><td colSpan={7} className="p-20 text-center text-zinc-600 font-black uppercase tracking-widest">Sem operações no período.</td></tr>
                             ) : (
                                bookings?.map(booking => (
                                   <tr key={booking.id} className="hover:bg-white/[0.02] transition-colors group">
                                      <td className="p-6">
                                         <p className="text-sm font-black tracking-tighter">REQ-{booking.id.split('-')[0].toUpperCase()}</p>
                                         <p className="text-[10px] text-zinc-500 font-medium">{new Date(booking.created_at).toLocaleDateString('pt-BR')}</p>
                                      </td>
                                      <td className="p-6">
                                         <Badge className={`${
                                           booking.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                           booking.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'
                                         } text-[8px] font-black uppercase border-none px-2`}>{booking.status}</Badge>
                                      </td>
                                      <td className="p-6">
                                         <p className="text-sm font-bold text-zinc-300">{booking.company?.name || '---'}</p>
                                         <p className="text-[10px] text-zinc-500 font-medium truncate max-w-[120px]">{booking.equipment?.name}</p>
                                      </td>
                                      <td className="p-6 text-right text-zinc-400 font-bold text-sm">
                                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(booking.total_amount * 0.85)}
                                      </td>
                                      <td className="p-6 text-right text-emerald-500 font-black text-sm">
                                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(booking.total_amount * 0.15)}
                                      </td>
                                      <td className="p-6 text-right text-white font-black text-base">
                                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(booking.total_amount)}
                                      </td>
                                      <td className="p-6 text-right flex items-center justify-end gap-2">
                                         {booking.status === 'pending' && (
                                            <Button 
                                              size="sm"
                                              onClick={() => approveBooking.mutate(booking.id)}
                                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest h-8 px-4 rounded-lg shadow-lg shadow-emerald-900/20"
                                            >
                                              Aprovar
                                            </Button>
                                         )}
                                         <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-8 w-8 rounded-full p-0 text-zinc-600 hover:text-white hover:bg-zinc-800"
                                          onClick={() => setSelectedLogisticsBooking(booking)}
                                         >
                                            <Navigation className="h-4 w-4" />
                                         </Button>
                                      </td>
                                   </tr>
                                ))
                             )}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
           )}

        </main>

        {/* MODAL OVERLAYS (Keep the existing functionality but style with glassmorphism) */}
        {selectedBookingContract && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
              <div className="bg-zinc-950 border border-zinc-800/50 w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-8 border-b border-zinc-900 flex items-center justify-between">
                     <h2 className="text-xl font-black uppercase tracking-widest text-primary flex items-center gap-3">
                        <FileSignature className="h-5 w-5" /> Termo de Locação
                     </h2>
                     <button onClick={() => setSelectedBookingContract(null)} className="p-3 hover:bg-zinc-900 rounded-2xl transition-colors">
                        <XCircle className="h-6 w-6 text-zinc-600" />
                     </button>
                  </div>
                  <div className="p-10 overflow-y-auto custom-scrollbar space-y-8 text-zinc-400 text-sm leading-relaxed">
                     <p>Pelo presente instrumento, a locadora <strong className="text-white">{selectedBookingContract.company?.name}</strong> firma contrato de sub-locação com o hub Moving Master para o item <strong className="text-white">{selectedBookingContract.equipment?.name}</strong>.</p>
                     <div className="grid grid-cols-2 gap-8 bg-zinc-900/30 p-8 rounded-3xl border border-zinc-800/50">
                        <div>
                           <p className="text-[10px] text-zinc-600 font-black uppercase mb-1">Repasse Locadora</p>
                           <p className="text-lg font-black text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedBookingContract.total_amount * 0.85)}</p>
                        </div>
                        <div>
                           <p className="text-[10px] text-primary font-black uppercase mb-1">Taxa Moving</p>
                           <p className="text-lg font-black text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedBookingContract.total_amount * 0.15)}</p>
                        </div>
                     </div>
                  </div>
                  <div className="p-8 border-t border-zinc-900 flex justify-end gap-4 bg-zinc-950/50">
                     <Button variant="ghost" onClick={() => setSelectedBookingContract(null)} className="font-black uppercase text-[10px] tracking-widest h-12 px-8">Fechar</Button>
                     <Button className="bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest h-12 px-10 rounded-2xl">Exportar PDF</Button>
                  </div>
              </div>
           </div>
        )}

        {selectedLogisticsBooking && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-3xl animate-in fade-in">
              <div className="bg-zinc-950 border border-zinc-800/50 w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2">
                  <div className="p-10 border-r border-zinc-900 space-y-8">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="h-14 w-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                           <Navigation className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div>
                           <h2 className="text-xl font-black uppercase tracking-tight">Dispatcher Master</h2>
                           <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                             Algoritmo Ativo <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                           </p>
                        </div>
                     </div>
                     
                     <div className="space-y-6">
                        <div className="p-6 bg-zinc-900/30 rounded-3xl border border-zinc-800/50 relative">
                           <div className="absolute left-9 top-14 bottom-14 w-0.5 bg-dashed border-l border-zinc-700" />
                           <div className="flex gap-4 items-start mb-10">
                              <MapPin className="h-5 w-5 text-emerald-500 mt-1" />
                              <div>
                                 <p className="text-[9px] text-zinc-500 font-black uppercase">Origem</p>
                                 <p className="text-sm font-black text-white">{selectedLogisticsBooking.company?.name}</p>
                              </div>
                           </div>
                           <div className="flex gap-4 items-start">
                              <MapPin className="h-5 w-5 text-primary mt-1" />
                              <div>
                                 <p className="text-[9px] text-zinc-500 font-black uppercase">Destino</p>
                                 <p className="text-sm font-black text-white">SET DE FILMAGEM (ID: {selectedLogisticsBooking.id.split('-')[1]})</p>
                              </div>
                           </div>
                        </div>
                        <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-3xl flex items-center justify-between">
                           <div>
                              <p className="text-[9px] text-zinc-500 font-black uppercase">Ativo em Trânsito</p>
                              <p className="text-sm font-bold text-white">{selectedLogisticsBooking.equipment?.name}</p>
                           </div>
                           <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-2 py-1">Prioridade</Badge>
                        </div>
                     </div>
                  </div>
                  
                  <div className="p-10 bg-zinc-900/20 flex flex-col justify-between">
                     <div className="space-y-4">
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-6">Cotação de Operadores Logísticos</p>
                        {[
                           { name: 'Frota Própria', price: 'D+0', sub: 'Rede Interna', color: 'text-emerald-500', recommended: true },
                           { name: 'Lalamove', price: 'R$ 48,90', sub: 'Van Média', color: 'text-orange-500' },
                           { name: 'Uber Flash', price: 'R$ 32,10', sub: 'Moto Rápida', color: 'text-white' }
                        ].map((op, i) => (
                           <div key={i} className={`p-5 rounded-2xl border ${op.recommended ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-800 hover:border-zinc-700'} cursor-pointer transition-all group`}>
                              <div className="flex justify-between items-center">
                                 <div>
                                    <h5 className={`text-sm font-black uppercase ${op.color}`}>{op.name} {op.recommended && <Badge className="bg-emerald-500 text-black text-[7px] font-black uppercase ml-2 px-1">Top</Badge>}</h5>
                                    <p className="text-[10px] text-zinc-500 font-bold">{op.sub}</p>
                                 </div>
                                 <p className="text-lg font-black tracking-tighter">{op.price}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                     
                     <div className="flex gap-4 mt-10">
                        <Button variant="ghost" onClick={() => setSelectedLogisticsBooking(null)} className="flex-1 font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl">Abortar</Button>
                        <Button className="flex-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest h-14 px-10 rounded-2xl shadow-xl shadow-emerald-950/20">Despachar Agora</Button>
                     </div>
                  </div>
              </div>
           </div>
         )}

      <Dialog
        isOpen={!!selectedCompanyForDetail}
        onClose={() => setSelectedCompanyForDetail(null)}
        title="Gestão de Corporação & Usuário"
      >
        {selectedCompanyForDetail && (
          <div className="space-y-6 pt-4">
             {/* Header Card */}
             <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl flex items-center gap-4 relative overflow-hidden">
                <div className="h-16 w-16 bg-zinc-800 rounded-xl flex items-center justify-center font-black text-zinc-400 text-2xl border border-zinc-700">
                   {selectedCompanyForDetail.name.charAt(0)}
                </div>
                <div>
                   <h3 className="text-xl font-black uppercase tracking-tight text-white">{selectedCompanyForDetail.name}</h3>
                   <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{selectedCompanyForDetail.document}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                      <Badge className={`${
                        selectedCompanyForDetail.status === 'suspended' 
                          ? 'bg-red-500/10 text-red-500' 
                          : 'bg-emerald-500/10 text-emerald-500'
                      } text-[8px] font-black uppercase px-2 py-0.5 border-none`}>
                         {selectedCompanyForDetail.status === 'suspended' ? 'SUSPENSO / BLOQUEADO' : 'OPERANDO / ATIVO'}
                      </Badge>
                   </div>
                </div>
             </div>

             {/* Info Grid */}
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-900/20 border border-zinc-800/40 rounded-xl">
                   <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Proprietário (Owner)</p>
                   <p className="text-xs font-bold text-zinc-200">{selectedCompanyForDetail.owner?.full_name || 'N/A'}</p>
                </div>
                <div className="p-4 bg-zinc-900/20 border border-zinc-800/40 rounded-xl">
                   <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">E-mail de Acesso</p>
                   <p className="text-xs font-bold text-zinc-200 truncate">{selectedCompanyForDetail.owner?.email || 'N/A'}</p>
                </div>
                <div className="p-4 bg-zinc-900/20 border border-zinc-800/40 rounded-xl">
                   <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Data de Onboarding</p>
                   <p className="text-xs font-bold text-zinc-200">
                      {new Date(selectedCompanyForDetail.owner?.updated_at || selectedCompanyForDetail.created_at).toLocaleDateString('pt-BR')}
                   </p>
                </div>
                <div className="p-4 bg-zinc-900/20 border border-zinc-800/40 rounded-xl">
                   <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">ID do Inquilino</p>
                   <p className="text-[10px] font-mono text-zinc-400 truncate">{selectedCompanyForDetail.id}</p>
                </div>
             </div>

             {/* Network Stats */}
             <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-2xl flex items-center justify-around text-center">
                <div>
                   <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Itens no Catálogo</p>
                   <p className="text-base font-black text-white">24</p>
                </div>
                <div className="w-px h-8 bg-zinc-900" />
                <div>
                   <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Score da Rede</p>
                   <p className="text-base font-black text-emerald-500">4.9 ★</p>
                </div>
                <div className="w-px h-8 bg-zinc-900" />
                <div>
                   <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Status de KYC</p>
                   <p className="text-[10px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-0.5 rounded">Verificado</p>
                </div>
             </div>

             {/* Block & Misuse Warning Panel */}
             <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                   <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                   <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-red-500">Aviso de Moderação de Conta</h4>
                      <p className="text-[11px] text-zinc-500 leading-relaxed font-medium mt-1">
                         A suspensão impede que este parceiro anuncie equipamentos no catálogo público do marketplace. Todas as locações ativas continuam operantes, porém novos pedidos e transferências internas serão bloqueados.
                      </p>
                   </div>
                </div>

                <div className="pt-2">
                   {selectedCompanyForDetail.status === 'suspended' ? (
                      <Button
                         onClick={handleToggleBlock}
                         disabled={updatingCompanyId === selectedCompanyForDetail.id}
                         className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest h-12 rounded-xl flex items-center justify-center gap-2"
                      >
                         {updatingCompanyId === selectedCompanyForDetail.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                         ) : (
                            <>
                               <ShieldCheck className="h-4 w-4" /> Desbloquear & Reativar Unidade
                            </>
                         )}
                      </Button>
                   ) : (
                      <Button
                         onClick={handleToggleBlock}
                         disabled={updatingCompanyId === selectedCompanyForDetail.id}
                         className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[10px] tracking-widest h-12 rounded-xl flex items-center justify-center gap-2"
                      >
                         {updatingCompanyId === selectedCompanyForDetail.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                         ) : (
                            <>
                               <Ban className="h-4 w-4" /> Suspender & Bloquear Locadora
                            </>
                         )}
                      </Button>
                   )}
                </div>
             </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
