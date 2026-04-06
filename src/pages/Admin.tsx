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
  CheckCircle2, Search, ArrowUpRight, Ban
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type TabType = 'overview' | 'companies' | 'inventory' | 'bookings';

export default function Admin() {
  const { profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchTerm, setSearchTerm] = useState('');

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
  const hubRevenue = totalVolume * 0.15; // 15% taxa da plataforma
  const partnerRevenue = totalVolume * 0.85; 

  const filteredCompanies = companies?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.document.includes(searchTerm)
  ) || [];

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
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                          <p className="text-xs text-emerald-500/70 font-bold uppercase tracking-widest">Gross Merchandise Volume</p>
                       </CardContent>
                    </Card>
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
                                    <div className="flex items-center gap-3 mb-1">
                                       <h3 className="text-xl font-black uppercase tracking-tight">{company.name}</h3>
                                       {company.status === 'approved' && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] uppercase tracking-widest font-black shrink-0">Operando</Badge>}
                                       {company.status === 'pending' && <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[9px] uppercase tracking-widest font-black shrink-0">Aguardando Aval</Badge>}
                                       {company.status === 'rejected' && <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[9px] uppercase tracking-widest font-black shrink-0">Censurada</Badge>}
                                    </div>
                                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-2">{company.document}</p>
                                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest flex gap-2">
                                       <span>Endereço: {company.address_city}-{company.address_state}</span>
                                       <span>|</span>
                                       <span>Proprietário: {company.owner?.full_name || company.owner?.email || 'Admin'}</span>
                                    </p>
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
                               <Button variant="outline" className="w-full text-[10px] uppercase tracking-widest font-black h-10 border-zinc-800 hover:bg-zinc-900 rounded-xl">
                                  Visualizar Contrato
                               </Button>
                               <Button variant="outline" className="w-full text-[10px] uppercase tracking-widest font-black h-10 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl">
                                  Interceder Conflito
                               </Button>
                           </div>

                        </Card>
                     ))
                  )}
               </div>
            </div>
         )}
    </div>
  );
}
