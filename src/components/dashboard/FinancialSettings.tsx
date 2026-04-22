import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Wallet, 
  Receipt, 
  Building2, 
  Save, 
  Loader2, 
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const financialSchema = z.object({
  pix_key: z.string().min(1, 'Chave PIX é obrigatória'),
  fiscal_data: z.object({
    ie: z.string().optional(),
    im: z.string().optional(),
    tax_regime: z.string().min(1, 'Selecione o regime tributário')
  }),
  bank_info: z.object({
    bank: z.string().min(1, 'Banco é obrigatório'),
    branch: z.string().min(1, 'Agência é obrigatória'),
    account: z.string().min(1, 'Conta é obrigatória')
  })
});

type FinancialFormValues = z.infer<typeof financialSchema>;

export function FinancialSettings({ companyId, initialConfig }: { companyId: string, initialConfig: any }) {
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const { register, handleSubmit, formState: { errors } } = useForm<FinancialFormValues>({
    resolver: zodResolver(financialSchema),
    defaultValues: initialConfig || {
      pix_key: '',
      fiscal_data: { ie: '', im: '', tax_regime: 'simples_nacional' },
      bank_info: { bank: '', branch: '', account: '' }
    }
  });

  const onSubmit = async (values: FinancialFormValues) => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('companies')
        .update({ financial_config: values })
        .eq('id', companyId);

      if (error) throw error;
      setStatus({ type: 'success', message: 'Configurações salvas com sucesso!' });
      setTimeout(() => setStatus(null), 5000);
    } catch (error: any) {
      console.error('Error saving financial config:', error);
      setStatus({ type: 'error', message: 'Erro ao salvar: ' + (error.message || 'Erro desconhecido') });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* REPASSE & PAGAMENTOS */}
        <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
          <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/40">
            <CardTitle className="text-xl font-black uppercase flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              Repasse e Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Chave PIX Principal</Label>
              <Input 
                {...register('pix_key')}
                placeholder="CNPJ, E-mail ou Celular" 
                className="h-14 bg-zinc-900 border-zinc-800 rounded-xl focus:ring-primary/20 text-lg font-mono" 
              />
              {errors.pix_key && <p className="text-xs text-red-500 font-bold">{errors.pix_key.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-900/50">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Banco</Label>
                <Input {...register('bank_info.bank')} placeholder="Ex: Nubank" className="h-11 bg-zinc-900 border-zinc-800 rounded-xl text-xs" />
              </div>
              <div className="space-y-2">
                 <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Agência</Label>
                 <Input {...register('bank_info.branch')} placeholder="0001" className="h-11 bg-zinc-900 border-zinc-800 rounded-xl text-xs" />
              </div>
            </div>
            <div className="space-y-2">
               <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Conta Corrente</Label>
               <Input {...register('bank_info.account')} placeholder="0000000-0" className="h-11 bg-zinc-900 border-zinc-800 rounded-xl text-xs" />
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-3">
               <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
               <p className="text-[10px] text-amber-200/60 leading-relaxed font-medium">
                  Certifique-se de que o titular da conta é o mesmo CNPJ/CPF cadastrado no CineHub para evitar atrasos no repasse automático.
               </p>
            </div>
          </CardContent>
        </Card>

        {/* DADOS FISCAIS */}
        <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
          <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/40">
            <CardTitle className="text-xl font-black uppercase flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-zinc-400" />
              </div>
              Dados Fiscais
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Regime Tributário</Label>
              <select 
                {...register('fiscal_data.tax_regime')}
                className="w-full h-12 bg-zinc-900 border-zinc-800 rounded-xl px-4 text-sm focus:ring-primary/20 appearance-none font-bold"
              >
                <option value="simples_nacional">SIMPLES NACIONAL</option>
                <option value="lucro_presumido">LUCRO PRESUMIDO</option>
                <option value="mei">MEI - MICROEMPREENDEDOR</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Inscrição Estadual</Label>
                  <Input {...register('fiscal_data.ie')} placeholder="Isento ou Nº" className="h-11 bg-zinc-900 border-zinc-800 rounded-xl" />
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Inscrição Municipal</Label>
                  <Input {...register('fiscal_data.im')} placeholder="Nº da Inscrição" className="h-11 bg-zinc-900 border-zinc-800 rounded-xl" />
               </div>
            </div>

            <div className="pt-6 border-t border-zinc-900/50">
               <div className="flex items-center gap-3 mb-4">
                  <Building2 className="h-4 w-4 text-zinc-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Venda de Notas (NF-e)</span>
               </div>
               <p className="text-xs text-zinc-500 leading-relaxed">
                  O CineHub utiliza estes dados para automatizar o preenchimento de faturas para seus locatários. Mantenha-os atualizados para evitar problemas contábeis.
               </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {status && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
          status.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'
        }`}>
           {status.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
           <p className="text-sm font-bold uppercase tracking-tight">{status.message}</p>
        </div>
      )}

      <div className="flex items-center justify-between p-8 bg-zinc-900/40 border border-zinc-900 rounded-3xl">
         <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
               <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
               <p className="text-sm font-bold text-zinc-200">Segurança de Dados</p>
               <p className="text-[10px] text-zinc-500 font-medium">Seus dados são criptografados e protegidos por políticas RLS rigorosas.</p>
            </div>
         </div>
         <Button 
          type="submit" 
          disabled={isSaving}
          className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_30px_rgba(var(--primary),0.3)] hover:scale-[1.05] transition-all"
         >
           {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
           Salvar Alterações
         </Button>
      </div>
    </form>
  );
}
