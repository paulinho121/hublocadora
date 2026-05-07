import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Upload, X, Sparkles, Search, Plus, ChevronLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Equipment } from '@/types/database';
import { useCreateEquipment, useUpdateEquipment, uploadEquipmentImage } from '@/hooks/useEquipments';
import { useCategories } from '@/hooks/useCategories';
import { AIService } from '@/services/AIService';
import { MasterCatalogSelector } from './MasterCatalogSelector';

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

export function EquipmentForm({ equipment, companyId, onSuccess }: EquipmentFormProps) {
  const [step, setStep] = useState<'selection' | 'master_catalog' | 'manual_form'>(
    equipment ? 'manual_form' : 'selection'
  );

  const [images, setImages] = useState<string[]>(equipment?.images || []);
  const [uploading, setUploading] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const createMutation = useCreateEquipment(companyId);
  const updateMutation = useUpdateEquipment();
  const { data: categories, isLoading: isLoadingCategories } = useCategories();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EquipmentFormValues>({
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
      location_base: equipment?.location_base || (equipment?.features as any)?.city || (equipment?.features as any)?.location || '',
      state_uf: equipment?.state_uf || (equipment?.features as any)?.state || '',
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const url = await uploadEquipmentImage(file);
      setImages((prev) => [...prev, url]);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erro ao carregar imagem');
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

  const handleAiDescription = async () => {
    const name = watch('name');
    if (!name || name.length < 3) {
      alert('Digite o nome do modelo para usar a IA');
      return;
    }

    try {
      setIsAiGenerating(true);
      const data = await AIService.generateCatalog(name);
      if (data.description) {
        setValue('description', data.description);
      }
    } catch (error) {
      console.error('AI Error:', error);
      alert('Erro ao gerar descrição com IA. O servidor do Genkit está rodando?');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const onSubmit = async (values: EquipmentFormValues) => {
    if (images.length === 0) {
      alert('Por favor, adicione pelo menos uma foto do equipamento.');
      return;
    }

    try {
      const { location_base, state_uf, brand, ...dbValues } = values;
      const payload = {
        ...dbValues,
        company_id: companyId,
        images,
        location_base,
        state_uf,
        features: {
          ...(equipment?.features as object || {}),
          brand
        },
      };

      if (equipment) {
        await updateMutation.mutateAsync({ id: equipment.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving equipment:', error);
      alert('Erro ao salvar equipamento');
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
          <Button variant="outline" onClick={() => setStep('manual_form')} className="uppercase font-bold tracking-widest text-xs h-12 px-8 rounded-xl">
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
            <Label htmlFor="name">Nome do Equipamento {equipment?.master_item_id && <span className="text-[10px] text-primary">(Catálogo Oficial)</span>}</Label>
            <button
              type="button"
              onClick={handleAiDescription}
              disabled={isAiGenerating || !!equipment?.master_item_id}
              className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              title="Gerar descrição com IA"
            >
              {isAiGenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  Gerar Descrição IA
                </>
              )}
            </button>
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-primary transition-colors">Nova Foto</span>
                </>
              )}
              <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" disabled={uploading} />
            </label>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800/50">
        {!equipment && (
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => setStep('selection')}
            disabled={isSubmitting || uploading}
            className="uppercase font-bold tracking-widest text-xs"
          >
            Voltar
          </Button>
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
