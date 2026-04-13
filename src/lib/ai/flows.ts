import { z } from 'zod';
import { ai } from '../genkit.js';
import { searchEquipmentsTool } from './tools.js';

const aiAny = ai as any;

/**
 * 1. Flow de Match de Equipamento: Sugere itens com base na necessidade do projeto
 */
export const bookingMatchFlow = aiAny.defineFlow(
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
    const { text } = await aiAny.generate({
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
export const maintenanceAnalysisFlow = aiAny.defineFlow(
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
    const { output } = await aiAny.generate({
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
export const logisticsOptimizerFlow = aiAny.defineFlow(
  {
    name: 'logisticsOptimizerFlow',
    inputSchema: z.array(z.string()).describe('Lista de nomes de equipamentos'),
    outputSchema: z.object({
      vehicleType: z.enum(['moto', 'carro_passeio', 'utilitario_van']),
      packingAdvice: z.string()
    }),
  },
  async (items) => {
    const { output } = await aiAny.generate({
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
export const catalogGeneratorFlow = aiAny.defineFlow(
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
    const { output } = await aiAny.generate({
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

/**
 * 5. Flow de Planejamento de Projeto: monta pacote de equipamentos para o briefing.
 */
export const projectGearPlannerFlow = aiAny.defineFlow(
  {
    name: 'projectGearPlannerFlow',
    inputSchema: z.object({
      projectDescription: z.string().describe('Descrição do projeto de filmagem'),
      productionType: z.string().describe('Ex: comercial, curta-metragem, documentário'),
      budget: z.string().describe('Orçamento aproximado do cliente'),
      shootingDays: z.number().min(1).describe('Número de dias de aluguel'),
      locationCity: z.string().optional().describe('Cidade de produção')
    }),
    outputSchema: z.object({
      packageName: z.string(),
      primaryEquipment: z.array(z.string()),
      accessories: z.array(z.string()),
      backupOptions: z.array(z.string()),
      estimatedBudget: z.string(),
      rationale: z.string()
    }),
  },
  async ({ projectDescription, productionType, budget, shootingDays, locationCity }) => {
    const { output } = await aiAny.generate({
      prompt: `Você é um consultor de equipamento para produção audiovisual. Com base no briefing abaixo, monte um pacote ideal para locação e explique a escolha:

Projeto: ${projectDescription}
Tipo de produção: ${productionType}
Orçamento estimado: ${budget}
Dias de filmagem: ${shootingDays}
Local: ${locationCity || 'não especificado'}`,
      tools: [searchEquipmentsTool],
      output: {
        schema: z.object({
          packageName: z.string(),
          primaryEquipment: z.array(z.string()),
          accessories: z.array(z.string()),
          backupOptions: z.array(z.string()),
          estimatedBudget: z.string(),
          rationale: z.string()
        })
      }
    });
    return output!;
  }
);

/**
 * 6. Flow de Cotação de Aluguel: gera preço e opções de upgrade.
 */
export const rentalQuoteFlow = aiAny.defineFlow(
  {
    name: 'rentalQuoteFlow',
    inputSchema: z.object({
      equipmentItems: z.array(z.string()).describe('Lista de equipamentos selecionados'),
      rentalDays: z.number().min(1).describe('Quantidade de dias de aluguel'),
      location: z.string().describe('Local de retirada/entrega'),
      includeInsurance: z.boolean().describe('Se o cliente deseja seguro adicional'),
      extras: z.array(z.string()).optional().describe('Serviços adicionais desejados')
    }),
    outputSchema: z.object({
      totalCost: z.string(),
      breakdown: z.array(z.object({ item: z.string(), cost: z.string() })),
      recommendedUpgrades: z.array(z.string()),
      notes: z.string()
    })
  },
  async ({ equipmentItems, rentalDays, location, includeInsurance, extras }) => {
    const { output } = await aiAny.generate({
      prompt: `Monte uma cotação profissional de aluguel para o seguinte pedido:

Equipamentos: ${equipmentItems.join(', ')}
Dias de aluguel: ${rentalDays}
Local: ${location}
Seguro adicional: ${includeInsurance ? 'Sim' : 'Não'}
Serviços extras: ${extras?.length ? extras.join(', ') : 'Nenhum'}

Inclua um breakdown de custos, upgrades recomendados e observações comerciais.`,
      output: {
        schema: z.object({
          totalCost: z.string(),
          breakdown: z.array(z.object({ item: z.string(), cost: z.string() })),
          recommendedUpgrades: z.array(z.string()),
          notes: z.string()
        })
      }
    });
    return output!;
  }
);

/**
 * 7. Flow de Disponibilidade: sugere equipamentos disponíveis e substitutos.
 */
export const availabilityAdvisorFlow = aiAny.defineFlow(
  {
    name: 'availabilityAdvisorFlow',
    inputSchema: z.object({
      startDate: z.string().describe('Data inicial do projeto'),
      endDate: z.string().describe('Data final do projeto'),
      projectType: z.string().describe('Tipo de produção'),
      priority: z.enum(['custo', 'qualidade', 'tempo']).describe('Prioridade do cliente')
    }),
    outputSchema: z.object({
      availableEquipment: z.array(z.string()),
      substituteEquipment: z.array(z.string()),
      urgency: z.string(),
      recommendation: z.string()
    })
  },
  async ({ startDate, endDate, projectType, priority }) => {
    const { output } = await aiAny.generate({
      prompt: `Analise disponibilidade para um projeto entre ${startDate} e ${endDate} com prioridade ${priority} e tipo ${projectType}.
      Indique quais equipamentos disponíveis do catálogo seriam melhores e sugira substitutos se necessário.`,
      tools: [searchEquipmentsTool],
      output: {
        schema: z.object({
          availableEquipment: z.array(z.string()),
          substituteEquipment: z.array(z.string()),
          urgency: z.string(),
          recommendation: z.string()
        })
      }
    });
    return output!;
  }
);

/**
 * 8. Flow de Follow-up de Cliente: cria mensagem automática de acompanhamento.
 */
export const customerFollowUpFlow = aiAny.defineFlow(
  {
    name: 'customerFollowUpFlow',
    inputSchema: z.object({
      customerName: z.string(),
      bookingSummary: z.string(),
      status: z.enum(['confirmed', 'picked_up', 'returned', 'late'])
    }),
    outputSchema: z.object({
      subject: z.string(),
      body: z.string(),
      callToAction: z.string()
    })
  },
  async ({ customerName, bookingSummary, status }) => {
    const { output } = await aiAny.generate({
      prompt: `Crie um follow-up profissional para o cliente ${customerName} com base no status '${status}' e o seguinte resumo de booking:

${bookingSummary}

Inclua um assunto atraente, corpo claro e um call-to-action.`,
      output: {
        schema: z.object({
          subject: z.string(),
          body: z.string(),
          callToAction: z.string()
        })
      }
    });
    return output!;
  }
);
