import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function Admin() {
  const { profile, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: pendingCompanies, isLoading, error } = useQuery({
    queryKey: ['pending-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('status', 'pending');
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile && profile.role === 'admin'
  });

  const approveCompany = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('companies').update({ status: 'approved' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-companies'] })
  });

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="animate-spin text-primary h-12 w-12" />
      </div>
    );
  }

  // Se não for admin, redireciona o espertinho para o marketplace
  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-10 space-y-10 bg-black min-h-screen text-white animate-in fade-in duration-500">
       <header className="flex justify-between items-center border-b border-zinc-900 pb-10">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter uppercase mb-2">CineHub Master</h1>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Portal de Aprovação da Rede Global</p>
          </div>
          <div className="flex items-center gap-3 px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-500 uppercase italic tracking-widest">Master Admin Auth Ativa</span>
          </div>
       </header>

       {error && (
         <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center gap-6 text-red-500">
            <AlertTriangle className="h-8 w-8" />
            <div>
               <p className="text-sm font-black uppercase italic italic tracking-tighter">Erro de Comunicação com DB</p>
               <p className="text-xs font-bold text-red-500/60 uppercase tracking-widest">{error.message}</p>
            </div>
         </div>
       )}

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pendingCompanies?.map((company) => (
             <Card key={company.id} className="bg-zinc-950 border-zinc-900 rounded-[32px] p-8 hover:border-zinc-800 transition-all shadow-3xl">
                <div className="h-14 w-14 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 font-black text-primary text-xl border border-zinc-800">
                   {company.name.charAt(0)}
                </div>
                <h3 className="text-lg font-black uppercase italic mb-1 tracking-tight">{company.name}</h3>
                <p className="text-xs text-zinc-500 font-medium mb-6 uppercase tracking-widest">{company.document}</p>
                
                <div className="flex gap-3">
                   <Button 
                     onClick={() => approveCompany.mutate(company.id)} 
                     className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black h-12 uppercase text-[10px] tracking-widest rounded-2xl shadow-xl transition-all"
                   >
                      Aprovar Agora
                   </Button>
                </div>
             </Card>
          ))}
          
          {pendingCompanies?.length === 0 && !isLoading && (
            <div className="col-span-full py-32 text-center border-2 border-dashed border-zinc-900 rounded-[40px]">
               <p className="text-zinc-600 text-xl font-black italic uppercase tracking-tighter">Nenhuma locadora aguardando no HUB</p>
            </div>
          )}
       </div>
    </div>
  );
}
