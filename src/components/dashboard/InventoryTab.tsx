import { useState, useMemo } from 'react';
import { useEquipments } from '@/hooks/useEquipments';
import { InventoryCard } from './InventoryCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Search, 
  Package, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Select } from '@/components/ui/select';

import { useTenant } from '@/contexts/TenantContext';

interface InventoryTabProps {
  tenantId: string | undefined;
  onAdd: () => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
}

export function InventoryTab({ tenantId, onAdd, onEdit, onDelete }: InventoryTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { isBranchManager, branchId } = useTenant();

  const { data: equipments, isLoading } = useEquipments({
    companyId: tenantId || undefined,
    branchId: isBranchManager ? branchId : undefined,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    searchQuery: searchQuery || undefined
  });

  const uniqueCategories = useMemo(() => {
    if (!equipments) return [];
    return Array.from(new Set(equipments.map(e => e.category)));
  }, [equipments]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-4 bg-zinc-950/20 p-4 md:p-6 rounded-2xl border border-zinc-900/50 backdrop-blur-sm">
        <div className="flex-1 w-full space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-black uppercase tracking-tighter">Seu Inventário</h2>
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
             <div className="md:col-span-8 relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Buscar pelo nome do equipamento..." 
                  className="pl-10 h-11 bg-zinc-900/50 border-zinc-800/80 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
             
             <div className="md:col-span-4">
                <Select 
                  value={categoryFilter} 
                  onChange={(e: any) => setCategoryFilter(e.target.value)}
                  className="h-11 bg-zinc-900/50 border-zinc-800/80 rounded-xl focus:ring-primary/20 appearance-none"
                >
                  <option value="all">Todas Categorias</option>
                  {uniqueCategories.map(cat => (
                     <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Select>
             </div>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
           <Button 
            onClick={onAdd} 
            className="h-11 px-6 font-bold flex-1 md:flex-none uppercase text-xs tracking-widest gap-2 bg-primary hover:bg-primary/90 rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
           >
             <Plus className="h-4 w-4" /> Novo Item
           </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : equipments?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-950/20 border border-dashed border-zinc-800 rounded-3xl text-center space-y-6 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center shadow-inner">
             <Package className="h-10 w-10 text-zinc-700" />
          </div>
          <div className="space-y-2 max-w-sm">
            <h3 className="text-xl font-bold">Nenhum item encontrado</h3>
            <p className="text-zinc-500 text-sm">
              Não encontramos nenhum equipamento com estes filtros ou seu inventário ainda está vazio.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {equipments?.map((item) => (
            <InventoryCard 
              key={item.id} 
              item={item} 
              onEdit={onEdit} 
              onDelete={onDelete} 
            />
          ))}
        </div>
      )}
      
      {/* Stats footer */}
      {!isLoading && equipments && equipments.length > 0 && (
        <div className="pt-8 flex flex-wrap gap-6 border-t border-zinc-900 mt-12 justify-center md:justify-start">
           <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                 <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                 <p className="text-[11px] uppercase font-black text-zinc-500 tracking-widest leading-none mb-1">Disponíveis</p>
                 <p className="font-bold text-sm tracking-tighter">{equipments.filter(e => e.status === 'available').length} itens</p>
              </div>
           </div>
           
           <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                 <Package className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                 <p className="text-[11px] uppercase font-black text-zinc-500 tracking-widest leading-none mb-1">Locados</p>
                 <p className="font-bold text-sm tracking-tighter">{equipments.filter(e => e.status === 'rented').length} itens</p>
              </div>
           </div>

           <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                 <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                 <p className="text-[11px] uppercase font-black text-zinc-500 tracking-widest leading-none mb-1">Manutenção</p>
                 <p className="font-bold text-sm tracking-tighter">{equipments.filter(e => e.status === 'maintenance').length} itens</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
