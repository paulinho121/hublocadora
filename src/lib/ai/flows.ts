import { z } from 'zod';
import { ai } from '../genkit.js';
import { searchEquipmentsTool } from './tools.js';

/**
 * 1. Flow de Match de Equipamento: Sugere itens com base na necessidade do projeto
 */
export const bookingMatchFlow = ai.defineFlow(
  {
    name: 'bookingMatchFlow',
    inputSchema: z.string().describe('Descrição do projeto de filmagem'),
    outputSchema: z.object({
      suggestion: z.string(),
      recommendedItems: z.array(z.string()),
      justification: z.string()
    }),
  },
  async (projectDesc) => {
    const { text } = await ai.generate({
      prompt: `Aja como um consultor técnico de locadora de câmeras profissional. 
      Analise o projeto: "${projectDesc}" e sugira os equipamentos ideais.
      Use a ferramenta searchEquipments para encontrar o que temos disponível.`,
      tools: [searchEquipmentsTool],
    });

    // Como o output é estruturado via Zod, o Genkit tenta parsear ou você pode usar force json
    // Aqui usaremos um prompt simples para facilitar a demonstração
    return {
      suggestion: text,
      recommendedItems: [], // A IA preencheria isso se usássemos structured outputs
      justification: "Baseado na complexidade de iluminação e profundidade de campo solicitada."
    };
  }
);

/**
 * 2. Flow de Manutenção: Analisa estado de retorno do equipamento
 */
export const maintenanceAnalysisFlow = ai.defineFlow(
  {
    name: 'maintenanceAnalysisFlow',
    inputSchema: z.object({
      equipmentName: z.string(),
      reportText: z.string(),
    }),
    outputSchema: z.object({
      status: z.enum(['ok', 'attention', 'urgent_maintenance']),
      recommendation: z.string()
    }),
  },
  async ({ equipmentName, reportText }) => {
    const { output } = await ai.generate({
      prompt: `Analise o seguinte relatório de devolução do equipamento ${equipmentName}: "${reportText}".
      Determine se ele precisa de manutenção e qual a gravidade.`,
      output: {
        schema: z.object({
          status: z.enum(['ok', 'attention', 'urgent_maintenance']),
          recommendation: z.string()
        })
      }
    });
    return output!;
  }
);

/**
 * 3. Flow de Logística: Otimiza tipo de transporte
 */
export const logisticsOptimizerFlow = ai.defineFlow(
  {
    name: 'logisticsOptimizerFlow',
    inputSchema: z.array(z.string()).describe('Lista de nomes de equipamentos'),
    outputSchema: z.object({
      vehicleType: z.enum(['moto', 'carro_passeio', 'utilitario_van']),
      packingAdvice: z.string()
    }),
  },
  async (items) => {
    const { output } = await ai.generate({
      prompt: `Com base nessa lista de equipamentos: ${items.join(', ')}. 
      Escolha o melhor veículo para transporte considerando fragilidade e tamanho médio desses itens de cinema.`,
      output: {
        schema: z.object({
          vehicleType: z.enum(['moto', 'carro_passeio', 'utilitario_van']),
          packingAdvice: z.string()
        })
      }
    });
    return output!;
  }
);

/**
 * 4. Flow de Catálogo: Gera decrição vendedora para novos itens
 */
export const catalogGeneratorFlow = ai.defineFlow(
  {
    name: 'catalogGeneratorFlow',
    inputSchema: z.string().describe('Nome/Modelo do equipamento'),
    outputSchema: z.object({
      title: z.string(),
      description: z.string(),
      tags: z.array(z.string())
    }),
  },
  async (modelName) => {
    const { output } = await ai.generate({
      prompt: `Gere um título e uma descrição técnica vendedora para o equipamento: ${modelName}. 
      Foque em diretores de fotografia e produtores.`,
      output: {
        schema: z.object({
          title: z.string(),
          description: z.string(),
          tags: z.array(z.string())
        })
      }
    });
    return output!;
  }
);
