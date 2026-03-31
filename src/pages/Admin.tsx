import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Admin() {
  const queryClient = useQueryClient();

  const { data: pendingCompanies } = useQuery({
    queryKey: ['pending-companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('*').eq('status', 'pending');
      return data;
    }
  });

  const approveCompany = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('companies').update({ status: 'approved' }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-companies'] })
  });

  return (
    <div className="p-10 space-y-10 bg-black min-h-screen text-white">
       <header>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase mb-4">CineHub Master</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Aprovação de Locadoras</p>
       </header>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingCompanies?.map((company) => (
             <Card key={company.id} className="bg-zinc-900 border-zinc-800 rounded-3xl p-6">
                <h3 className="text-lg font-black uppercase italic mb-2 tracking-tight">{company.name}</h3>
                <p className="text-xs text-zinc-500 font-medium mb-4">{company.document}</p>
                <Button onClick={() => approveCompany.mutate(company.id)} className="w-full bg-emerald-600 hover:bg-emerald-500 font-black h-10 uppercase text-[10px] tracking-widest rounded-xl">
                   Aprovar Agora
                </Button>
             </Card>
          ))}
          {pendingCompanies?.length === 0 && <p className="text-zinc-600 italic">Nenhuma locadora aguardando aprovação.</p>}
       </div>
    </div>
  );
}
