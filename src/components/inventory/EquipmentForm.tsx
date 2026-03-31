import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Equipment } from '@/types/database';
import { useCreateEquipment, useUpdateEquipment, uploadEquipmentImage } from '@/hooks/useEquipments';

const equipmentSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  category: z.string().min(1, 'Selecione uma categoria'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  daily_rate: z.coerce.number().min(1, 'Valor diário deve ser maior que 0'),
  condition: z.enum(['excellent', 'good', 'fair', 'maintenance']),
  status: z.enum(['available', 'rented', 'maintenance', 'unavailable']),
  stock_quantity: z.coerce.number().min(1, 'Quantidade deve ser pelo menos 1'),
  location: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
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
  category: string;
  description: string;
  daily_rate: number;
  condition: 'excellent' | 'good' | 'fair' | 'maintenance';
  status: 'available' | 'rented' | 'maintenance' | 'unavailable';
  stock_quantity: number;
  location?: string;
  city?: string;
  state?: string;
}

interface EquipmentFormProps {
  equipment?: Equipment;
  companyId: string;
  onSuccess: () => void;
}

export function EquipmentForm({ equipment, companyId, onSuccess }: EquipmentFormProps) {
  const [images, setImages] = useState<string[]>(equipment?.images || []);
  const [uploading, setUploading] = useState(false);

  const createMutation = useCreateEquipment(companyId);
  const updateMutation = useUpdateEquipment();

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
      category: equipment?.category || '',
      description: equipment?.description || '',
      daily_rate: equipment?.daily_rate || 0,
      condition: equipment?.condition || 'good',
      status: equipment?.status || 'available',
      stock_quantity: equipment?.stock_quantity || 1,
      location: (equipment?.features as any)?.location || '',
      city: (equipment?.features as any)?.city || '',
      state: (equipment?.features as any)?.state || '',
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
      setValue('state', CITY_STATE_MAP[city]);
    }
  };

  const onSubmit = async (values: EquipmentFormValues) => {
    try {
      const { location, city, state, ...dbValues } = values;
      const payload = {
        ...dbValues,
        company_id: companyId,
        images,
        features: {
          ...(equipment?.features as object || {}),
          location,
          city,
          state
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Equipamento {equipment?.master_item_id && <span className="text-[10px] text-primary italic">(Catálogo Oficial)</span>}</Label>
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
          <Label htmlFor="category">Categoria</Label>
          <select 
            id="category" 
            {...register('category')}
            disabled={!!equipment?.master_item_id}
            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              equipment?.master_item_id ? "bg-zinc-900 border-zinc-800 opacity-70 cursor-not-allowed" : ""
            }`}
          >
            <option value="">Selecione...</option>
            <option value="Cameras">Câmeras</option>
            <option value="Lenses">Lentes</option>
            <option value="Lighting">Iluminação</option>
            <option value="Audio">Áudio</option>
            <option value="Grip">Grip & Acessórios</option>
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
          className={equipment?.master_item_id ? "bg-zinc-900 border-zinc-800 opacity-70 cursor-not-allowed" : ""}
        />
        {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="daily_rate">Valor Diária (R$)</Label>
          <Input id="daily_rate" type="number" {...register('daily_rate')} />
          {errors.daily_rate && <p className="text-xs text-red-500">{errors.daily_rate.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="condition">Condição</Label>
          <select 
            id="condition" 
            {...register('condition')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
          <Label htmlFor="stock_quantity">Quantidade Total em Estoque</Label>
          <Input id="stock_quantity" type="number" {...register('stock_quantity')} placeholder="Ex: 5" />
          {errors.stock_quantity && <p className="text-xs text-red-500">{errors.stock_quantity.message}</p>}
          <p className="text-[10px] text-muted-foreground italic">Quantos itens desse modelo você possui para alugar.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location">Local (Prateleira/Galpão)</Label>
          <Input id="location" {...register('location')} placeholder="Ex: Prateleira A2" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input 
            id="city" 
            {...register('city')} 
            onBlur={handleCityBlur}
            placeholder="Ex: São Paulo" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">Estado</Label>
          <Input id="state" {...register('state')} placeholder="Ex: SP" maxLength={2} className="uppercase" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Imagens</Label>
        <div className="grid grid-cols-4 gap-2">
          {images.map((url, index) => (
            <div key={index} className="relative aspect-square rounded-md overflow-hidden bg-muted">
              <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
              <button 
                type="button"
                onClick={() => removeImage(index)}
                disabled={!!equipment?.master_item_id}
                className={`absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 ${equipment?.master_item_id ? "hidden" : ""}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {!equipment?.master_item_id && (
            <label className="flex flex-col items-center justify-center aspect-square rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer transition-colors">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[10px] mt-1 text-muted-foreground">Upload</span>
                </>
              )}
              <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" disabled={uploading} />
            </label>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button 
          type="submit" 
          disabled={isSubmitting || uploading}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {equipment ? 'Salvar Alterações' : 'Cadastrar Equipamento'}
        </Button>
      </div>
    </form>
  );
}
