import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, Calculator, Calendar, Mail, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AIService } from '@/services/AIService';

const projectSchema = z.object({
  projectDescription: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  productionType: z.string().min(1, 'Selecione o tipo de produção'),
  budget: z.string().min(1, 'Informe o orçamento aproximado'),
  shootingDays: z.coerce.number().min(1, 'Mínimo 1 dia'),
  locationCity: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectPlannerProps {
  onResult?: (result: any) => void;
}

export function ProjectPlanner({ onResult }: ProjectPlannerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema) as any,
    defaultValues: {
      productionType: 'comercial',
      budget: 'R$ 10.000 - R$ 50.000',
      shootingDays: 3,
      locationCity: 'São Paulo',
    },
  });

  const onSubmit = async (data: ProjectFormData) => {
    setLoading(true);
    try {
      const response = await AIService.planProject(
        data.projectDescription,
        data.productionType,
        data.budget,
        data.shootingDays,
        data.locationCity
      );
      setResult(response);
      onResult?.(response);
    } catch (error) {
      console.error('Project planning error:', error);
      alert('Erro ao planejar projeto. Verifique se o servidor Genkit está rodando.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-950/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Planejamento de Projeto
          </CardTitle>
          <CardDescription>
            Descreva seu projeto e receba um pacote completo de equipamentos recomendado pela IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectDescription">Descrição do Projeto</Label>
              <Textarea
                id="projectDescription"
                {...register('projectDescription')}
                placeholder="Ex: Comercial de produto para rede social, focando em close-ups e movimento dinâmico..."
                className="min-h-[100px]"
              />
              {errors.projectDescription && (
                <p className="text-xs text-red-500">{errors.projectDescription.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productionType">Tipo de Produção</Label>
                <Select onValueChange={(value) => setValue('productionType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="documentario">Documentário</SelectItem>
                    <SelectItem value="curta-metragem">Curta-metragem</SelectItem>
                    <SelectItem value="serie">Série/Web</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="corporativo">Corporativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Orçamento Aproximado</Label>
                <Select onValueChange={(value) => setValue('budget', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="R$ 5.000 - R$ 15.000">R$ 5.000 - R$ 15.000</SelectItem>
                    <SelectItem value="R$ 10.000 - R$ 50.000">R$ 10.000 - R$ 50.000</SelectItem>
                    <SelectItem value="R$ 50.000 - R$ 100.000">R$ 50.000 - R$ 100.000</SelectItem>
                    <SelectItem value="R$ 100.000+">R$ 100.000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shootingDays">Dias de Filmagem</Label>
                <Input
                  id="shootingDays"
                  type="number"
                  {...register('shootingDays')}
                  min={1}
                  max={30}
                />
                {errors.shootingDays && (
                  <p className="text-xs text-red-500">{errors.shootingDays.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationCity">Cidade/Local</Label>
                <Input
                  id="locationCity"
                  {...register('locationCity')}
                  placeholder="Ex: São Paulo"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Planejando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Plano de Equipamentos
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
              <Package className="h-5 w-5 text-green-500" />
              Pacote Recomendado: {result.packageName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-primary mb-2">Equipamentos Principais</h4>
              <ul className="space-y-1 text-sm">
                {result.primaryEquipment.map((item: string, index: number) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-primary mb-2">Acessórios</h4>
              <ul className="space-y-1 text-sm">
                {result.accessories.map((item: string, index: number) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full"></div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-primary mb-2">Opções de Backup</h4>
              <ul className="space-y-1 text-sm">
                {result.backupOptions.map((item: string, index: number) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-zinc-900/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-green-500" />
                <span className="font-semibold">Orçamento Estimado: {result.estimatedBudget}</span>
              </div>
              <p className="text-sm text-zinc-300">{result.rationale}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}