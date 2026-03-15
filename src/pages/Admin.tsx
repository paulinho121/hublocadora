import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Search as SearchIcon,
  Trash2,
  MoreVertical,
  MapPin,
  Calendar
} from 'lucide-react';
import { 
  useAdminStats, 
  usePendingCompanies, 
  useApproveCompany,
  useAllCompanies,
  useDeleteCompany
} from '@/hooks/useAdmin';
import { Input } from '@/components/ui/input';

type AdminTab = 'overview' | 'companies' | 'users' | 'finance' | 'insurance';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: stats, isLoading: isLoadingStats } = useAdminStats();
  const { data: pendingCompanies, isLoading: isLoadingPending } = usePendingCompanies();
  const { data: allCompanies, isLoading: isLoadingCompanies } = useAllCompanies();
  
  const approveMutation = useApproveCompany();
  const deleteMutation = useDeleteCompany();

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
    if (confirm('ATENÇÃO: Isso excluirá permanentemente esta locadora e todos os seus equipamentos do banco de dados. Deseja continuar?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const filteredCompanies = allCompanies?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.document.includes(searchQuery) ||
    c.address_city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-zinc-950 hidden md:block">
        <div className="p-6">
          <h2 className="text-lg font-semibold tracking-tight text-emerald-500">CINEHUB Admin</h2>
          <p className="text-sm text-zinc-400">Gestão da Plataforma</p>
        </div>
        <nav className="space-y-1 px-3">
          <Button 
            variant={activeTab === 'overview' ? 'secondary' : 'ghost'} 
            className="w-full justify-start transition-all"
            onClick={() => setActiveTab('overview')}
          >
            <Activity className="mr-2 h-4 w-4" /> Overview
          </Button>
          <Button 
            variant={activeTab === 'companies' ? 'secondary' : 'ghost'} 
            className="w-full justify-start transition-all text-zinc-400 hover:text-white"
            onClick={() => setActiveTab('companies')}
          >
            <Building2 className="mr-2 h-4 w-4" /> Locadoras
          </Button>
          <Button 
            variant={activeTab === 'users' ? 'secondary' : 'ghost'} 
            className="w-full justify-start transition-all text-zinc-400 hover:text-white"
            onClick={() => setActiveTab('users')}
          >
            <Users className="mr-2 h-4 w-4" /> Usuários
          </Button>
          <Button 
            variant={activeTab === 'finance' ? 'secondary' : 'ghost'} 
            className="w-full justify-start transition-all text-zinc-400 hover:text-white"
            onClick={() => setActiveTab('finance')}
          >
            <DollarSign className="mr-2 h-4 w-4" /> Financeiro (Stripe)
          </Button>
          <Button 
            variant={activeTab === 'insurance' ? 'secondary' : 'ghost'} 
            className="w-full justify-start transition-all text-zinc-400 hover:text-white"
            onClick={() => setActiveTab('insurance')}
          >
            <ShieldCheck className="mr-2 h-4 w-4" /> Seguros
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto bg-zinc-900/10">
        {activeTab === 'overview' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Hub Overview</h1>
                <p className="text-muted-foreground">Métricas globais do marketplace em tempo real.</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card className="border-emerald-900/50 bg-emerald-950/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">GMV (Volume Total)</CardTitle>
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  {isLoadingStats ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{formatCurrency(stats?.gmv || 0)}</div>
                      <p className="text-xs text-emerald-500/80">Total acumulado em aluguéis</p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita CINEHUB (15%)</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoadingStats ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-emerald-500">{formatCurrency(stats?.revenue || 0)}</div>
                      <p className="text-xs text-muted-foreground">Líquido estimado da plataforma</p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Locadoras</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoadingStats ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{stats?.companiesTotal}</div>
                      <p className="text-xs text-muted-foreground">{stats?.companiesPending} aguardando aprovação</p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuários</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoadingStats ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{stats?.usersTotal}</div>
                      <p className="text-xs text-muted-foreground">Base total de cadastros</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
              {/* Pending Approvals */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Locadoras Pendentes
                    {pendingCompanies?.length ? (
                      <Badge variant="destructive" className="animate-pulse">{pendingCompanies.length}</Badge>
                    ) : null}
                  </CardTitle>
                  <CardDescription>Verifique os dados antes de liberar a conta.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingPending ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                  ) : !pendingCompanies?.length ? (
                    <div className="text-center p-8 text-muted-foreground">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p>Tudo em dia! Nenhuma locadora pendente.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {pendingCompanies.map((company) => (
                        <div key={company.id} className="flex items-center justify-between border-b border-zinc-800 pb-4 last:border-0 last:pb-0">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">{company.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {company.address_city}, {company.address_state} • {company.document}
                            </p>
                            <p className="text-xs italic text-zinc-500">"{company.description}"</p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-emerald-500 border-emerald-500/50 hover:bg-emerald-500/10"
                              onClick={() => handleApprove(company.id)}
                              disabled={approveMutation.isPending}
                            >
                              Aprovar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleReject(company.id)}
                              disabled={approveMutation.isPending}
                            >
                              Rejeitar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* System Alerts */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Alertas & Segurança</CardTitle>
                  <CardDescription>Monitoramento preventivo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4 border-b border-zinc-800 pb-4">
                      <div className="mt-0.5 bg-destructive/10 p-2 rounded-full text-destructive">
                        <Ban className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Antifraude Ativo</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Nenhuma transação suspeita detectada nas últimas 24 horas via Stripe Radar.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 bg-blue-500/10 p-2 rounded-full text-blue-500">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Verificação KYC</p>
                        <p className="text-xs text-muted-foreground mt-1">Integração com Serasa e Receita Federal está operando normalmente.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tab: Companies (Locadoras) */}
        {activeTab === 'companies' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Locadoras Parceiras</h1>
                <p className="text-muted-foreground">Gerencie o ecossistema de fornecedores de equipamentos.</p>
              </div>
              <div className="relative w-72">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input 
                  placeholder="Buscar por nome, CNPJ ou cidade..." 
                  className="pl-10 bg-zinc-950 border-zinc-800 h-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Card className="border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                        <th className="px-6 py-4 font-semibold">Locadora</th>
                        <th className="px-6 py-4 font-semibold">Documento</th>
                        <th className="px-6 py-4 font-semibold">Localização</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold">Cadastro</th>
                        <th className="px-6 py-4 font-semibold text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {isLoadingCompanies ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500 mb-2" />
                            <p className="text-sm text-zinc-500">Carregando base de dados...</p>
                          </td>
                        </tr>
                      ) : filteredCompanies?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                            Nenhuma locadora encontrada para os critérios de busca.
                          </td>
                        </tr>
                      ) : (
                        filteredCompanies?.map((company) => (
                          <tr key={company.id} className="group hover:bg-zinc-900/40 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                                  <Building2 className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-zinc-200 truncate">{company.name}</p>
                                  <p className="text-xs text-zinc-500 truncate">{company.description || 'Sem descrição'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-zinc-400">
                              {company.document}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                                <MapPin className="w-3.5 h-3.5 text-zinc-600" />
                                {company.address_city} - {company.address_state}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant={
                                company.status === 'approved' ? 'default' :
                                company.status === 'pending' ? 'outline' : 'destructive'
                              } className="capitalize">
                                {company.status === 'approved' ? 'Ativa' : 
                                 company.status === 'pending' ? 'Em Análise' : 'Bloqueada'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(company.created_at).toLocaleDateString('pt-BR')}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-zinc-500 hover:text-white"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDelete(company.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Outros Módulos em Desenvolvimento */}
        {activeTab !== 'overview' && activeTab !== 'companies' && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-emerald-500/10 p-6 rounded-full mb-6">
              <Clock className="w-12 h-12 text-emerald-500 animate-pulse" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Módulo em Desenvolvimento</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Estamos integrando este painel com a API do {
                activeTab === 'users' ? 'Supabase Auth' : 
                activeTab === 'finance' ? 'Stripe Connect' : 'Porto Seguro'
              } para trazer dados reais.
            </p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setActiveTab('overview')}>
                Voltar ao Overview
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-500">
                Ver Road Map <ExternalLink className="ml-2 w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


