import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Calculator, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AIService } from '@/services/AIService';

const quoteSchema = z.object({
  equipmentItems: z.array(z.string()).min(1, 'Adicione pelo menos um equipamento'),
  rentalDays: z.coerce.number().min(1, 'Mínimo 1 dia'),
  location: z.string().min(1, 'Local é obrigatório'),
  includeInsurance: z.boolean(),
  extras: z.array(z.string()),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface RentalQuoteProps {
  onResult?: (result: any) => void;
}

export function RentalQuote({ onResult }: RentalQuoteProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [equipmentItems, setEquipmentItems] = useState<string[]>(['']);
  const [extras, setExtras] = useState<string[]>([]);
  const [newExtra, setNewExtra] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      rentalDays: 3,
      location: 'São Paulo',
      includeInsurance: true,
      extras: [],
    },
  });

  const addEquipmentItem = () => {
    setEquipmentItems([...equipmentItems, '']);
  };

  const removeEquipmentItem = (index: number) => {
    if (equipmentItems.length > 1) {
      const newItems = equipmentItems.filter((_, i) => i !== index);
      setEquipmentItems(newItems);
      setValue('equipmentItems', newItems.filter(item => item.trim()));
    }
  };

  const updateEquipmentItem = (index: number, value: string) => {
    const newItems = [...equipmentItems];
    newItems[index] = value;
    setEquipmentItems(newItems);
    setValue('equipmentItems', newItems.filter(item => item.trim()));
  };

  const addExtra = () => {
    if (newExtra.trim()) {
      const newExtras = [...extras, newExtra.trim()];
      setExtras(newExtras);
      setValue('extras', newExtras);
      setNewExtra('');
    }
  };

  const removeExtra = (index: number) => {
    const newExtras = extras.filter((_, i) => i !== index);
    setExtras(newExtras);
    setValue('extras', newExtras);
  };

  const onSubmit = async (data: QuoteFormData) => {
    setLoading(true);
    try {
      const response = await AIService.rentalQuote(
        data.equipmentItems,
        data.rentalDays,
        data.location,
        data.includeInsurance,
        data.extras
      );
      setResult(response);
      onResult?.(response);
    } catch (error) {
      console.error('Quote error:', error);
      alert('Erro ao gerar cotação. Verifique se o servidor Genkit está rodando.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-950/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Cotação de Aluguel
          </CardTitle>
          <CardDescription>
            Gere uma cotação profissional com breakdown detalhado e recomendações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Equipamentos</Label>
              {equipmentItems.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) => updateEquipmentItem(index, e.target.value)}
                    placeholder={`Ex: Câmera Sony A7IV`}
                    className="flex-1"
                  />
                  {equipmentItems.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeEquipmentItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEquipmentItem}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Equipamento
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rentalDays">Dias de Aluguel</Label>
                <Input
                  id="rentalDays"
                  type="number"
                  {...register('rentalDays')}
                  min={1}
                  max={365}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Local de Retirada</Label>
                <Input
                  id="location"
                  {...register('location')}
                  placeholder="Ex: São Paulo"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeInsurance"
                  {...register('includeInsurance')}
                />
                <Label htmlFor="includeInsurance">Incluir seguro adicional</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Serviços Adicionais</Label>
              <div className="flex gap-2">
                <Input
                  value={newExtra}
                  onChange={(e) => setNewExtra(e.target.value)}
                  placeholder="Ex: Transporte, Operador, Edição..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExtra())}
                />
                <Button type="button" variant="outline" onClick={addExtra}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {extras.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {extras.map((extra, index) => (
                    <div key={index} className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-md text-sm">
                      {extra}
                      <button
                        type="button"
                        onClick={() => removeExtra(index)}
                        className="text-zinc-400 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Gerar Cotação
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-zinc-800 bg-zinc-950/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-500" />
              Cotação Gerada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-primary">{result.totalCost}</div>
              <div className="text-sm text-zinc-400">Custo Total Estimado</div>
            </div>

            <div>
              <h4 className="font-semibold text-primary mb-2">Breakdown de Custos</h4>
              <div className="space-y-2">
                {result.breakdown.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded">
                    <span className="text-sm">{item.item}</span>
                    <span className="font-semibold text-primary">{item.cost}</span>
                  </div>
                ))}
              </div>
            </div>

            {result.recommendedUpgrades.length > 0 && (
              <div>
                <h4 className="font-semibold text-primary mb-2">Upgrades Recomendados</h4>
                <ul className="space-y-1 text-sm">
                  {result.recommendedUpgrades.map((upgrade: string, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                      {upgrade}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-zinc-900/50 p-4 rounded-lg">
              <h4 className="font-semibold text-primary mb-2">Observações Comerciais</h4>
              <p className="text-sm text-zinc-300">{result.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}