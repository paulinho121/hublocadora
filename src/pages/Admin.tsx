import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  Loader2, AlertTriangle, ShieldCheck,
  Building2, Package,
  Search, ArrowUpRight, Ban,
  Truck, Clock, TrendingUp, Zap, Activity,
  Globe, Users, CheckCircle2, XCircle, AlertCircle,
  Target, BarChart3, Wifi
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

import { Dialog } from '@/components/ui/dialog';

type TabType = 'overview' | 'companies' | 'bookings' | 'users' | 'network';
type DateRange = '7d' | '30d' | '90d' | 'all';

const BRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
const BRL2 = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  rental_house: 'Locadora',
  branch_manager: 'Gestor de Unidade',
};

export default function Admin() {
  const { profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [networkSearch, setNetworkSearch] = useState('');
  const [networkStatusFilter, setNetworkStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [selectedCompanyForDetail, setSelectedCompanyForDetail] = useState<any | null>(null);
  const [selectedLogisticsBooking, setSelectedLogisticsBooking] = useState<any | null>(null);
  const [updatingCompanyId, setUpdatingCompanyId] = useState<string | null>(null);

  // Presence — usuários online em tempo real
  const [onlineUsers, setOnlineUsers] = useState<Record<string, { email: string; last_sign_in_at: string | null }>>({});

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;

    const syncState = (ch: ReturnType<typeof supabase.channel>) => {
      const state = ch.presenceState<{ user_id: string; email: string; last_sign_in_at: string | null; is_admin_observer?: boolean }>();
      const map: Record<string, { email: string; last_sign_in_at: string | null }> = {};
      Object.values(state).flat().forEach((p) => {
        if (p.user_id && !p.is_admin_observer) map[p.user_id] = { email: p.email, last_sign_in_at: p.last_sign_in_at };
      });
      setOnlineUsers(map);
    };

    const channel = supabase.channel('hub:online', {
      config: { presence: { key: `admin-${profile.id}` } },
    });

    channel
      .on('presence', { event: 'sync' }, () => syncState(channel))
      .on('presence', { event: 'join' }, () => syncState(channel))
      .on('presence', { event: 'leave' }, () => syncState(channel))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // O canal precisa chamar track() para receber o presenceState completo do servidor
          await channel.track({ user_id: profile.id, email: profile.email, last_sign_in_at: null, is_admin_observer: true });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [profile?.role]);

  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*, owner:profiles!companies_owner_id_fkey(full_name, email, updated_at)');
      if (error) throw error;
      return data;
    },
    enabled: !!profile && profile.role === 'admin',
  });

  const { data: equipments } = useQuery({
    queryKey: ['admin-equipments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipments')
        .select('id, name, status, daily_rate, category, company_id');
      if (error) throw error;
      return data;
    },
    enabled: !!profile && profile.role === 'admin',
  });

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
    enabled: !!profile && profile.role === 'admin',
  });

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_all_profiles');
      if (error) throw error;
      return data as Array<{
        id: string; email: string; full_name: string | null;
        role: string; company_id: string | null;
        created_at: string; updated_at: string; company_name: string | null;
      }>;
    },
    enabled: !!profile && profile.role === 'admin',
  });

  const approveBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bookings').update({ status: 'approved' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }),
  });

  const updateCompanyStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'suspended' }) => {
      setUpdatingCompanyId(id);
      if (status === 'approved') {
        try {
          const { error: rpcError, data: rpcData } = await supabase.rpc('approve_company', { p_company_id: id });
          if (!rpcError && rpcData && !String(rpcData).startsWith('ERRO')) return;
        } catch (_) {}
        const { error } = await supabase.from('companies').update({ status: 'approved' }).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('companies').update({ status: 'suspended' }).eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-companies'] }),
    onSettled: () => setUpdatingCompanyId(null),
  });

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="animate-spin text-primary h-12 w-12" />
      </div>
    );
  }

  if (profile?.role !== 'admin') return <Navigate to="/" replace />;

  // --- DATE RANGE FILTER ---
  const cutoffDate = useMemo(() => {
    if (dateRange === 'all') return null;
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }, [dateRange]);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    if (!cutoffDate) return bookings;
    return bookings.filter(b => new Date(b.created_at) >= cutoffDate);
  }, [bookings, cutoffDate]);

  // --- KPI CALCULATIONS (filtered) ---
  const totalVolume = filteredBookings.reduce((acc, b) => acc + (b.total_amount || 0), 0);
  const hubRevenue = totalVolume * 0.15;
  const partnerRevenue = totalVolume * 0.85;
  const avgTicket = filteredBookings.length ? totalVolume / filteredBookings.length : 0;

  const pendingCompanies = companies?.filter(c => c.status === 'pending') || [];
  const activeCompanies = companies?.filter(c => c.status === 'approved' || c.status === 'active') || [];
  const utilizationRate = equipments?.length
    ? (equipments.filter(e => e.status === 'rented').length / equipments.length) * 100
    : 0;

  // --- URGENT ACTIONS ---
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const urgentPendingBookings = (bookings || []).filter(
    b => b.status === 'pending' && new Date(b.created_at) < yesterday
  );

  // --- REAL MONTHLY REVENUE (last 6 months, all bookings) ---
  const monthlyRevenue = useMemo(() => {
    if (!bookings) return [];
    const map: Record<string, { name: string; hub: number; parceiros: number; total: number }> = {};
    bookings.forEach(b => {
      const d = new Date(b.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
      if (!map[key]) map[key] = { name, hub: 0, parceiros: 0, total: 0 };
      map[key].total += b.total_amount || 0;
      map[key].hub += (b.total_amount || 0) * 0.15;
      map[key].parceiros += (b.total_amount || 0) * 0.85;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => v);
  }, [bookings]);

  // --- TOP PARTNERS BY REVENUE ---
  const topPartners = useMemo(() => {
    if (!filteredBookings.length || !companies) return [];
    const map: Record<string, { name: string; total: number; count: number }> = {};
    filteredBookings.forEach(b => {
      if (!b.company_id) return;
      if (!map[b.company_id]) {
        const c = companies.find((co: any) => co.id === b.company_id);
        map[b.company_id] = { name: c?.name || '---', total: 0, count: 0 };
      }
      map[b.company_id].total += b.total_amount || 0;
      map[b.company_id].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [filteredBookings, companies]);

  // --- CONVERSION METRICS ---
  const conversion = useMemo(() => {
    const total = filteredBookings.length || 1;
    const count = (s: string | string[]) =>
      filteredBookings.filter(b => (Array.isArray(s) ? s.includes(b.status) : b.status === s)).length;
    return {
      total: filteredBookings.length,
      approved: count(['approved', 'active', 'completed']),
      pending: count('pending'),
      rejected: count('rejected'),
      cancelled: count('cancelled'),
      approvedPct: (count(['approved', 'active', 'completed']) / total) * 100,
      rejectedPct: (count(['rejected', 'cancelled']) / total) * 100,
      pendingPct: (count('pending') / total) * 100,
    };
  }, [filteredBookings]);

  // --- EQUIPMENT STATUS ---
  const statusData = [
    { name: 'Em Operação', value: equipments?.filter(e => e.status === 'rented').length || 0, color: '#10b981' },
    { name: 'Disponível', value: equipments?.filter(e => e.status === 'available').length || 0, color: '#27272a' },
    { name: 'Manutenção', value: equipments?.filter(e => e.status === 'maintenance').length || 0, color: '#ef4444' },
  ];

  // --- COMPANIES FILTER ---
  const filteredCompanies = (companies || []).filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document?.includes(searchTerm)
  );

  // --- USERS FILTER ---
  const filteredProfiles = (profiles || []).filter(p =>
    p.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    p.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  // --- NETWORK (locadoras) FILTER ---
  const networkCompanies = useMemo(() => {
    return (companies || []).filter(c => {
      const matchesSearch =
        c.name?.toLowerCase().includes(networkSearch.toLowerCase()) ||
        c.document?.includes(networkSearch);
      const matchesStatus =
        networkStatusFilter === 'all' ||
        (networkStatusFilter === 'active' && (c.status === 'approved' || c.status === 'active')) ||
        (networkStatusFilter === 'pending' && c.status === 'pending') ||
        (networkStatusFilter === 'suspended' && c.status === 'suspended');
      return matchesSearch && matchesStatus;
    });
  }, [companies, networkSearch, networkStatusFilter]);

  const hasUrgentActions = urgentPendingBookings.length > 0 || pendingCompanies.length > 0;

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans">

      {/* TOPBAR */}
      <header className="sticky top-0 z-50 bg-black/50 backdrop-blur-2xl border-b border-zinc-900/50">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-black tracking-tight flex items-center gap-2.5">
                <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                  <Target className="h-4 w-4 text-white" />
                </div>
                GESTÃO HUB
              </h1>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-0.5 ml-9">Torre de Controle</p>
            </div>
            <div className="hidden lg:flex items-center gap-4 border-l border-zinc-800 pl-6">
              <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
              </div>
              <span className="text-[10px] text-zinc-600 font-bold uppercase">{activeCompanies.length} parceiros ativos</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Date range filter */}
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
              {(['7d', '30d', '90d', 'all'] as DateRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dateRange === r ? 'bg-primary text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                  {r === 'all' ? 'Tudo' : r}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Admin Verificado</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 lg:p-10 space-y-8">

        {/* URGENT ACTIONS PANEL */}
        {hasUrgentActions && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="text-xs font-black uppercase text-amber-500 tracking-widest">Ações Necessárias Agora</p>
                <div className="flex flex-wrap gap-4 mt-1">
                  {urgentPendingBookings.length > 0 && (
                    <span className="text-[11px] text-zinc-400 font-bold">
                      {urgentPendingBookings.length} pedido{urgentPendingBookings.length > 1 ? 's' : ''} pendente{urgentPendingBookings.length > 1 ? 's' : ''} há mais de 24h
                    </span>
                  )}
                  {pendingCompanies.length > 0 && (
                    <span className="text-[11px] text-zinc-400 font-bold">
                      {pendingCompanies.length} empresa{pendingCompanies.length > 1 ? 's' : ''} aguardando KYC
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {pendingCompanies.length > 0 && (
                <Button size="sm" onClick={() => setActiveTab('companies')} className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-[9px] tracking-widest rounded-lg h-8 px-4">
                  Ver Empresas
                </Button>
              )}
              {urgentPendingBookings.length > 0 && (
                <Button size="sm" onClick={() => setActiveTab('bookings')} className="bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase text-[9px] tracking-widest rounded-lg h-8 px-4">
                  Ver Pedidos
                </Button>
              )}
            </div>
          </div>
        )}

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'GMV do Período', value: BRL(totalVolume), sub: `${filteredBookings.length} transações`, icon: TrendingUp, color: 'text-emerald-500' },
            { label: 'Receita HUB (15%)', value: BRL(hubRevenue), sub: 'Taxa da plataforma', icon: Target, color: 'text-primary', highlight: true },
            { label: 'Repasse Parceiros', value: BRL(partnerRevenue), sub: '85% do volume', icon: Building2, color: 'text-zinc-400' },
            { label: 'Ticket Médio', value: BRL2(avgTicket), sub: 'Por locação', icon: BarChart3, color: 'text-blue-400' },
          ].map((kpi, i) => (
            <div key={i} className={`rounded-2xl p-6 border flex flex-col justify-between min-h-[120px] ${kpi.highlight ? 'bg-primary/5 border-primary/20' : 'bg-zinc-950 border-zinc-900'}`}>
              <div className="flex justify-between items-start mb-3">
                <p className={`text-[9px] font-black uppercase tracking-widest ${kpi.highlight ? 'text-primary' : 'text-zinc-500'}`}>{kpi.label}</p>
                <kpi.icon className={`h-4 w-4 ${kpi.color} opacity-60`} />
              </div>
              <div>
                <h3 className={`text-2xl font-black tracking-tighter ${kpi.highlight ? 'text-primary' : 'text-white'}`}>{kpi.value}</h3>
                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1">{kpi.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* SECONDARY KPI ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Empresas Ativas', value: activeCompanies.length, icon: Building2, color: 'text-emerald-500' },
            { label: 'Frota Conectada', value: equipments?.length || 0, icon: Package, color: 'text-zinc-300' },
            { label: 'Utilização', value: `${utilizationRate.toFixed(1)}%`, icon: Activity, color: 'text-blue-400' },
            { label: 'Usuários Cadastrados', value: profiles?.length || 0, icon: Users, color: 'text-purple-400' },
          ].map((s, i) => (
            <div key={i} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-2.5 bg-zinc-900 rounded-xl">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">{s.label}</p>
                <h4 className="text-xl font-black tracking-tight">{s.value}</h4>
              </div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="flex gap-8 border-b border-zinc-900/50 pb-0">
          {([
            { id: 'overview', label: 'Dashboard', icon: BarChart3 },
            { id: 'network', label: 'Minha Rede', icon: Globe },
            { id: 'companies', label: 'Ecossistema', icon: Building2, badge: pendingCompanies.length },
            { id: 'bookings', label: 'Fluxo de Caixa', icon: Truck, badge: urgentPendingBookings.length },
            { id: 'users', label: 'Usuários', icon: Users },
          ] as { id: TabType; label: string; icon: any; badge?: number }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 flex items-center gap-2 font-black uppercase text-[10px] tracking-[0.15em] transition-all relative whitespace-nowrap ${activeTab === tab.id ? 'text-primary' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {!!tab.badge && (
                <span className="bg-primary text-white text-[8px] px-1.5 py-0.5 rounded-full font-black ml-1">{tab.badge}</span>
              )}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          ))}
        </div>

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-12 gap-6 animate-in fade-in duration-500">

            {/* REAL MONTHLY REVENUE CHART */}
            <Card className="col-span-12 lg:col-span-8 bg-zinc-950 border-zinc-900 rounded-[32px] overflow-hidden">
              <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black tracking-tighter uppercase">Receita Real por Mês</CardTitle>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">HUB (15%) vs Parceiros (85%) — últimos 6 meses</p>
                </div>
                {monthlyRevenue.length === 0 && (
                  <Badge className="bg-zinc-800 text-zinc-500 border-none text-[9px]">Sem dados</Badge>
                )}
              </CardHeader>
              <CardContent className="p-8 h-[340px]">
                {monthlyRevenue.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-zinc-700">
                    <div className="text-center">
                      <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-xs font-black uppercase tracking-widest">Nenhuma transação registrada ainda</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyRevenue}>
                      <defs>
                        <linearGradient id="colorHub" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorParceiros" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                      <XAxis dataKey="name" stroke="#52525b" fontSize={10} fontWeight="black" axisLine={false} tickLine={false} tick={{ dy: 8 }} />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ stroke: '#e11d48', strokeWidth: 1, strokeDasharray: '4 4' }}
                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                        formatter={(value: number, name: string) => [BRL(value), name === 'hub' ? 'HUB (15%)' : 'Parceiros (85%)']}
                        labelStyle={{ color: '#71717a', fontWeight: 900, fontSize: 10 }}
                      />
                      <Area type="monotone" dataKey="parceiros" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorParceiros)" />
                      <Area type="monotone" dataKey="hub" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorHub)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* CONVERSION METRICS */}
            <Card className="col-span-12 lg:col-span-4 bg-zinc-950 border-zinc-900 rounded-[32px] overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xs font-black text-zinc-500 uppercase tracking-widest">Funil de Conversão</CardTitle>
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{conversion.total} pedidos no período</p>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-5">
                {[
                  { label: 'Aprovados / Ativos', value: conversion.approved, pct: conversion.approvedPct, color: 'bg-emerald-500' },
                  { label: 'Pendentes', value: conversion.pending, pct: conversion.pendingPct, color: 'bg-amber-500' },
                  { label: 'Recusados / Cancelados', value: conversion.rejected + conversion.cancelled, pct: conversion.rejectedPct, color: 'bg-red-500' },
                ].map((m, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{m.label}</span>
                      <span className="text-sm font-black text-white">{m.value} <span className="text-[10px] text-zinc-600">({m.pct.toFixed(0)}%)</span></span>
                    </div>
                    <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${m.color} transition-all duration-700`} style={{ width: `${Math.max(m.pct, 2)}%` }} />
                    </div>
                  </div>
                ))}

                {/* Equipment status pie */}
                <div className="pt-4 border-t border-zinc-900">
                  <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-4">Status da Frota</p>
                  <div className="h-[130px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} innerRadius={40} outerRadius={56} paddingAngle={6} dataKey="value">
                          {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: 10 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    {statusData.map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-[9px] font-black uppercase text-zinc-600">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* TOP PARTNERS */}
            <Card className="col-span-12 bg-zinc-950 border-zinc-900 rounded-[32px] overflow-hidden">
              <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" /> Top Parceiros por Receita Gerada
                </CardTitle>
                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{dateRange === 'all' ? 'Todos os tempos' : `Últimos ${dateRange}`}</span>
              </CardHeader>
              <CardContent className="p-8">
                {topPartners.length === 0 ? (
                  <div className="py-10 text-center text-zinc-700">
                    <p className="text-xs font-black uppercase tracking-widest">Sem dados no período selecionado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topPartners.map((p, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-zinc-600 w-4">{i + 1}</span>
                        <div className="h-8 w-8 bg-zinc-900 rounded-xl flex items-center justify-center font-black text-zinc-400 text-xs border border-zinc-800">
                          {p.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-black uppercase tracking-tight text-zinc-200">{p.name}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] text-zinc-500 font-bold">{p.count} pedido{p.count > 1 ? 's' : ''}</span>
                              <span className="text-sm font-black text-white">{BRL(p.total)}</span>
                            </div>
                          </div>
                          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-700"
                              style={{ width: `${(p.total / (topPartners[0]?.total || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== MINHA REDE TAB ===== */}
        {activeTab === 'network' && (
          <div className="space-y-6 animate-in fade-in duration-500">

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total de Parceiros', value: (companies || []).length, color: 'text-zinc-300' },
                { label: 'Operando', value: activeCompanies.length, color: 'text-emerald-400' },
                { label: 'Aguard. KYC', value: pendingCompanies.length, color: 'text-amber-400' },
                { label: 'Suspensos', value: (companies || []).filter(c => c.status === 'suspended').length, color: 'text-red-400' },
              ].map((s, i) => (
                <div key={i} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex items-center gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">{s.label}</p>
                    <h4 className={`text-2xl font-black tracking-tight ${s.color}`}>{s.value}</h4>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full max-w-lg">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                <input
                  type="text"
                  placeholder="Buscar locadora ou CNPJ..."
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl py-3.5 pl-12 pr-5 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-zinc-700"
                  value={networkSearch}
                  onChange={e => setNetworkSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'active', 'pending', 'suspended'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setNetworkStatusFilter(f)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      networkStatusFilter === f
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : f === 'pending' ? 'Pendentes' : 'Suspensas'}
                  </button>
                ))}
              </div>
            </div>

            {/* Network table */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-900/40">
                  <tr>
                    {['Locadora', 'Status', 'Itens', 'Pedidos', 'Volume Gerado', 'Repasse HUB (15%)', 'Cadastro', 'Ações'].map((h, i) => (
                      <th key={i} className="p-5 text-[9px] font-black uppercase text-zinc-500 tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {companiesLoading ? (
                    <tr><td colSpan={8} className="p-16 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></td></tr>
                  ) : networkCompanies.length === 0 ? (
                    <tr><td colSpan={8} className="p-16 text-center text-zinc-600 font-black uppercase tracking-widest text-xs">Nenhuma locadora encontrada.</td></tr>
                  ) : networkCompanies.map((company: any) => {
                    const companyBookings = (bookings || []).filter(b => b.company_id === company.id);
                    const companyVolume = companyBookings.reduce((s, b) => s + (b.total_amount || 0), 0);
                    const companyItems = (equipments || []).filter((e: any) => e.company_id === company.id).length;
                    return (
                      <tr key={company.id} className="hover:bg-white/[0.015] transition-colors group">
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center font-black text-zinc-400 text-sm shrink-0">
                              {company.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-black text-zinc-200 group-hover:text-primary transition-colors">{company.name}</p>
                              <p className="text-[9px] text-zinc-600 font-bold">{company.document}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <Badge className={`text-[8px] font-black uppercase border-none px-2 ${
                            company.status === 'approved' || company.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                            company.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                            company.status === 'suspended' ? 'bg-red-500/10 text-red-500' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {company.status === 'approved' ? 'Operando' : company.status === 'pending' ? 'KYC Pendente' : company.status === 'suspended' ? 'Suspenso' : company.status}
                          </Badge>
                        </td>
                        <td className="p-5 text-sm font-black text-zinc-300">{companyItems}</td>
                        <td className="p-5 text-sm font-black text-zinc-300">{companyBookings.length}</td>
                        <td className="p-5 text-sm font-black text-zinc-200">{BRL(companyVolume)}</td>
                        <td className="p-5 text-sm font-black text-emerald-400">{BRL(companyVolume * 0.15)}</td>
                        <td className="p-5 text-[10px] text-zinc-500 font-medium whitespace-nowrap">
                          {new Date(company.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            {company.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => updateCompanyStatus.mutate({ id: company.id, status: 'approved' })}
                                disabled={updatingCompanyId === company.id}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[9px] tracking-widest h-7 px-3 rounded-lg"
                              >
                                {updatingCompanyId === company.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Aprovar'}
                              </Button>
                            )}
                            {(company.status === 'approved' || company.status === 'active') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateCompanyStatus.mutate({ id: company.id, status: 'suspended' })}
                                disabled={updatingCompanyId === company.id}
                                className="h-7 w-7 p-0 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-500"
                                title="Suspender"
                              >
                                {updatingCompanyId === company.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                              </Button>
                            )}
                            {company.status === 'suspended' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateCompanyStatus.mutate({ id: company.id, status: 'approved' })}
                                disabled={updatingCompanyId === company.id}
                                className="h-7 w-7 p-0 rounded-lg hover:bg-emerald-500/10 text-zinc-500 hover:text-emerald-500"
                                title="Reativar"
                              >
                                {updatingCompanyId === company.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedCompanyForDetail(company)}
                              className="h-7 w-7 p-0 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white"
                              title="Ver detalhes"
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== COMPANIES TAB ===== */}
        {activeTab === 'companies' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full max-w-lg">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                <input
                  type="text"
                  placeholder="Buscar empresa ou CNPJ..."
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl py-3.5 pl-12 pr-5 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-zinc-700"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                <span className="bg-zinc-900 px-3 py-1.5 rounded-lg">{activeCompanies.length} ativas</span>
                {pendingCompanies.length > 0 && (
                  <span className="bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-lg">{pendingCompanies.length} aguardando KYC</span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {companiesLoading ? (
                <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
              ) : filteredCompanies.length === 0 ? (
                <div className="py-32 text-center">
                  <XCircle className="h-10 w-10 text-zinc-800 mx-auto mb-3" />
                  <p className="text-zinc-600 font-black uppercase tracking-widest text-xs">Nenhuma empresa encontrada.</p>
                </div>
              ) : filteredCompanies.map((company: any) => (
                <div key={company.id} className="group bg-zinc-950 border border-zinc-900 hover:border-zinc-700 rounded-2xl p-5 transition-all flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 bg-zinc-900 rounded-xl flex items-center justify-center font-black text-zinc-500 text-lg border border-zinc-800 shrink-0">
                      {company.name?.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-black uppercase tracking-tight group-hover:text-primary transition-colors">{company.name}</h3>
                        <Badge className={`text-[8px] font-black uppercase border-none px-2 ${
                          company.status === 'approved' || company.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                          company.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {company.status === 'approved' ? 'Operando' : company.status === 'pending' ? 'Pendente KYC' : company.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                        <p className="text-[10px] text-zinc-500 font-bold">{company.document}</p>
                        <p className="text-[10px] text-zinc-600 font-bold">Owner: <span className="text-zinc-400">{company.owner?.full_name}</span></p>
                        <p className="text-[10px] text-zinc-600 font-bold flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> {new Date(company.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="hidden lg:flex items-center gap-6 px-6 border-x border-zinc-900">
                    <div className="text-center">
                      <p className="text-[9px] text-zinc-600 font-black uppercase mb-0.5">Itens</p>
                      <p className="text-sm font-black">{equipments?.filter((e: any) => e.company_id === company.id).length || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-zinc-600 font-black uppercase mb-0.5">Pedidos</p>
                      <p className="text-sm font-black">{filteredBookings.filter(b => b.company_id === company.id).length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-zinc-600 font-black uppercase mb-0.5">Volume</p>
                      <p className="text-sm font-black text-emerald-400">
                        {BRL(filteredBookings.filter(b => b.company_id === company.id).reduce((s, b) => s + (b.total_amount || 0), 0))}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    {company.status === 'pending' && (
                      <Button
                        onClick={() => updateCompanyStatus.mutate({ id: company.id, status: 'approved' })}
                        disabled={updatingCompanyId === company.id}
                        className="flex-1 md:flex-none h-10 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[9px] tracking-widest rounded-xl"
                      >
                        {updatingCompanyId === company.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Aprovar KYC'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setSelectedCompanyForDetail(company)}
                      className="flex-1 md:flex-none h-10 px-4 border-zinc-800 text-zinc-400 hover:bg-zinc-900 rounded-xl"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== BOOKINGS / FINANCIAL FLOW TAB ===== */}
        {activeTab === 'bookings' && (
          <div className="space-y-6 animate-in fade-in duration-500">

            {/* Financial summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Volume Total', value: BRL2(totalVolume), highlight: false },
                { label: 'Repasse Parceiros (85%)', value: BRL2(partnerRevenue), highlight: false },
                { label: 'Receita HUB (15%)', value: BRL2(hubRevenue), highlight: true },
                { label: 'Ticket Médio', value: BRL2(avgTicket), highlight: false },
              ].map((c, i) => (
                <div key={i} className={`rounded-2xl p-6 border ${c.highlight ? 'bg-primary/5 border-primary/20' : 'bg-zinc-950 border-zinc-900'}`}>
                  <p className={`text-[9px] font-black uppercase tracking-widest mb-3 ${c.highlight ? 'text-primary' : 'text-zinc-500'}`}>{c.label}</p>
                  <h4 className={`text-xl font-black tracking-tight ${c.highlight ? 'text-primary' : 'text-white'}`}>{c.value}</h4>
                </div>
              ))}
            </div>

            {/* Bookings table */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-zinc-900 flex justify-between items-center">
                <h2 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Fluxo Operacional
                </h2>
                <span className="text-[10px] text-zinc-500 font-bold uppercase">{filteredBookings.length} registros</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-900/40">
                    <tr>
                      {['Transação', 'Status', 'Parceiro', 'Período', 'Repasse (85%)', 'HUB (15%)', 'Total', ''].map((h, i) => (
                        <th key={i} className="p-5 text-[9px] font-black uppercase text-zinc-500 tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {bookingsLoading ? (
                      <tr><td colSpan={8} className="p-16 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></td></tr>
                    ) : filteredBookings.length === 0 ? (
                      <tr><td colSpan={8} className="p-16 text-center text-zinc-600 font-black uppercase tracking-widest text-xs">Sem operações no período.</td></tr>
                    ) : filteredBookings.map(booking => (
                      <tr key={booking.id} className="hover:bg-white/[0.015] transition-colors">
                        <td className="p-5">
                          <p className="text-xs font-black tracking-tighter">REQ-{booking.id.split('-')[0].toUpperCase()}</p>
                          <p className="text-[9px] text-zinc-500">{new Date(booking.created_at).toLocaleDateString('pt-BR')}</p>
                        </td>
                        <td className="p-5">
                          <Badge className={`text-[8px] font-black uppercase border-none px-2 ${
                            booking.status === 'approved' || booking.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                            booking.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                            booking.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>{booking.status}</Badge>
                        </td>
                        <td className="p-5">
                          <p className="text-xs font-bold text-zinc-300">{booking.company?.name || '---'}</p>
                          <p className="text-[9px] text-zinc-500 truncate max-w-[120px]">{booking.equipment?.name}</p>
                        </td>
                        <td className="p-5 text-[10px] text-zinc-500 font-bold whitespace-nowrap">
                          {new Date(booking.start_date).toLocaleDateString('pt-BR')} → {new Date(booking.end_date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-5 text-right text-zinc-400 font-bold text-xs">{BRL2(booking.total_amount * 0.85)}</td>
                        <td className="p-5 text-right text-emerald-400 font-black text-xs">{BRL2(booking.total_amount * 0.15)}</td>
                        <td className="p-5 text-right text-white font-black text-sm">{BRL2(booking.total_amount)}</td>
                        <td className="p-5 text-right">
                          {booking.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => approveBooking.mutate(booking.id)}
                              disabled={approveBooking.isPending}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[9px] tracking-widest h-7 px-3 rounded-lg"
                            >
                              {approveBooking.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Aprovar'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== USERS TAB ===== */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-500">

            {/* Online agora */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <Wifi className="h-4 w-4 text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Online Agora</span>
                </div>
                <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                  {Object.keys(onlineUsers).length}
                </span>
              </div>

              {Object.keys(onlineUsers).length === 0 ? (
                <p className="text-[10px] text-zinc-600 font-medium">Nenhum usuário online no momento.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(onlineUsers).map(([uid, info]) => {
                    const prof = profiles?.find((p: any) => p.id === uid);
                    const name = prof?.full_name || info.email?.split('@')[0] || uid.slice(0, 8);
                    const initial = name.charAt(0).toUpperCase();
                    const lastLogin = info.last_sign_in_at
                      ? new Date(info.last_sign_in_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : '—';
                    return (
                      <div key={uid} className="flex items-center gap-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2">
                        <div className="relative">
                          <div className="h-7 w-7 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center font-black text-emerald-400 text-[10px]">
                            {initial}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-emerald-500 rounded-full border border-zinc-950" />
                        </div>
                        <div className="leading-none">
                          <p className="text-[10px] font-black text-white">{name}</p>
                          <p className="text-[9px] text-zinc-500 mt-0.5">Login: {lastLogin}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Barra de busca e filtros */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full max-w-lg">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou e-mail..."
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl py-3.5 pl-12 pr-5 text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-zinc-700"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest">
                {['admin', 'rental_house', 'branch_manager'].map(role => (
                  <span key={role} className="bg-zinc-900 text-zinc-500 px-3 py-1.5 rounded-lg">
                    {ROLE_LABELS[role]}: {profiles?.filter((p: any) => p.role === role).length || 0}
                  </span>
                ))}
              </div>
            </div>

            {/* Tabela de usuários */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-900/40">
                  <tr>
                    {['Usuário', 'E-mail', 'Perfil', 'Empresa', 'Cadastro', 'Último Login'].map((h, i) => (
                      <th key={i} className="p-5 text-[9px] font-black uppercase text-zinc-500 tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {profilesLoading ? (
                    <tr><td colSpan={6} className="p-16 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></td></tr>
                  ) : filteredProfiles.length === 0 ? (
                    <tr><td colSpan={6} className="p-16 text-center text-zinc-600 font-black uppercase tracking-widest text-xs">Nenhum usuário encontrado.</td></tr>
                  ) : filteredProfiles.map((p: any) => {
                    const isOnline = !!onlineUsers[p.id];
                    const presenceInfo = onlineUsers[p.id];
                    const lastLogin = presenceInfo?.last_sign_in_at
                      ? new Date(presenceInfo.last_sign_in_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : p.updated_at
                        ? new Date(p.updated_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : '—';

                    return (
                      <tr key={p.id} className="hover:bg-white/[0.015] transition-colors">
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="h-8 w-8 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center font-black text-zinc-400 text-xs">
                                {p.full_name?.charAt(0) || '?'}
                              </div>
                              {isOnline && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-zinc-950" />
                              )}
                            </div>
                            <p className="text-xs font-black text-zinc-200">{p.full_name || 'Sem nome'}</p>
                          </div>
                        </td>
                        <td className="p-5 text-[10px] text-zinc-400 font-medium">{p.email}</td>
                        <td className="p-5">
                          <Badge className={`text-[8px] font-black uppercase border-none px-2 ${
                            p.role === 'admin' ? 'bg-primary/10 text-primary' :
                            p.role === 'rental_house' ? 'bg-blue-500/10 text-blue-400' :
                            p.role === 'branch_manager' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>{ROLE_LABELS[p.role] || p.role}</Badge>
                        </td>
                        <td className="p-5 text-[10px] text-zinc-400 font-medium">{p.company?.name || '—'}</td>
                        <td className="p-5 text-[10px] text-zinc-500 font-medium">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="p-5">
                          {isOnline ? (
                            <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Online agora
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-500 font-medium">{lastLogin}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* COMPANY DETAIL MODAL */}
      <Dialog isOpen={!!selectedCompanyForDetail} onClose={() => setSelectedCompanyForDetail(null)} title="Gestão de Parceiro">
        {selectedCompanyForDetail && (
          <div className="space-y-5 pt-2">
            <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center gap-4">
              <div className="h-14 w-14 bg-zinc-800 rounded-xl flex items-center justify-center font-black text-zinc-400 text-2xl border border-zinc-700">
                {selectedCompanyForDetail.name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">{selectedCompanyForDetail.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-zinc-500 font-bold">{selectedCompanyForDetail.document}</span>
                  <Badge className={`text-[8px] font-black uppercase border-none px-2 ${
                    selectedCompanyForDetail.status === 'suspended' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {selectedCompanyForDetail.status === 'suspended' ? 'Suspenso' : 'Ativo'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Proprietário', value: selectedCompanyForDetail.owner?.full_name || 'N/A' },
                { label: 'E-mail', value: selectedCompanyForDetail.owner?.email || 'N/A' },
                { label: 'Onboarding', value: new Date(selectedCompanyForDetail.created_at).toLocaleDateString('pt-BR') },
                { label: 'ID', value: selectedCompanyForDetail.id.slice(0, 8) + '...' },
              ].map((item, i) => (
                <div key={i} className="p-4 bg-zinc-900/30 border border-zinc-800/40 rounded-xl">
                  <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">{item.label}</p>
                  <p className="text-xs font-bold text-zinc-200 truncate">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-900/30 border border-zinc-800/40 rounded-xl">
              <div className="text-center">
                <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Itens</p>
                <p className="font-black">{equipments?.filter((e: any) => e.company_id === selectedCompanyForDetail.id).length || 0}</p>
              </div>
              <div className="text-center border-x border-zinc-800">
                <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Pedidos</p>
                <p className="font-black">{(bookings || []).filter(b => b.company_id === selectedCompanyForDetail.id).length}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Volume</p>
                <p className="font-black text-emerald-400 text-sm">
                  {BRL((bookings || []).filter(b => b.company_id === selectedCompanyForDetail.id).reduce((s, b) => s + (b.total_amount || 0), 0))}
                </p>
              </div>
            </div>

            <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  A suspensão impede o parceiro de anunciar equipamentos e receber novos pedidos. Operações ativas continuam até o término.
                </p>
              </div>
              {selectedCompanyForDetail.status === 'suspended' ? (
                <Button
                  onClick={async () => {
                    await updateCompanyStatus.mutateAsync({ id: selectedCompanyForDetail.id, status: 'approved' });
                    setSelectedCompanyForDetail((p: any) => ({ ...p, status: 'approved' }));
                  }}
                  disabled={updatingCompanyId === selectedCompanyForDetail.id}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[9px] tracking-widest h-11 rounded-xl flex items-center justify-center gap-2"
                >
                  {updatingCompanyId === selectedCompanyForDetail.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5" /> Reativar Parceiro</>}
                </Button>
              ) : (
                <Button
                  onClick={async () => {
                    await updateCompanyStatus.mutateAsync({ id: selectedCompanyForDetail.id, status: 'suspended' });
                    setSelectedCompanyForDetail((p: any) => ({ ...p, status: 'suspended' }));
                  }}
                  disabled={updatingCompanyId === selectedCompanyForDetail.id}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[9px] tracking-widest h-11 rounded-xl flex items-center justify-center gap-2"
                >
                  {updatingCompanyId === selectedCompanyForDetail.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Ban className="h-3.5 w-3.5" /> Suspender Parceiro</>}
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>

    </div>
  );
}
