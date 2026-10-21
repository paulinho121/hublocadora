import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Camera, Check, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase';
import { useProject } from '@/contexts/ProjectContext';
import { Equipment } from '@/types/database';

/** Ids dos equipamentos que a locadora sugere junto com este (guardados em features.suggested_ids) */
export function getSuggestedIds(equipment?: Pick<Equipment, 'features'> | null): string[] {
  const ids = (equipment?.features as any)?.suggested_ids;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
}

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

/** "Combine com": equipamentos sugeridos pela locadora, com botão de adicionar ao pedido */
export function SuggestedEquipments({ equipment }: { equipment: Equipment }) {
  const navigate = useNavigate();
  const { addItem, isInCart, openDrawer } = useProject();
  const ids = getSuggestedIds(equipment).filter(id => id !== equipment.id);

  const { data: suggested = [] } = useQuery({
    queryKey: ['suggested-equipments', ids],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipments')
        .select('*')
        .in('id', ids)
        .neq('status', 'unavailable');
      if (error) throw error;
      // Mantém a ordem escolhida pela locadora
      return ids.map(id => (data as Equipment[]).find(e => e.id === id)).filter(Boolean) as Equipment[];
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
  });

  if (suggested.length === 0) return null;

  const handleAdd = (item: Equipment) => {
    addItem(item);
    toast.success(`${item.name} adicionado ao pedido!`, {
      action: { label: 'Ver pedido', onClick: openDrawer },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-bold text-white">Combine com</h3>
        <p className="text-sm text-zinc-500">Sugestões da locadora para usar junto.</p>
      </div>
      <div className="flex flex-col gap-2">
        {suggested.map(item => {
          const inCart = isInCart(item.id);
          return (
            <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/40">
              <button
                onClick={() => navigate(`/equipment/${item.id}`)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div className="w-14 h-14 rounded-xl bg-zinc-900 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.images?.[0]
                    ? <img src={item.images[0]} alt={item.name} className="w-full h-full object-contain p-1" />
                    : <Camera className="w-5 h-5 text-zinc-500" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white line-clamp-2 leading-snug">{item.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{brl(item.daily_rate)} /dia</p>
                </div>
              </button>
              <button
                onClick={() => !inCart && handleAdd(item)}
                disabled={inCart}
                aria-label={inCart ? `${item.name} já está no pedido` : `Adicionar ${item.name} ao pedido`}
                className={`h-10 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                  inCart
                    ? 'bg-primary/10 text-primary border border-primary/25'
                    : 'bg-zinc-900 text-zinc-200 border border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                {inCart ? <><Check className="w-3.5 h-3.5" /> No pedido</> : <><Plus className="w-3.5 h-3.5" /> Adicionar</>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
