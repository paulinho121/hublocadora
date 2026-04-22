import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Package, 
  Truck, 
  Store, 
  Calendar, 
  Hash, 
  MapPin,
  Loader2,
  CheckCircle2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useEquipments } from '@/hooks/useEquipments';
import { useCreateBooking } from '@/hooks/useBookings';
import { useAuth } from '@/contexts/AuthContext';
import { useTransfers } from '@/hooks/useTransfers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const supplementSchema = z.object({
  equipmentId: z.string().min(1, 'Selecione o equipamento'),
  quantity: z.number().min(1, 'Mínimo 1 unidade'),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().min(1, 'Data de fim é obrigatória'),
  deliveryMethod: z.enum(['pickup', 'delivery']),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

type SupplementFormValues = z.infer<typeof supplementSchema>;

interface HubSupplementRequestProps {
  onSuccess?: () => void;
}

export function HubSupplementRequest({ onSuccess }: HubSupplementRequestProps) {
  const { user } = useAuth();
  const createBooking = useCreateBooking();
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Buscar equipamentos do HUB (assumindo que equipamentos sem companyId específico ou com uma tag são do HUB)
  // Para o MVP, vamos carregar todos e filtrar ou deixar o usuário escolher.
  // Idealmente: carregar apenas da conta "HUB MASTER"
  const { data: hubEquipments, isLoading: isLoadingEquipments } = useEquipments();

  const { data: myBranch } = useQuery({
    queryKey: ['my-branch', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const { data } = await supabase.from('branches').select('id').eq('manager_email', user.email).maybeSingle();
      return data;
    },
    enabled: !!user?.email
  });

  const { createTransfer } = useTransfers();

  const form = useForm<SupplementFormValues>({
    resolver: zodResolver(supplementSchema),
    defaultValues: {
      quantity: 1,
      deliveryMethod: 'pickup',
    },
  });

  const deliveryMethod = form.watch('deliveryMethod');

  const onSubmit = async (values: SupplementFormValues) => {
    if (!user) return;

    try {
      const equipment = hubEquipments?.find(e => e.id === values.equipmentId);
      if (!equipment) return;

      if (myBranch?.id) {
          // É uma sub-locadora pedindo um item! Gera transferência interna.
          await createTransfer.mutateAsync({
              requesterBranchId: myBranch.id,
              equipmentId: values.equipmentId,
              quantity: values.quantity
          });
      } else {
          // Conta normal pedindo.
          await createBooking.mutateAsync({
            equipment_id: values.equipmentId,
            renter_id: user.id,
            company_id: equipment.company_id, // O dono do item (HUB)
            start_date: values.startDate,
            end_date: values.endDate,
            total_amount: equipment.daily_rate * values.quantity, // Cálculo simplificado
            status: 'pending',
            notes: values.notes || null,
            quantity: values.quantity,
            delivery_method: values.deliveryMethod,
            delivery_address: values.deliveryMethod === 'delivery' ? values.deliveryAddress || null : null,
          });
      }

      setIsSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (error) {
      console.error('Erro ao solicitar suplemento:', error);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in-95">
        <div className="bg-emerald-500/10 p-4 rounded-full mb-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold uppercase tracking-tighter mb-2">Solicitação Enviada</h3>
        <p className="text-muted-foreground max-w-xs mx-auto">
          Sua requisição de suplemento de estoque foi enviada ao HUB. Você receberá um alerta assim que for aprovada.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
      <div className="space-y-4">
        {/* Equipamento */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Equipamento Requisitado</Label>
          <Select 
            {...form.register('equipmentId')}
            className="h-12 bg-zinc-950 border-zinc-800 w-full"
          >
            <option value="">Selecione o item do estoque HUB</option>
            {isLoadingEquipments ? (
              <option disabled>Carregando...</option>
            ) : (
              hubEquipments?.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(eq.daily_rate)}/dia
                </option>
              ))
            )}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Quantidade */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Quantidade</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <Input 
                type="number" 
                className="pl-10 h-10 bg-zinc-950 border-zinc-800" 
                {...form.register('quantity', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Período (Simplificado para o MVP) */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Início</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <Input 
                type="date" 
                className="pl-10 h-10 bg-zinc-950 border-zinc-800" 
                {...form.register('startDate')}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           {/* Término */}
           <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Término</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <Input 
                type="date" 
                className="pl-10 h-10 bg-zinc-950 border-zinc-800" 
                {...form.register('endDate')}
              />
            </div>
          </div>
        </div>

        {/* Logística */}
        <div className="space-y-3 pt-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-emerald-500">Logística de Recebimento</Label>
          <RadioGroup 
            defaultValue="pickup" 
            onValueChange={(v) => form.setValue('deliveryMethod', v as 'pickup' | 'delivery')}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem value="pickup" id="pickup" className="peer sr-only" />
              <Label
                htmlFor="pickup"
                className="flex flex-col items-center justify-between rounded-xl border-2 border-zinc-900 bg-zinc-950 p-4 hover:bg-zinc-900 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
              >
                <Store className="mb-2 h-6 w-6 text-zinc-500" />
                <span className="text-xs font-bold uppercase">Retirar no HUB</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="delivery" id="delivery" className="peer sr-only" />
              <Label
                htmlFor="delivery"
                className="flex flex-col items-center justify-between rounded-xl border-2 border-zinc-900 bg-zinc-950 p-4 hover:bg-zinc-900 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
              >
                <Truck className="mb-2 h-6 w-6 text-zinc-500" />
                <span className="text-xs font-bold uppercase">Receber no Local</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {deliveryMethod === 'delivery' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Endereço de Entrega</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-zinc-600" />
              <Textarea 
                placeholder="Rua, número, complemento, bairro, cidade..."
                className="pl-10 bg-zinc-950 border-zinc-800 min-h-[80px]"
                {...form.register('deliveryAddress')}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Observações adicionais</Label>
          <Textarea 
            placeholder="Ex: Preciso que os cabos sejam de 10m..."
            className="bg-zinc-950 border-zinc-800"
            {...form.register('notes')}
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 font-black uppercase tracking-tighter text-lg"
        disabled={createBooking.isPending}
      >
        {createBooking.isPending ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          'Confirmar Solicitação'
        )}
      </Button>
    </form>
  );
}
