import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Printer, 
  Building2, 
  TrendingUp, 
  Coins, 
  Package, 
  MapPin, 
  Loader2 
} from 'lucide-react';
import { Branch } from '@/types/database';

interface NetworkReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  tenantId: string;
}

export function NetworkReportModal({ isOpen, onClose, branches, tenantId }: NetworkReportModalProps) {
  // Fetch all bookings for this company to group by branch
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['network-report-bookings', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('company_id', tenantId);
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!tenantId
  });

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Compile data per branch
  const compiledBranches = useMemo(() => {
    if (!branches) return [];
    
    return branches.map(br => {
      // Find bookings for this branch
      const branchBookings = bookings?.filter(b => b.origin_branch_id === br.id) || [];
      const bookingsCount = branchBookings.length;
      
      // Faturamento (Approved, Active, Completed bookings value)
      const revenue = branchBookings
        .filter(b => ['approved', 'active', 'completed'].includes(b.status))
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

      // Pending Value (Pending bookings value)
      const pendingValue = branchBookings
        .filter(b => b.status === 'pending')
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

      return {
        ...br,
        bookingsCount,
        revenue,
        pendingValue,
        itemsCount: (br as any).items_count || 0
      };
    });
  }, [branches, bookings]);

  // Overall metrics across the network
  const networkMetrics = useMemo(() => {
    const totalUnits = branches.length;
    const totalItems = compiledBranches.reduce((sum, br) => sum + br.itemsCount, 0);
    const totalBookings = compiledBranches.reduce((sum, br) => sum + br.bookingsCount, 0);
    const totalRevenue = compiledBranches.reduce((sum, br) => sum + br.revenue, 0);

    return {
      totalUnits,
      totalItems,
      totalBookings,
      totalRevenue
    };
  }, [branches, compiledBranches]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Relatório Consolidado de Rede"
    >
      <div className="space-y-8 py-2 print-container">
        {/* Print specific style overrides */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            /* Force light theme for standard paper printing */
            body, html, [role="dialog"] {
              background: white !important;
              color: #09090b !important;
              width: 100% !important;
              max-width: 100% !important;
              position: static !important;
              overflow: visible !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            /* Hide modal backdrops, overlays, sidebars, close/print buttons */
            .fixed, [role="dialog"] > div:first-child, button, .no-print, header, aside {
              display: none !important;
            }
            /* Expand dialog content box flat on page */
            [role="dialog"] {
              transform: none !important;
              box-shadow: none !important;
              border: none !important;
            }
            .print-network-title {
              display: block !important;
              margin-bottom: 25px !important;
              border-bottom: 2px solid #09090b !important;
              padding-bottom: 15px !important;
            }
            .print-network-title h3 {
              font-size: 22px !important;
              color: #09090b !important;
              text-transform: uppercase !important;
              font-weight: 900 !important;
            }
            .print-network-card-grid {
              display: grid !important;
              grid-template-columns: repeat(4, 1fr) !important;
              gap: 15px !important;
              margin-bottom: 25px !important;
            }
            .print-network-card {
              border: 1px solid #e4e4e7 !important;
              border-radius: 8px !important;
              padding: 12px !important;
              background: #f4f4f5 !important;
              color: #09090b !important;
              box-shadow: none !important;
            }
            .print-network-table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            .print-network-table th {
              background-color: #f4f4f5 !important;
              color: #27272a !important;
              border-bottom: 2px solid #e4e4e7 !important;
              font-size: 9px !important;
              text-align: left !important;
              padding: 10px 12px !important;
            }
            .print-network-table td {
              border-bottom: 1px solid #e4e4e7 !important;
              color: #09090b !important;
              font-size: 10px !important;
              padding: 10px 12px !important;
            }
            .print-network-badge {
              border: 1px solid #71717a !important;
              color: #09090b !important;
              background: transparent !important;
              padding: 2px 6px !important;
              font-size: 8px !important;
            }
          }
        `}} />

        {/* Print-Only Title Header */}
        <div className="hidden print:block print-network-title">
          <h3>Relatório Consolidado de Rede</h3>
          <p className="text-zinc-500 text-xs mt-1">Desempenho operacional, faturamento e frota distribuída.</p>
        </div>

        {/* Top Info Alert & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl no-print">
          <p className="text-zinc-500 font-medium text-[11px] leading-relaxed">
            Consulte as métricas financeiras, quantitativo de itens do estoque e pedidos de todas as filiais integradas na sua rede de locadoras.
          </p>
          <Button 
            onClick={handlePrint}
            disabled={isLoading}
            className="shrink-0 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-wider text-[10px] h-10 px-5 rounded-xl flex items-center gap-2"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir Relatório
          </Button>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Consolidando dados da rede...
            </p>
          </div>
        ) : (
          <>
            {/* Consolidated Overview Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print-network-card-grid">
              <Card className="bg-zinc-950/40 border border-zinc-900 print-network-card">
                <CardContent className="p-4">
                  <p className="text-[8px] uppercase font-black text-zinc-500 tracking-[0.2em] mb-1">Unidades</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-zinc-100">{networkMetrics.totalUnits}</span>
                    <span className="text-[9px] text-zinc-600 font-bold uppercase">locadoras</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-950/40 border border-zinc-900 print-network-card">
                <CardContent className="p-4">
                  <p className="text-[8px] uppercase font-black text-zinc-500 tracking-[0.2em] mb-1">Estoque da Rede</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-zinc-100">{networkMetrics.totalItems}</span>
                    <span className="text-[9px] text-zinc-600 font-bold uppercase">itens</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-950/40 border border-zinc-900 print-network-card">
                <CardContent className="p-4">
                  <p className="text-[8px] uppercase font-black text-zinc-500 tracking-[0.2em] mb-1">Total de Pedidos</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-zinc-100">{networkMetrics.totalBookings}</span>
                    <span className="text-[9px] text-zinc-600 font-bold uppercase">vezes</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-950/40 border border-zinc-900 print-network-card">
                <CardContent className="p-4">
                  <p className="text-[8px] uppercase font-black text-zinc-500 tracking-[0.2em] mb-1">Fat. Consolidado</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-emerald-500">{formatBRL(networkMetrics.totalRevenue)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Network Details Table */}
            <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl overflow-hidden overflow-x-auto">
              <Table className="print-network-table min-w-[700px]">
                <TableHeader className="bg-zinc-900/40">
                  <TableRow className="border-zinc-900">
                    <TableHead className="text-[9px] uppercase font-black tracking-widest text-zinc-500 py-4 px-6">Unidade</TableHead>
                    <TableHead className="text-[9px] uppercase font-black tracking-widest text-zinc-500 py-4">Localização</TableHead>
                    <TableHead className="text-[9px] uppercase font-black tracking-widest text-zinc-500 py-4 text-center">Itens</TableHead>
                    <TableHead className="text-[9px] uppercase font-black tracking-widest text-zinc-500 py-4 text-center">Pedidos</TableHead>
                    <TableHead className="text-[9px] uppercase font-black tracking-widest text-zinc-500 py-4 text-right">Faturamento</TableHead>
                    <TableHead className="text-[9px] uppercase font-black tracking-widest text-zinc-500 py-4 text-right">Faturamento Pendente</TableHead>
                    <TableHead className="text-[9px] uppercase font-black tracking-widest text-zinc-500 py-4 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compiledBranches.map(branch => (
                    <TableRow key={branch.id} className="border-zinc-900/50 hover:bg-white/[0.01]">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-zinc-500 shrink-0 no-print" />
                          <div>
                            <span className="text-zinc-100 font-bold text-xs uppercase tracking-tight">{branch.name}</span>
                            <span className="block text-[8px] text-zinc-500 uppercase no-print mt-0.5">{branch.manager_email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1 text-zinc-400">
                          <MapPin className="h-3 w-3 shrink-0 no-print" />
                          <span className="text-[10px] font-medium">{branch.city}, {branch.state}</span>
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs font-black text-zinc-200">
                          <Package className="h-3.5 w-3.5 text-primary shrink-0 no-print" />
                          {branch.itemsCount}
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs font-black text-zinc-200">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-500/60 shrink-0 no-print" />
                          {branch.bookingsCount}x
                        </div>
                      </td>
                      <td className="py-4 text-right text-xs font-black text-emerald-500">
                        {formatBRL(branch.revenue)}
                      </td>
                      <td className="py-4 text-right text-xs font-black text-amber-500">
                        {formatBRL(branch.pendingValue)}
                      </td>
                      <td className="py-4 text-right">
                        <div className="no-print">
                          <Badge className={
                            branch.status === 'active' 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 uppercase text-[8px] font-black tracking-widest px-2 py-0.5" 
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20 uppercase text-[8px] font-black tracking-widest px-2 py-0.5"
                          }>
                            {branch.status === 'active' ? 'Ativo' : 'Pendente'}
                          </Badge>
                        </div>
                        <span className="hidden print:inline-block print-network-badge">
                          {branch.status === 'active' ? 'ATIVO' : 'PENDENTE'}
                        </span>
                      </td>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <div className="pt-4 border-t border-zinc-900 flex justify-end no-print">
          <Button 
            onClick={onClose} 
            className="bg-zinc-100 hover:bg-white text-black font-black uppercase tracking-widest px-8 h-12 rounded-xl"
          >
            Fechar Relatório
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
