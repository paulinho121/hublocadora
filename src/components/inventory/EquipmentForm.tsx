import { useState, useEffect } from 'react';
import { friendlyError } from '@/lib/errors';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Upload, X, Sparkles, Search, Plus, ChevronLeft, Check, Camera } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Equipment } from '@/types/database';
import { useCreateEquipment, useUpdateEquipment, uploadEquipmentImage, useEquipments } from '@/hooks/useEquipments';
import { getSuggestedIds } from '@/components/marketplace/SuggestedEquipments';
import { useCategories } from '@/hooks/useCategories';
import { MasterCatalogSelector } from './MasterCatalogSelector';
import { useTenant } from '@/contexts/TenantContext';
import { useFormPersist } from '@/hooks/useFormPersist';

const equipmentSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  brand: z.string().min(1, 'A marca é obrigatória'),
  category: z.string().min(1, 'Selecione uma categoria'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  daily_rate: z.coerce.number().min(1, 'Valor diário deve ser maior que 0'),
  condition: z.enum(['excellent', 'good', 'fair', 'maintenance']),
  status: z.enum(['available', 'rented', 'maintenance', 'unavailable']),
  stock_quantity: z.coerce.number().min(1, 'Quantidade deve ser pelo menos 1'),
  location_base: z.string().min(2, 'A Cidade / Base Logística é obrigatória'),
  state_uf: z.string().length(2, 'Insira a UF do estado, ex: SP'),
});

const CITY_STATE_MAP: Record<string, string> = {
  'SÃO PAULO': 'SP', 'SAO PAULO': 'SP', 'SP': 'SP', 'RIOCENTRO': 'RJ', 
  'RIO DE JANEIRO': 'RJ', 'RIO': 'RJ', 'BELO HORIZONTE': 'MG', 'BH': 'MG',
  'CURITIBA': 'PR', 'PORTO ALEGRE': 'RS', 'POA': 'RS', 'SALVADOR': 'BA',
  'FORTALEZA': 'CE', 'RECIFE': 'PE', 'MANAUS': 'AM', 'BRASÍLIA': 'DF', 'BRASILIA': 'DF',
  'GOIÂNIA': 'GO', 'GOIANIA': 'GO', 'BELÉM': 'PA', 'BELEM': 'PA'
};

interface EquipmentFormValues {
  name: string;
  brand: string;
  category: string;
  description: string;
  daily_rate: number;
  condition: 'excellent' | 'good' | 'fair' | 'maintenance';
  status: 'available' | 'rented' | 'maintenance' | 'unavailable';
  stock_quantity: number;
  location_base: string;
  state_uf: string;
}

interface EquipmentFormProps {
  equipment?: Equipment;
  companyId: string;
  onSuccess: () => void;
}

