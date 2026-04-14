import { z } from 'zod';
import { ai } from '../genkit.js';
import { 
  bookingMatchFlow, 
  projectGearPlannerFlow, 
  rentalQuoteFlow, 
  availabilityAdvisorFlow,
  customerFollowUpFlow,
  script2GearFlow,
  techCompatibilityFlow
} from './flows.js';

const aiAny = ai as any;

const safeJoin = (data: any, separator: string = '\n• ') => {
  if (Array.isArray(data)) return '• ' + data.join(separator);
  if (typeof data === 'object' && data !== null) return '• ' + Object.values(data).join(separator);
  return String(data || 'Nenhum item sugerido');
};

export const masterAssistantFlow = aiAny.defineFlow(
  {
    name: 'masterAssistantFlow',
    inputSchema: z.string(),
    outputSchema: z.object({
      mode: z.enum(['general', 'project', 'quote', 'availability', 'followup', 'scriptAnalysis', 'techCheck']),
      response: z.string(),
      extractedData: z.any().optional()
    }),
  },
  async (userInput: string) => {
    const { output } = await aiAny.generate({
      prompt: `Analise o pedido e decida o modo: "${userInput}"`,
      output: {
        schema: z.object({
          mode: z.enum(['general', 'project', 'quote', 'availability', 'followup', 'scriptAnalysis', 'techCheck']),
          response: z.string().describe('Confirmação amigável'),
          extractedData: z.any().optional()
        })
      }
    });

    let mode = output!.mode || 'general';
    let finalResponse: string = output!.response || 'Processando...';
    
    try {
      if (mode === 'scriptAnalysis') {
        const data = await script2GearFlow(userInput);
        finalResponse = `## 🎬 Análise de Inteligência de Roteiro\n\n` +
                        `### 📍 Contexto das Cenas\n` +
                        `${data.extractedScenes.map((s: any) => `**Cena ${s.sceneNumber} (${s.setting}):** ${s.lightingMood}.`).join('\n')}\n\n` +
                        `--- \n` +
                        `### 🛠️ Pacote de Equipamentos Premium\n\n` +
                        `🎥 **Câmeras:**\n${safeJoin(data.suggestedKit.cameraPackage)}\n\n` +
                        `🔍 **Lentes:**\n${safeJoin(data.suggestedKit.lensesPackage)}\n\n` +
                        `💡 **Iluminação:**\n${safeJoin(data.suggestedKit.lightingPackage)}\n\n` +
                        `🏗️ **Maquinária/Grip:**\n${safeJoin(data.suggestedKit.gripPackage)}\n\n` +
                        `--- \n` +
                        `### 📝 Justificativa Técnica\n${data.rationale}`;
      }
      else if (mode === 'project') {
        const data = await projectGearPlannerFlow({
          projectDescription: userInput,
          productionType: output!.extractedData?.productionType || 'comercial',
          budget: output!.extractedData?.budget || 'Sob consulta',
          shootingDays: output!.extractedData?.shootingDays || 3
        });
        finalResponse = `## 🎥 Planejamento Técnico do Projeto\n\n` +
                        `### ${data.packageName}\n\n` +
                        `**Itens Principais:**\n${safeJoin(data.primaryEquipment)}\n\n` +
                        `**Acessórios:**\n${safeJoin(data.accessories)}\n\n` +
                        `**Investimento:** ${data.estimatedBudget}\n\n` +
                        `**Visão Estratégica:** ${data.rationale}`;
      } 
      else if (mode === 'quote') {
        const data = await rentalQuoteFlow({
          equipmentItems: output!.extractedData?.items || [userInput],
          rentalDays: output!.extractedData?.days || 2,
          location: output!.extractedData?.location || 'São Paulo',
          includeInsurance: true
        });
        finalResponse = `## 💰 Cotação de Aluguel Estimada\n\n` +
                        `### **Total: ${data.totalCost}**\n\n` +
                        `**Breakdown:**\n${safeJoin(data.breakdown.map((b: any) => `${b.item}: ${b.cost}`))}\n\n` +
                        `**Upgrades:** ${safeJoin(data.recommendedUpgrades)}\n\n` +
                        `*${data.notes}*`;
      }
      else if (mode === 'techCheck') {
        const data = await techCompatibilityFlow({
          mainItem: output!.extractedData?.mainItem || userInput,
          accessories: output!.extractedData?.accessories || []
        });
        finalResponse = `## ✅ Engenharia de Compatibilidade\n\n` +
                        `${data.isCompatible ? '✔️ Setup 100% Compatível.' : '⚠️ Possível Incompatibilidade.'}\n\n` +
                        `**Conflitos:** ${safeJoin(data.conflicts)}\n` +
                        `**Faltantes:** ${safeJoin(data.missingParts, ', ', 'Nenhum item em falta')}\n\n` +
                        `**Parecer:** ${data.techNote}`;
      }
      else if (mode === 'general') {
        const match = await bookingMatchFlow(userInput);
        finalResponse = match.suggestion || finalResponse;
      }
    } catch (err) {
      console.error('Erro no orchestrator:', err);
      finalResponse = `Houve um problema técnico no modo ${mode}. Posso ajudar com outra consulta?`;
    }

    return { mode, response: finalResponse, extractedData: output!.extractedData };
  }
);
