import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Building2, MapPin, FileDigit, Briefcase, Search, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const companySchema = z.object({
  name: z.string().min(3, 'O nome da empresa deve ter pelo menos 3 caracteres'),
  document: z.string().min(14, 'Documento inválido (mínimo 11 dígitos)'),
  description: z.string().optional(),
  address_street: z.string().min(1, 'Logradouro é obrigatório'),
  address_number: z.string().min(1, 'Número é obrigatório'),
  address_neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  address_city: z.string().min(1, 'Cidade é obrigatória'),
  address_state: z.string().length(2, 'Estado deve ter 2 letras (UF)'),
  address_zip: z.string().min(8, 'CEP deve ter 8 ou 9 caracteres'),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export function CompanySetup({ ownerId }: { ownerId: string }) {
  const queryClient = useQueryClient();
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch, 
    formState: { errors, isSubmitting } 
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
  });

  const cep = watch('address_zip');

  // Máscaras Profissionais
  const maskDocument = (value: string) => {
    const val = value.replace(/\D/g, '');
    if (val.length <= 11) { // CPF
      return val
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    } else { // CNPJ
      return val
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
  };

  const maskCep = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  useEffect(() => {
    const fetchAddress = async () => {
      const cleanCep = cep?.replace(/\D/g, '');
      if (cleanCep?.length === 8) {
        try {
          setIsLoadingCep(true);
          const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
          const data = await response.json();
          
          if (!data.erro) {
            setValue('address_street', data.logradouro, { shouldValidate: true });
            setValue('address_neighborhood', data.bairro, { shouldValidate: true });
            setValue('address_city', data.localidade, { shouldValidate: true });
            setValue('address_state', data.uf, { shouldValidate: true });
          }
        } catch (error) {
          console.error('Erro ao buscar CEP:', error);
        } finally {
          setIsLoadingCep(false);
        }
      }
    };

    fetchAddress();
  }, [cep, setValue]);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = async (values: CompanyFormValues) => {
    setSubmitError(null);
    
    try {
      // 1. Garantir que o perfil existe ou atualizá-lo (Upsert é mais resiliente)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: ownerId, 
          email: (await supabase.auth.getUser()).data.user?.email || '',
          full_name: values.name,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Erro ao salvar perfil:', profileError);
        throw new Error('Não foi possível salvar seu perfil de usuário. Verifique as permissões de banco de dados.');
      }

      // 2. Inserir a empresa
      const { error: companyError } = await supabase
        .from('companies')
        .insert([{ 
          ...values, 
          owner_id: ownerId, 
          status: 'pending' 
        }]);

      if (companyError) {
        console.error('Erro ao salvar empresa:', companyError);
        if (companyError.code === '42703') { // Coluna inexistente
           throw new Error('Erro técnico: A coluna "status" está faltando na tabela "companies". Execute o script SQL de correção.');
        }
        throw new Error(companyError.message || 'Erro ao cadastrar empresa. Verifique as políticas RLS.');
      }
      
      queryClient.invalidateQueries({ queryKey: ['company', ownerId] });
    } catch (error: any) {
      console.error('Erro ao configurar empresa:', error);
      setSubmitError(error.message || 'Ocorreu um erro inesperado');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-card border rounded-2xl shadow-xl transition-all hover:shadow-2xl">
      <div className="mb-8 border-b pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Configure sua Locadora</h2>
        </div>
        <p className="text-muted-foreground">Otimize suas operações preenchendo as informações oficiais da sua empresa.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              Nome da Empresa
            </Label>
            <Input 
              {...register('name')} 
              placeholder="Cine Locações LTDA"
              className="bg-muted/30 focus-visible:ring-offset-0 focus-visible:ring-primary h-11"
            />
            {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileDigit className="w-4 h-4 text-muted-foreground" />
              CPF ou CNPJ
            </Label>
            <Input 
              {...register('document')} 
              placeholder="00.000.000/0001-00"
              className="bg-muted/30 focus-visible:ring-offset-0 h-11"
              onChange={(e) => {
                const masked = maskDocument(e.target.value);
                e.target.value = masked;
                setValue('document', masked);
              }}
            />
            {errors.document && <p className="text-xs text-red-500 font-medium">{errors.document.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Descrição Profissional (Opcional)</Label>
          <Textarea 
            {...register('description')} 
            placeholder="Destaque os diferenciais da sua locadora, especialidades etc..."
            className="min-h-[100px] bg-muted/30 resize-none"
          />
        </div>

        <div className="pt-4 border-t border-dashed">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Localização</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-1 space-y-2">
              <Label>CEP</Label>
              <div className="relative">
                <Input 
                  {...register('address_zip')} 
                  placeholder="00000-000" 
                  maxLength={9}
                  className="bg-muted/30 h-11 pr-10"
                  onChange={(e) => {
                    const masked = maskCep(e.target.value);
                    e.target.value = masked;
                    setValue('address_zip', masked);
                  }}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isLoadingCep ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <Search className="w-4 h-4 text-muted-foreground/50" />
                  )}
                </div>
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Rua / Logradouro</Label>
              <Input {...register('address_street')} className="bg-muted/30 h-11" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Número</Label>
              <Input {...register('address_number')} className="bg-muted/30 h-11" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Bairro</Label>
              <Input {...register('address_neighborhood')} className="bg-muted/30 h-11" />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Input {...register('address_state')} maxLength={2} placeholder="SP" className="bg-muted/30 h-11 uppercase" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input {...register('address_city')} className="bg-muted/30 h-11" />
          </div>
        </div>

        {submitError && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 text-destructive text-sm animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Erro de Permissão (Banco de Dados)</p>
              <p className="opacity-90">{submitError === 'permission denied for table companies' ? 'O banco de dados não permite a criação de empresas. Configure as políticas RLS.' : submitError}</p>
            </div>
          </div>
        )}

        <Button type="submit" className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-primary/20 transition-all" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin mr-2" />
              Finalizando...
            </>
          ) : (
            'Finalizar Configuração'
          )}
        </Button>
      </form>
    </div>
  );
}
