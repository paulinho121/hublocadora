import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Printer, 
  Clock, 
  TrendingUp, 
  FileText, 
  Search, 
  Filter, 
  Package, 
  ExternalLink, 
  Loader2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReportsTabProps {
  tenantId: string | undefined;
}

export function ReportsTab({ tenantId }: ReportsTabProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // 1. Fetch equipments
  const { data: equipments, isLoading: loadingEquipments } = useQuery({
    queryKey: ['reports-equipments', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipments')
        .select('*')
        .eq('company_id', tenantId);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId
  });

  // 2. Fetch bookings to count active/past bookings
  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ['reports-bookings', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('company_id', tenantId);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId
  });

  // 3. Fetch status logs to calculate external rentals
  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ['reports-logs', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_status_logs')
        .select('*')
        .eq('company_id', tenantId);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId
  });

  const formatDuration = (ms: number) => {
    if (ms <= 0) return '0 dias';
    const totalHours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    if (days === 0) return `${hours}h`;
    return `${days}d ${hours}h`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-2.5 py-1 font-black uppercase tracking-widest text-[9px]">Disponível</Badge>;
      case 'unavailable': return <Badge className="bg-zinc-500/10 text-zinc-400 border-white/5 px-2.5 py-1 font-black uppercase tracking-widest text-[9px]">Aluguel Externo</Badge>;
      case 'maintenance': return <Badge className="bg-destructive/10 text-destructive border-destructive/20 px-2.5 py-1 font-black uppercase tracking-widest text-[9px]">Manutenção</Badge>;
      case 'rented': return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-2.5 py-1 font-black uppercase tracking-widest text-[9px]">Locado HUB</Badge>;
      default: return <Badge variant="outline" className="font-black uppercase tracking-widest text-[9px]">{status}</Badge>;
    }
  };

  // Compile data for each equipment
  const aggregatedData = useMemo(() => {
    if (!equipments) return [];

    return equipments.map(eq => {
      // Find all bookings for this equipment
      const eqBookings = bookings?.filter(b => b.equipment_id === eq.id) || [];
      const hubCount = eqBookings.length;

      // Filter status logs for 'unavailable' (which represents external rentals)
      const eqLogs = logs?.filter(l => l.equipment_id === eq.id && l.status === 'unavailable') || [];
      const externalCount = eqLogs.length;

      // Sum external rental duration
      let totalExternalMs = 0;
      eqLogs.forEach(log => {
        const start = new Date(log.started_at).getTime();
        const end = log.ended_at ? new Date(log.ended_at).getTime() : Date.now();
        if (end >= start) {
          totalExternalMs += (end - start);
        }
      });

      return {
        ...eq,
        hubCount,
        externalCount,
        totalExternalMs
      };
    });
  }, [equipments, bookings, logs]);

  // Apply filters
  const filteredData = useMemo(() => {
    return aggregatedData.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                            (item.category && item.category.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [aggregatedData, search, statusFilter]);

  // Overview metrics
  const metrics = useMemo(() => {
    const totalEquips = aggregatedData.length;
    const totalHub = bookings?.length || 0;
    const totalExtCount = logs?.filter(l => l.status === 'unavailable').length || 0;
    const totalExtDurationMs = aggregatedData.reduce((acc, curr) => acc + curr.totalExternalMs, 0);

    return {
      totalEquips,
      totalHub,
      totalExtCount,
      totalExtDurationMs
    };
  }, [aggregatedData, bookings, logs]);

  const handlePrint = () => {
    window.print();
  };

  const isLoading = loadingEquipments || loadingBookings || loadingLogs;

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Compilando Relatórios de Frota...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 print-container">
      {/* Dynamic inline styles for premium printing */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Force light theme for standard paper printing */
          body, html, main, .print-container {
            background: white !important;
            color: #09090b !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          /* Hide non-printable elements */
          aside, header, nav, .no-print, button, .filters-section, footer {
            display: none !important;
          }
          /* Card layout overrides for print */
          .print-card-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 15px !important;
            margin-bottom: 25px !important;
          }
          .print-card {
            border: 1px solid #e4e4e7 !important;
            border-radius: 8px !important;
            padding: 12px !important;
            background: #f4f4f5 !important;
            color: #09090b !important;
            box-shadow: none !important;
          }
          .print-card-title {
            color: #71717a !important;
            font-size: 8px !important;
            text-transform: uppercase !important;
          }
          .print-card-value {
            color: #09090b !important;
            font-size: 16px !important;
            font-weight: 900 !important;
          }
          /* Table overrides for print */
          .print-table-wrapper {
            border: 1px solid #e4e4e7 !important;
            border-radius: 8px !important;
            background: white !important;
            overflow: visible !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .print-table th {
            background-color: #f4f4f5 !important;
            color: #27272a !important;
            border-bottom: 2px solid #e4e4e7 !important;
            font-size: 8px !important;
            text-align: left !important;
            padding: 10px 12px !important;
          }
          .print-table td {
            border-bottom: 1px solid #e4e4e7 !important;
            color: #09090b !important;
            font-size: 10px !important;
            padding: 10px 12px !important;
          }
          .print-title-area {
            margin-bottom: 30px !important;
            border-bottom: 2px solid #09090b !important;
            padding-bottom: 15px !important;
          }
          .print-title-area h2 {
            font-size: 24px !important;
            color: #09090b !important;
            text-transform: uppercase !important;
            font-weight: 900 !important;
          }
          .print-title-area p {
            font-size: 10px !important;
            color: #71717a !important;
          }
          /* Force badges to display clearly in black-and-white */
          .badge-print {
            border: 1px solid #71717a !important;
            color: #09090b !important;
            background: transparent !important;
            padding: 2px 6px !important;
            font-size: 8px !important;
          }
        }
      `}} />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6 print-title-area">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-[18px] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(225,29,72,0.15)] no-print">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-zinc-100">Relatórios de Frota</h2>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.25em] mt-1">
              Desempenho operacional e auditoria de locações
            </p>
          </div>
        </div>

        <Button 
          onClick={handlePrint}
          className="no-print self-start sm:self-center bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl h-11 px-5 flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-all"
        >
          <Printer className="w-4 h-4 text-primary" /> Imprimir Relatório
        </Button>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print-card-grid">
        <Card className="clay-card print-card">
          <CardContent className="p-6">
            <p className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em] mb-2 print-card-title">Total da Frota</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tighter text-zinc-100 print-card-value">{metrics.totalEquips}</span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider print-card-title">itens</span>
            </div>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-1 no-print">Cadastrados no catálogo</p>
          </CardContent>
        </Card>

        <Card className="clay-card print-card">
          <CardContent className="p-6">
            <p className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em] mb-2 print-card-title">Locações HUB</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tighter text-zinc-100 print-card-value">{metrics.totalHub}</span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider print-card-title">vezes</span>
            </div>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-1 no-print">Através da plataforma</p>
          </CardContent>
        </Card>

        <Card className="clay-card print-card">
          <CardContent className="p-6">
            <p className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em] mb-2 print-card-title">Locações Externas</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tighter text-zinc-100 print-card-value">{metrics.totalExtCount}</span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider print-card-title">vezes</span>
            </div>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-1 no-print">Fora do ecossistema HUB</p>
          </CardContent>
        </Card>

        <Card className="clay-card print-card">
          <CardContent className="p-6">
            <p className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em] mb-2 print-card-title">Tempo Total Externo</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tighter text-zinc-100 print-card-value">{formatDuration(metrics.totalExtDurationMs)}</span>
            </div>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-1 no-print">Acumulado fora do HUB</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-950/20 border border-white/5 p-4 rounded-2xl no-print filters-section">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do item ou categoria..." 
            className="pl-10 h-11 bg-zinc-950/50 border-zinc-900 focus:border-zinc-800 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-zinc-600 shrink-0 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 bg-zinc-950 border border-zinc-900 rounded-xl px-4 text-xs font-black uppercase text-zinc-400 focus:border-zinc-800 w-full sm:w-48 cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            <option value="available">Disponível</option>
            <option value="unavailable">Aluguel Externo</option>
            <option value="rented">Locado HUB</option>
            <option value="maintenance">Manutenção</option>
          </select>
        </div>
      </div>

      {/* Main stats table */}
      <div className="bg-zinc-950/40 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-3xl shadow-2xl print-table-wrapper">
        <div className="overflow-x-auto">
          <Table className="print-table">
            <TableHeader className="bg-black/40">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-[9px] uppercase font-black tracking-[0.2em] py-6 px-8 text-zinc-500 whitespace-nowrap">Equipamento</TableHead>
                <TableHead className="text-[9px] uppercase font-black tracking-[0.2em] py-6 text-zinc-500 whitespace-nowrap">Status Atual</TableHead>
                <TableHead className="text-[9px] uppercase font-black tracking-[0.2em] py-6 text-center text-zinc-500 whitespace-nowrap">Locações HUB</TableHead>
                <TableHead className="text-[9px] uppercase font-black tracking-[0.2em] py-6 text-center text-zinc-500 whitespace-nowrap">Locações Externas</TableHead>
                <TableHead className="text-[9px] uppercase font-black tracking-[0.2em] py-6 text-center text-zinc-500 whitespace-nowrap">Tempo Externo</TableHead>
                <TableHead className="text-[9px] uppercase font-black tracking-[0.2em] py-6 px-8 text-zinc-500 whitespace-nowrap text-right no-print">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Package className="h-10 w-10 text-zinc-800" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700">Nenhum equipamento correspondente encontrado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id} className="border-white/5 hover:bg-white/[0.01] transition-all duration-300">
                    <TableCell className="py-5 px-8 font-black uppercase tracking-tight text-white whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-zinc-100">{item.name}</span>
                        <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">{item.category}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-5">
                      <div className="no-print">
                        {getStatusBadge(item.status)}
                      </div>
                      <span className="hidden print:inline-block badge-print">
                        {item.status === 'available' ? 'Disponível' : 
                         item.status === 'unavailable' ? 'Aluguel Externo' : 
                         item.status === 'rented' ? 'Locado HUB' : 
                         item.status === 'maintenance' ? 'Manutenção' : item.status}
                      </span>
                    </TableCell>
                    <TableCell className="py-5 text-center font-black text-sm text-zinc-300 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500/60 no-print" />
                        {item.hubCount}x
                      </div>
                    </TableCell>
                    <TableCell className="py-5 text-center font-black text-sm text-zinc-300 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-500/60 no-print" />
                        {item.externalCount}x
                      </div>
                    </TableCell>
                    <TableCell className="py-5 text-center font-black text-xs text-zinc-300 whitespace-nowrap">
                      {formatDuration(item.totalExternalMs)}
                    </TableCell>
                    <TableCell className="py-5 px-8 text-right no-print">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/equipment/${item.id}`)}
                        className="h-8 border border-zinc-900 hover:border-zinc-800 text-[9px] uppercase font-black tracking-widest gap-1.5 hover:text-white rounded-lg"
                      >
                        <ExternalLink className="w-3 h-3 text-primary" /> Ficha Técnica
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
