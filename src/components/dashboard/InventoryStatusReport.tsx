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
      case 'available': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Disponível</Badge>;
      case 'unavailable': return <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-800">Aluguel Externo</Badge>;
      case 'maintenance': return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Manutenção</Badge>;
      case 'rented': return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Locado HUB</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) return <div className="p-8 text-center text-zinc-500 animate-pulse">Carregando relatórios de disponibilidade...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <History className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Logs de Disponibilidade</h2>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Histórico de movimentação fora e dentro do HUB</p>
        </div>
      </div>

      <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl overflow-hidden backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-[10px] uppercase font-black tracking-widest">Equipamento</TableHead>
              <TableHead className="text-[10px] uppercase font-black tracking-widest">Status</TableHead>
              <TableHead className="text-[10px] uppercase font-black tracking-widest text-center">Início</TableHead>
              <TableHead className="text-[10px] uppercase font-black tracking-widest text-center">Duração</TableHead>
              <TableHead className="text-[10px] uppercase font-black tracking-widest">Motivo Informado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-20 text-center text-zinc-500">
                  Nenhum log registrado ainda.
                </TableCell>
              </TableRow>
            ) : (
              logs?.map((log) => (
                <TableRow key={log.id} className="border-zinc-900 hover:bg-zinc-900/30 transition-colors">
                  <TableCell className="font-bold text-zinc-200">
                    {(log.equipment as any)?.name}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(log.status)}
                  </TableCell>
                  <TableCell className="text-center text-zinc-400 text-xs">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(log.started_at).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-[10px] opacity-50">
                        {new Date(log.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {log.ended_at ? (
                      <div className="flex items-center justify-center gap-1.5 text-emerald-500 font-bold text-xs">
                        <Clock className="h-3 w-3" />
                        {formatDistance(new Date(log.started_at), new Date(log.ended_at), { locale: ptBR })}
                      </div>
                    ) : (
                      <Badge className="bg-primary/10 text-primary border-primary/20 animate-pulse">Ativo Agora</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500 font-medium">
                    {log.reason || 'Atualização de Sistema'}
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
