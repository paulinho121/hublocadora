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
import { Clock, History, Calendar } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InventoryStatusReportProps {
  companyId: string | undefined;
}

export function InventoryStatusReport({ companyId }: InventoryStatusReportProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['inventory-status-logs', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_status_logs')
        .select(`
          *,
          equipment:equipments(name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 font-black uppercase tracking-widest text-[9px]">Disponível</Badge>;
      case 'unavailable': return <Badge className="bg-zinc-500/10 text-zinc-400 border-white/5 px-3 py-1 font-black uppercase tracking-widest text-[9px]">Aluguel Externo</Badge>;
      case 'maintenance': return <Badge className="bg-destructive/10 text-destructive border-destructive/20 px-3 py-1 font-black uppercase tracking-widest text-[9px]">Manutenção</Badge>;
      case 'rented': return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-1 font-black uppercase tracking-widest text-[9px]">Locado HUB</Badge>;
      default: return <Badge variant="outline" className="font-black uppercase tracking-widest text-[9px]">{status}</Badge>;
    }
  };

  if (isLoading) return (
    <div className="py-20 flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Compilando Dados de Disponibilidade...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      <div className="flex items-center gap-4 border-b border-white/5 pb-4">
        <div className="h-10 w-10 rounded-[14px] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]">
          <History className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">Histórico de Disponibilidade</h2>
          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em]">Auditoria de Fluxo de Equipamentos</p>
        </div>
      </div>

      <div className="bg-zinc-950/40 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-3xl shadow-2xl">
        <Table>
          <TableHeader className="bg-black/40">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-[9px] uppercase font-black tracking-[0.2em] py-6 px-8 text-zinc-500">Equipamento</TableHead>
              <TableHead className="text-[9px] uppercase font-black tracking-[0.2em] py-6 text-zinc-500">Status Operacional</TableHead>
              <TableHead className="text-[9px] uppercase font-black tracking-[0.2em] py-6 text-center text-zinc-500">Cronologia</TableHead>
              <TableHead className="text-[9px] uppercase font-black tracking-[0.2em] py-6 text-center text-zinc-500">Tempo de Atividade</TableHead>
              <TableHead className="text-[9px] uppercase font-black tracking-[0.2em] py-6 px-8 text-zinc-500">Observações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-32 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Clock className="h-10 w-10 text-zinc-800" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700">Nenhum registro de log detectado.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs?.map((log) => (
                <TableRow key={log.id} className="border-white/5 hover:bg-white/[0.02] transition-all duration-500 group">
                  <TableCell className="py-6 px-8 font-black uppercase tracking-tight text-white group-hover:translate-x-1 transition-transform duration-500">
                    {(log.equipment as any)?.name}
                  </TableCell>
                  <TableCell className="py-6">
                    {getStatusBadge(log.status)}
                  </TableCell>
                  <TableCell className="py-6 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-300 uppercase tracking-widest">
                        <Calendar className="h-3 w-3 text-zinc-600" />
                        {new Date(log.started_at).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                        {new Date(log.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-6 text-center">
                    {log.ended_at ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest">
                        <Clock className="h-3 w-3" />
                        {formatDistance(new Date(log.started_at), new Date(log.ended_at), { locale: ptBR })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Badge className="bg-primary text-black font-black uppercase tracking-widest text-[8px] animate-pulse rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] px-3">Ativo</Badge>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-6 px-8 text-[10px] text-zinc-500 font-medium tracking-wide">
                    {log.reason || 'Manutenção de Fluxo Padrão'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
