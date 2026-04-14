import { z } from 'zod';
import { ai } from '../genkit.js';
import { searchEquipmentsTool } from './tools.js';

const aiAny = ai as any;

/**
 * 1. Flow de Match de Equipamento
 */
export const bookingMatchFlow = aiAny.defineFlow(
  {
    name: 'bookingMatchFlow',
    inputSchema: z.string(),
    outputSchema: z.object({
      suggestion: z.string(),
      recommendedItems: z.array(z.string()),
      justification: z.string()
    }),
  },
  async (projectDesc) => {
    const { output } = await aiAny.generate({
      prompt: `Aja como consultor técnico da CineHub: "${projectDesc}". Use searchEquipmentsTool.`,
      tools: [searchEquipmentsTool],
      output: {
        schema: z.object({
          suggestion: z.string(),
          recommendedItems: z.array(z.string()),
          justification: z.string()
        })
      }
    });
    return output!;
  }
);

/**
 * 2. Flow de Manutenção
 */
export const maintenanceAnalysisFlow = aiAny.defineFlow(
  {
    name: 'maintenanceAnalysisFlow',
    inputSchema: z.object({ equipmentName: z.string(), reportText: z.string() }),
    outputSchema: z.object({
      status: z.enum(['ok', 'attention', 'urgent_maintenance']),
      recommendation: z.string()
    }),
  },
  async ({ equipmentName, reportText }) => {
    const { output } = await aiAny.generate({
      prompt: `Analise o retorno de ${equipmentName}: "${reportText}"`,
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
 * 3. Flow de Logística
 */
export const logisticsOptimizerFlow = aiAny.defineFlow(
  {
    name: 'logisticsOptimizerFlow',
    inputSchema: z.array(z.string()),
    outputSchema: z.object({
      vehicleType: z.enum(['moto', 'carro_passeio', 'utilitario_van']),
      packingAdvice: z.string()
    }),
  },
  async (items) => {
    const { output } = await aiAny.generate({
      prompt: `Veículo para: ${items.join(', ')}`,
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
 * 4. Flow de Catálogo
 */
export const catalogGeneratorFlow = aiAny.defineFlow(
  {
    name: 'catalogGeneratorFlow',
    inputSchema: z.string(),
    outputSchema: z.object({
      title: z.string(),
      description: z.string(),
      tags: z.array(z.string())
    }),
  },
  async (modelName) => {
    const { output } = await aiAny.generate({
      prompt: `Copywriting para: ${modelName}`,
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
 * 5. Flow de Planejamento de Projeto
 */
export const projectGearPlannerFlow = aiAny.defineFlow(
  {
    name: 'projectGearPlannerFlow',
    inputSchema: z.object({
      projectDescription: z.string(),
      productionType: z.string(),
      budget: z.string(),
      shootingDays: z.number().min(1)
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
  async (input) => {
    const { output } = await aiAny.generate({
      prompt: `Planejamento cirúrgico: ${JSON.stringify(input)}. Use searchEquipmentsTool.`,
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
 * 6. Flow de Cotação de Aluguel
 */
export const rentalQuoteFlow = aiAny.defineFlow(
  {
    name: 'rentalQuoteFlow',
    inputSchema: z.object({
      equipmentItems: z.array(z.string()),
      rentalDays: z.number().min(1),
      location: z.string(),
      includeInsurance: z.boolean(),
      extras: z.array(z.string()).optional()
    }),
    outputSchema: z.object({
      totalCost: z.string(),
      breakdown: z.array(z.object({ item: z.string(), cost: z.string() })),
      recommendedUpgrades: z.array(z.string()),
      notes: z.string()
    })
  },
  async (input) => {
    const { output } = await aiAny.generate({
      prompt: `Cotação estratégica: ${JSON.stringify(input)}`,
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
 * 7. Flow de Disponibilidade
 */
export const availabilityAdvisorFlow = aiAny.defineFlow(
  {
    name: 'availabilityAdvisorFlow',
    inputSchema: z.object({
      startDate: z.string(),
      endDate: z.string(),
      projectType: z.string(),
      priority: z.enum(['custo', 'qualidade', 'tempo'])
    }),
    outputSchema: z.object({
      availableEquipment: z.array(z.string()),
      substituteEquipment: z.array(z.string()),
      urgency: z.string(),
      recommendation: z.string()
    })
  },
  async (input) => {
    const { output } = await aiAny.generate({
      prompt: `Disponibilidade e substitutos: ${JSON.stringify(input)}. Use searchEquipmentsTool.`,
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
 * 8. Flow de Follow-up
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
  async (input) => {
    const { output } = await aiAny.generate({
      prompt: `Follow-up persuasivo: ${JSON.stringify(input)}`,
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

/**
 * 9. Flow de Análise de Roteiro (Revolutionary Tier)
 */
export const script2GearFlow = aiAny.defineFlow(
  {
    name: 'script2GearFlow',
    inputSchema: z.string(),
    outputSchema: z.object({
      extractedScenes: z.array(z.object({
        sceneNumber: z.string(),
        setting: z.string(),
        lightingMood: z.string()
      })),
      suggestedKit: z.object({
        cameraPackage: z.array(z.string()),
        lensesPackage: z.array(z.string()),
        lightingPackage: z.array(z.string()),
        gripPackage: z.array(z.string())
      }),
      rationale: z.string()
    })
  },
  async (scriptText) => {
    const { output } = await aiAny.generate({
      prompt: `Você é o Diretor Técnico da CineHub. Analise rigorosamente este roteiro: "${scriptText}"
      REGRAS:
      1. Idioma: Português.
      2. Schema: Sugira pacotes reais usando searchEquipmentsTool. 
      3. Divida o suggestedKit em: cameraPackage, lensesPackage, lightingPackage, gripPackage.`,
      tools: [searchEquipmentsTool],
      output: {
        schema: z.object({
          extractedScenes: z.array(z.object({
            sceneNumber: z.string(),
            setting: z.string(),
            lightingMood: z.string()
          })),
          suggestedKit: z.object({
            cameraPackage: z.array(z.string()),
            lensesPackage: z.array(z.string()),
            lightingPackage: z.array(z.string()),
            gripPackage: z.array(z.string())
          }),
          rationale: z.string()
        })
      }
    });
    return output!;
  }
);

/**
 * 10. Flow de Engenharia de Compatibilidade
 */
export const techCompatibilityFlow = aiAny.defineFlow(
  {
    name: 'techCompatibilityFlow',
    inputSchema: z.object({ mainItem: z.string(), accessories: z.array(z.string()) }),
    outputSchema: z.object({
      isCompatible: z.boolean(),
      conflicts: z.array(z.string()),
      missingParts: z.array(z.string()),
      techNote: z.string()
    })
  },
  async (input) => {
    const { output } = await aiAny.generate({
      prompt: `Compatibilidade: ${JSON.stringify(input)}.`,
      output: {
        schema: z.object({
          isCompatible: z.boolean(),
          conflicts: z.array(z.string()),
          missingParts: z.array(z.string()),
          techNote: z.string()
        })
      }
    });
    return output!;
  }
);
