import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  History, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  EyeOff, 
  Eye,
  Calendar,
  Clock,
  User as UserIcon,
  Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AuditTab() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['network-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('network_logs')
        .select(`
          *,
          equipment:equipments(name, category),
          origin:companies!origin_company_id(name),
          destination:companies!destination_company_id(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }
  });

  const getActionBadge = (type: string) => {
    switch (type) {
      case 'stock_out': return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 uppercase text-[9px] font-black tracking-widest"><ArrowUpRight className="w-3 h-3 mr-1" /> Saída HUB</Badge>;
      case 'stock_in': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 uppercase text-[9px] font-black tracking-widest"><ArrowDownLeft className="w-3 h-3 mr-1" /> Retorno HUB</Badge>;
      case 'visibility_hidden': return <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 uppercase text-[9px] font-black tracking-widest"><EyeOff className="w-3 h-3 mr-1" /> Ocultado (Loc. Externa)</Badge>;
      case 'visibility_restored': return <Badge className="bg-primary/10 text-primary border-primary/20 uppercase text-[9px] font-black tracking-widest"><Eye className="w-3 h-3 mr-1" /> Retornou ao HUB</Badge>;
      default: return <Badge variant="outline" className="uppercase text-[9px] font-black tracking-widest">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">Auditoria de Rede</h2>
          <p className="text-zinc-500 font-medium italic">Rastreabilidade total de estoque, disponibilidade e locações externas.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Filtrar item ou empresa..." 
              className="pl-10 bg-zinc-950 border-zinc-900 w-full md:w-64 h-12 rounded-xl focus:ring-primary/20 transition-all"
            />
          </div>
          <button className="h-12 w-12 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-center hover:bg-zinc-900 transition-colors">
            <Filter className="w-5 h-5 text-zinc-500" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center bg-zinc-950 rounded-3xl border border-zinc-900 border-dashed">
            <Clock className="w-8 h-8 text-zinc-800 animate-spin" />
          </div>
        ) : logs?.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center bg-zinc-950 rounded-3xl border border-zinc-900 border-dashed text-zinc-600 gap-4">
             <History className="w-12 h-12 opacity-20" />
             <p className="font-bold uppercase tracking-widest text-[10px]">Nenhuma atividade registrada ainda</p>
          </div>
        ) : (
          logs?.map((log: any) => (
            <Card key={log.id} className="bg-zinc-950 border-zinc-900 hover:border-primary/30 transition-all group overflow-hidden rounded-2xl shadow-xl">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">
                  {/* DATA E HORA */}
                  <div className="md:w-32 flex flex-col shrink-0">
                    <span className="text-xs font-black text-zinc-200 uppercase tracking-tighter">
                      {format(new Date(log.created_at), 'dd MMM yyyy', { locale: ptBR })}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1">
                       <Clock className="w-3 h-3" /> {format(new Date(log.created_at), 'HH:mm')}
                    </span>
                  </div>

                  {/* AÇÃO E EQUIPAMENTO */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      {getActionBadge(log.action_type)}
                      <h4 className="font-black text-white uppercase tracking-tighter flex items-center gap-2">
                        <Package className="w-4 h-4 text-zinc-600" /> {log.equipment?.name || 'Item Excluído'}
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-500 font-medium flex items-center gap-2">
                      <History className="w-3 h-3" /> {log.description}
                    </p>
                  </div>

                  {/* METADADOS (TEMPO / QUANTIDADE) */}
                  {log.metadata && (
                    <div className="md:w-64 bg-zinc-900/50 p-4 rounded-xl border border-zinc-900 flex flex-col gap-2">
                       {log.metadata.unavailable_duration && (
                         <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Tempo Fora</span>
                            <span className="text-xs font-bold text-emerald-500">{log.metadata.unavailable_duration}</span>
                         </div>
                       )}
                       {log.metadata.quantity && (
                         <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Qtd. Movimentada</span>
                            <span className="text-xs font-bold text-primary">{log.metadata.quantity} un.</span>
                         </div>
                       )}
                       {log.metadata.operator && (
                         <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Operador</span>
                            <span className="text-[10px] font-bold text-zinc-300">ID: {log.metadata.operator.slice(0, 8)}</span>
                         </div>
                       )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