export function EquipmentForm({ equipment, companyId: propCompanyId, onSuccess }: EquipmentFormProps) {
  const { company, tenantId: contextCompanyId } = useTenant();
  const companyId = propCompanyId || contextCompanyId || '';

  const [step, setStep] = useState<'selection' | 'master_catalog' | 'manual_form'>(
    equipment ? 'manual_form' : 'selection'
  );

  // Persistência: salva rascunho entre trocas de aba (não aplica no modo de edição).
  // No celular, abrir a galeria/câmera pode recarregar a página — por isso as fotos
  // já enviadas também entram no rascunho do cadastro novo.
  const draftKey = equipment ? `cinehub_equipment_edit_${equipment.id}` : 'cinehub_equipment_new_draft';
  const imagesDraftKey = `${draftKey}_images`;
  const [images, setImages] = useState<string[]>(() => {
    if (equipment) return equipment.images || [];
    try {
      return JSON.parse(localStorage.getItem(imagesDraftKey) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (equipment) return;
    try { localStorage.setItem(imagesDraftKey, JSON.stringify(images)); } catch {}
  }, [images, equipment, imagesDraftKey]);
  // Equipamentos sugeridos ao locatário junto com este (ex.: bateria, tripé, case)
  const suggestedDraftKey = `${draftKey}_suggested`;
  const [suggestedIds, setSuggestedIds] = useState<string[]>(() => {
    if (equipment) return getSuggestedIds(equipment);
    try {
      return JSON.parse(localStorage.getItem(suggestedDraftKey) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (equipment) return;
    try { localStorage.setItem(suggestedDraftKey, JSON.stringify(suggestedIds)); } catch {}
  }, [suggestedIds, equipment, suggestedDraftKey]);

  const { data: companyEquipmentsPage } = useEquipments({ companyId });
  // Outros itens da locadora (um por nome, sem o próprio equipamento)
  const suggestionOptions = (companyEquipmentsPage?.items ?? [])
    .filter(e => e.id !== equipment?.id && e.company_id === companyId)
    .filter((e, i, list) => list.findIndex(o => o.name.trim().toUpperCase() === e.name.trim().toUpperCase()) === i)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const toggleSuggested = (id: string) =>
    setSuggestedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const [uploading, setUploading] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const createMutation = useCreateEquipment(companyId);
  const updateMutation = useUpdateEquipment();
  const { data: categories, isLoading: isLoadingCategories } = useCategories();
  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema) as any,
    defaultValues: {
      name: equipment?.name || '',
      brand: (equipment?.features as any)?.brand || '',
      category: equipment?.category || '',
      description: equipment?.description || '',
      daily_rate: equipment?.daily_rate || 0,
      condition: equipment?.condition || 'good',
      status: equipment?.status || 'available',
      stock_quantity: equipment?.stock_quantity || 1,
      location_base: equipment?.location_base || company?.address_city || '',
      state_uf: equipment?.state_uf || company?.address_state || '',
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = form;

  // Cadastro novo: restaura todos os campos (senão a quantidade digitada volta para o padrão 1)
  const { clearDraft: clearFormDraft } = useFormPersist(draftKey, form, [], { restoreAll: !equipment });
  const clearDraft = () => {
    clearFormDraft();
    try { localStorage.removeItem(imagesDraftKey); localStorage.removeItem(suggestedDraftKey); } catch {}
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const url = await uploadEquipmentImage(file);
      setImages((prev) => [...prev, url]);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao carregar imagem');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCityBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const city = e.target.value.toUpperCase().trim();
    if (CITY_STATE_MAP[city]) {
      setValue('state_uf', CITY_STATE_MAP[city]);
    }
  };

  const handleSmartFill = async () => {
    const name = watch('name');
    if (!name || name.length < 3) {
      toast.error('Digite pelo menos o modelo (ex: Sony A7S III) para que a IA possa ajudar.');
      return;
    }

    try {
      setIsAiGenerating(true);
      // IA em desenvolvimento — funcionalidade disponível em breve
      const data: any = {};
      
      if (data.brand) setValue('brand', data.brand);
      if (data.category) setValue('category', data.category);
      if (data.description) setValue('description', data.description);
      
      if (data.brand || data.category || data.description) {
        // console.log('Smart fill success');
      }
    } catch (error) {
      console.error('AI Error:', error);
      toast.error('Não foi possível completar os dados com IA no momento. Tente preencher manualmente.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const onSubmit = async (values: EquipmentFormValues) => {
    if (images.length === 0) {
      toast.error('Por favor, adicione pelo menos uma foto do equipamento.');
      return;
    }

    if (!companyId) {
      toast.error('Erro: Sua conta ainda não está vinculada a uma empresa. Por favor, complete seu cadastro de perfil primeiro.');
      return;
    }

    try {
      const { location_base, state_uf, brand, ...dbValues } = values;
      const payload = {
        ...dbValues,
        company_id: companyId,
        brand,
        images,
        location_base,
        state_uf,
        features: {
          ...(equipment?.features as object || {}),
          brand,
          // Só guarda sugestões que ainda existem no inventário
          suggested_ids: companyEquipmentsPage
            ? suggestedIds.filter(id => suggestionOptions.some(o => o.id === id))
            : suggestedIds,
        },
      };

      if (equipment) {
        await updateMutation.mutateAsync({ id: equipment.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      clearDraft();
      onSuccess();
    } catch (error: any) {
      console.error('Error saving equipment:', error);
      const errorMsg = error?.message || 'Erro ao salvar equipamento';
      const errorDetails = error?.details || '';
      toast.error(friendlyError(error, 'Erro ao salvar equipamento.'));
    }
  };

  if (step === 'selection') {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in duration-500 py-8">
        <div className="text-center space-y-2 mb-8">
          <h3 className="text-2xl font-black uppercase tracking-tighter">O equipamento já existe no sistema?</h3>
          <p className="text-sm text-zinc-500">Pesquise em nosso catálogo oficial para importar fotos e dados técnicos automaticamente.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            type="button"
            onClick={() => setStep('master_catalog')}
            className="p-6 rounded-2xl border-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-primary/50 text-left transition-all group"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <h4 className="text-lg font-black uppercase tracking-tight text-zinc-100 mb-1">Pesquisar no Sistema</h4>
            <p className="text-xs text-zinc-500">Recomendado. Fotos e dados em 1 clique.</p>
          </button>

          <button 
            type="button"
            onClick={() => setStep('manual_form')}
            className="p-6 rounded-2xl border-2 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-500 text-left transition-all group"
          >
            <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus className="h-6 w-6 text-zinc-400" />
            </div>
            <h4 className="text-lg font-black uppercase tracking-tight text-zinc-100 mb-1">Cadastrar do Zero</h4>
            <p className="text-xs text-zinc-500">Para itens exclusivos ou não catalogados.</p>
          </button>
        </div>
      </div>
    );
  }

  if (step === 'master_catalog') {
    return (
      <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setStep('selection')} className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h3 className="text-lg font-black uppercase tracking-tighter">Catálogo Oficial</h3>
        </div>
        <MasterCatalogSelector companyId={companyId} onSuccess={onSuccess} />
        <div className="mt-8 pt-6 border-t border-zinc-800/50 text-center">
          <p className="text-sm text-zinc-500 mb-4">Não encontrou o que procurava?</p>
          <Button variant="outline" onClick={() => setStep('manual_form')} className="font-bold text-xs h-12 px-8 rounded-xl">
            Cadastrar do Zero
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="name">Nome do Equipamento {equipment?.master_item_id && <span className="text-[11px] text-primary">(Catálogo Oficial)</span>}</Label>
            {/* <button
              type="button"
              onClick={handleSmartFill}
              disabled={isAiGenerating || !!equipment?.master_item_id}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-[11px] text-primary hover:bg-primary/20 transition-all disabled:opacity-50 border border-primary/20 animate-pulse-subtle"
              title="Preencher Marca, Categoria e Descrição com IA"
            >
              {isAiGenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Preenchimento Inteligente IA
                </>
              )}
            </button> */}
          </div>
          <Input 
            id="name" 
            {...register('name')} 
            placeholder="Ex: Sony A7IV" 
            disabled={!!equipment?.master_item_id}
            className={equipment?.master_item_id ? "bg-zinc-900 border-zinc-800 opacity-70 cursor-not-allowed" : ""}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="brand">Marca</Label>
          <Input 
            id="brand" 
            {...register('brand')} 
            placeholder="Ex: Sony" 
            disabled={!!equipment?.master_item_id}
            className={equipment?.master_item_id ? "bg-zinc-900 border-zinc-800 opacity-70 cursor-not-allowed" : ""}
          />
          {errors.brand && <p className="text-xs text-red-500">{errors.brand.message}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="category">Tipo / Categoria</Label>
          <select 
            id="category" 
            {...register('category')}
            disabled={!!equipment?.master_item_id}
            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              equipment?.master_item_id ? "bg-zinc-900 border-zinc-800 opacity-70 cursor-not-allowed" : ""
            }`}
          >
            <option value="">Selecione...</option>
            {isLoadingCategories ? (
              <option disabled>Carregando...</option>
            ) : (
              categories?.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))
            )}
          </select>
          {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea 
          id="description" 
          {...register('description')} 
          placeholder="Detalhes técnicos, o que acompanha etc." 
          disabled={!!equipment?.master_item_id}
          className={equipment?.master_item_id ? "bg-zinc-900 border-zinc-800 opacity-70 cursor-not-allowed min-h-[100px]" : "min-h-[100px]"}
        />
        {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800">
        <div className="space-y-2">
          <Label htmlFor="daily_rate">Valor Diária (R$)</Label>
          <Input id="daily_rate" type="number" {...register('daily_rate')} className="font-bold text-lg bg-zinc-950" />
          {errors.daily_rate && <p className="text-xs text-red-500">{errors.daily_rate.message}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="stock_quantity">Qtd em Estoque</Label>
          <Input id="stock_quantity" type="number" {...register('stock_quantity')} placeholder="Ex: 5" className="font-bold text-lg bg-zinc-950" />
          {errors.stock_quantity && <p className="text-xs text-red-500">{errors.stock_quantity.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="condition">Condição</Label>
          <select 
            id="condition" 
            {...register('condition')}
            className="flex h-10 w-full rounded-md border border-input bg-zinc-950 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="excellent">Excelente</option>
            <option value="good">Bom</option>
            <option value="fair">Usado</option>
            <option value="maintenance">Em Manutenção</option>
          </select>
        </div>
         <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select 
            id="status" 
            {...register('status')}
            className="flex h-10 w-full rounded-md border border-input bg-zinc-950 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="available">Disponível</option>
            <option value="rented">Alugado</option>
            <option value="maintenance">Manutenção</option>
            <option value="unavailable">Indisponível</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location_base">Cidade / Nome da Base <span className="text-red-500">*</span></Label>
          <Input 
            id="location_base" 
            {...register('location_base')} 
            onBlur={handleCityBlur}
            placeholder="Ex: São Paulo, Filial Centro..." 
            className="border-zinc-800 bg-zinc-900"
          />
          {errors.location_base && <p className="text-xs text-red-500">{errors.location_base.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="state_uf">Estado (UF) <span className="text-red-500">*</span></Label>
          <Input 
            id="state_uf" 
            {...register('state_uf')} 
            placeholder="Ex: SP" 
            maxLength={2} 
            className="uppercase border-zinc-800 bg-zinc-900 font-bold" 
          />
          {errors.state_uf && <p className="text-xs text-red-500">{errors.state_uf.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Fotos do Equipamento <span className="text-red-500">*</span></Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((url, index) => (
            <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
              <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
              <button 
                type="button"
                onClick={() => removeImage(index)}
                disabled={!!equipment?.master_item_id}
                className={`absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-500 text-white rounded-full transition-colors shadow-lg ${equipment?.master_item_id ? "hidden" : ""}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {!equipment?.master_item_id && (
            <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-zinc-800 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group">
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <>
                  <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Upload className="h-5 w-5 text-zinc-400 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-[11px] font-bold text-zinc-500 group-hover:text-primary transition-colors">Nova Foto</span>
                </>
              )}
              <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" disabled={uploading} />
            </label>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Equipamentos sugeridos <span className="text-zinc-500 font-normal">(opcional)</span></Label>
        <p className="text-xs text-zinc-500">
          Escolha itens do seu inventário para sugerir ao cliente junto com este (ex.: bateria, tripé, case).
        </p>
        {suggestionOptions.length === 0 ? (
          <p className="text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl px-4 py-3">
            Cadastre outros equipamentos para poder sugerir aqui.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
            {suggestionOptions.map(option => {
              const selected = suggestedIds.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleSuggested(option.id)}
                  aria-pressed={selected}
                  className={`flex items-center gap-3 p-2 rounded-xl border text-left transition-colors ${
                    selected ? 'border-primary bg-primary/5' : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 overflow-hidden shrink-0 flex items-center justify-center">
                    {option.images?.[0]
                      ? <img src={option.images[0]} alt="" className="w-full h-full object-contain p-0.5" />
                      : <Camera className="w-4 h-4 text-zinc-500" />}
                  </div>
                  <span className="flex-1 min-w-0 text-sm font-medium text-zinc-200 line-clamp-2">{option.name}</span>
                  <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                    selected ? 'bg-primary border-primary text-white' : 'border-zinc-700'
                  }`}>
                    {selected && <Check className="w-3.5 h-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800/50">
        {!equipment && (
          <button 
            type="button" 
            onClick={() => setStep('selection')}
            disabled={isSubmitting || uploading}
            className="font-bold text-xs px-4 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Voltar
          </button>
        )}
        <Button 
          type="submit" 
          disabled={isSubmitting || uploading}
          className="w-full sm:w-auto h-12 px-8 uppercase font-black tracking-widest"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {equipment ? 'Salvar Alterações' : 'Concluir Cadastro'}
        </Button>
      </div>
    </form>
  );
}
