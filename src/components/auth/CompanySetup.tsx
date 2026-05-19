import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Building2, MapPin, FileDigit, Briefcase, Search, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { validateDocument } from '@/lib/document-validators';

const FORM_CACHE_KEY = 'cinehub_company_setup_draft';

const companySchema = z.object({
  full_name: z.string().min(3, 'Seu nome completo deve ter pelo menos 3 caracteres'),
  name: z.string().min(3, 'O nome da empresa deve ter pelo menos 3 caracteres'),
  document: z.string().min(14, 'Documento inválido').refine(
    (val) => validateDocument(val),
    { message: 'CPF ou CNPJ inválido — verifique os dígitos' }
  ),
  phone: z.string().min(10, 'Telefone inválido'),
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
  const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);

  // Restaurar rascunho salvo no localStorage
  const savedDraft = (() => {
    try {
      const raw = localStorage.getItem(FORM_CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  })();

  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch, 
    formState: { errors, isSubmitting } 
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: savedDraft,
  });

  // Auto-save: salva no localStorage a cada mudança de campo
  const watchedValues = watch();
  useEffect(() => {
    try {
      localStorage.setItem(FORM_CACHE_KEY, JSON.stringify(watchedValues));
    } catch {}
  }, [watchedValues]);

  const cep = watch('address_zip');
  const document = watch('document');

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

  const maskPhone = (value: string) => {
    const val = value.replace(/\D/g, '');
    if (val.length <= 10) {
      return val
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    } else {
      return val
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }
  };

  const maskCep = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  // Busca de CNPJ Automática
  useEffect(() => {
    const fetchCnpj = async () => {
      const cleanCnpj = document?.replace(/\D/g, '');
      if (cleanCnpj?.length === 14) {
        try {
          setIsLoadingCnpj(true);
          const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
          if (!response.ok) return;
          
          const data = await response.json();
          
          if (data.razao_social || data.nome_fantasia) {
            setValue('name', data.nome_fantasia || data.razao_social, { shouldValidate: true });
            setValue('address_zip', data.cep, { shouldValidate: true });
            setValue('address_street', data.logradouro, { shouldValidate: true });
            setValue('address_number', data.numero, { shouldValidate: true });
            setValue('address_neighborhood', data.bairro, { shouldValidate: true });
            setValue('address_city', data.municipio, { shouldValidate: true });
            setValue('address_state', data.uf, { shouldValidate: true });
            if (data.ddd_telefone_1) {
              setValue('phone', maskPhone(data.ddd_telefone_1), { shouldValidate: true });
            }
          }
        } catch (error) {
          console.error('Erro ao buscar CNPJ:', error);
        } finally {
          setIsLoadingCnpj(false);
        }
      }
    };

    fetchCnpj();
  }, [document, setValue]);

  // Busca de CEP Automática
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
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedName, setSubmittedName] = useState('');

  const onSubmit = async (values: CompanyFormValues) => {
    setSubmitError(null);
    
    try {
      // 1. Atualizar Perfil do Usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: ownerId,
          email: (await supabase.auth.getUser()).data.user?.email || '',
          full_name: values.full_name,
          phone: values.phone,
          role: 'rental_house',
          updated_at: new Date().toISOString()
        });

      if (profileError) throw new Error('Erro ao salvar seu perfil de usuário.');

      // 1.5 Verificar duplicidade
      const { data: existingDoc } = await supabase
        .from('companies')
        .select('id')
        .eq('document', values.document)
        .maybeSingle();

      if (existingDoc) throw new Error('Este CPF/CNPJ já está registrado em outra conta CineHub.');

      // 2. Inserir a empresa
      const { error: companyError } = await supabase
        .from('companies')
        .insert([{ 
          name: values.name,
          document: values.document,
          description: values.description,
          address_street: values.address_street,
          address_number: values.address_number,
          address_neighborhood: values.address_neighborhood,
          address_city: values.address_city,
          address_state: values.address_state,
          address_zip: values.address_zip,
          phone: values.phone,
          owner_id: ownerId, 
          status: 'pending' 
        }]);

      if (companyError) throw new Error(companyError.message);
      
      setSubmittedName(values.name);
      setIsSuccess(true);
      localStorage.removeItem(FORM_CACHE_KEY);
      queryClient.invalidateQueries({ queryKey: ['company', ownerId] });
    } catch (error: any) {
      console.error('Erro ao configurar empresa:', error);
      setSubmitError(error.message || 'Ocorreu um erro inesperado');
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-10 bg-card border rounded-2xl shadow-xl text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
        </div>

        <h2 className="text-3xl font-black tracking-tighter uppercase mb-2">
          Cadastro Recebido!
        </h2>
        <p className="text-muted-foreground text-base mb-2">
          Recebemos os dados de <span className="font-bold text-foreground">{submittedName}</span>.
        </p>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
          Nossa equipe vai analisar as informações e sua locadora será liberada em instantes.
        </p>

        <div className="mt-8 p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center gap-4 text-left">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-amber-500">Análise em andamento</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tempo estimado: menos de 5 minutos.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8 bg-card border rounded-2xl shadow-xl transition-all hover:shadow-2xl">
      <div className="mb-8 border-b pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Finalize seu Cadastro</h2>
        </div>
        <p className="text-muted-foreground">Preencha os dados obrigatórios para habilitar seu acesso.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Dados do Usuário */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Seu Nome Completo *</Label>
            <Input 
              {...register('full_name')} 
              placeholder="Ex: João Silva"
              className="bg-muted/30 h-11"
            />
            {errors.full_name && <p className="text-xs text-red-500 font-medium">{errors.full_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Telefone / WhatsApp *</Label>
            <Input 
              {...register('phone')} 
              placeholder="(11) 99999-9999"
              className="bg-muted/30 h-11"
              onChange={(e) => {
                const masked = maskPhone(e.target.value);
                e.target.value = masked;
                setValue('phone', masked);
              }}
            />
            {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone.message}</p>}
          </div>
        </div>

        <div className="pt-4 border-t border-dashed">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Dados da Empresa</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>CPF ou CNPJ *</Label>
              <div className="relative">
                <Input 
                  {...register('document')} 
                  placeholder="00.000.000/0001-00"
                  className="bg-muted/30 h-11 pr-10"
                  onChange={(e) => {
                    const masked = maskDocument(e.target.value);
                    e.target.value = masked;
                    setValue('document', masked);
                  }}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isLoadingCnpj ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <Search className="w-4 h-4 text-muted-foreground/50" />
                  )}
                </div>
              </div>
              {errors.document && <p className="text-xs text-red-500 font-medium">{errors.document.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Nome da Empresa / Fantasia *</Label>
              <Input 
                {...register('name')} 
                placeholder="Ex: Cine Locações"
                className="bg-muted/30 h-11"
              />
              {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-dashed">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Localização</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-1 space-y-2">
              <Label>CEP *</Label>
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
              {errors.address_zip && <p className="text-xs text-red-500 font-medium">{errors.address_zip.message}</p>}
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Rua / Logradouro *</Label>
              <Input {...register('address_street')} className="bg-muted/30 h-11" />
              {errors.address_street && <p className="text-xs text-red-500 font-medium">{errors.address_street.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Número *</Label>
              <Input {...register('address_number')} className="bg-muted/30 h-11" />
              {errors.address_number && <p className="text-xs text-red-500 font-medium">{errors.address_number.message}</p>}
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Bairro *</Label>
              <Input {...register('address_neighborhood')} className="bg-muted/30 h-11" />
            </div>
            <div className="space-y-2">
              <Label>UF *</Label>
              <Input {...register('address_state')} maxLength={2} placeholder="SP" className="bg-muted/30 h-11 uppercase" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cidade *</Label>
            <Input {...register('address_city')} className="bg-muted/30 h-11" />
          </div>
        </div>

        {submitError && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 text-destructive text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{submitError}</p>
          </div>
        )}

        <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : 'Finalizar Cadastro'}
        </Button>
      </form>
    </div>
  );
}
