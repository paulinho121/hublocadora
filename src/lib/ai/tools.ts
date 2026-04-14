import { ai } from '../genkit.js';
import { supabase } from '../supabase.js';
import { z } from 'zod';

const aiAny = ai as any;

/**
 * Tool: Busca equipamentos no banco com base em uma query semântica.
 * Agora utiliza o cliente centralizado e robusto.
 */
export const searchEquipmentsTool = aiAny.defineTool(
  {
    name: 'searchEquipments',
    description: 'Busca equipamentos disponíveis no catálogo do CineHub por categoria ou nome.',
    inputSchema: z.object({
      query: z.string().describe('Termo de busca SIMPLES (ex: camera, lente, iluminacao)'),
    }),
    outputSchema: z.array(z.any()),
  },
  async ({ query }) => {
    console.log(`--- Tool: Searching for "${query}"...`);
    const { data, error } = await supabase
      .from('equipments')
      .select('name, category, daily_price, status')
      .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
      .eq('status', 'available')
      .limit(10);

    if (error) {
      console.error('--- Tool Error:', error);
      return [];
    }
    
    console.log(`--- Tool Result: Found ${data?.length || 0} items.`);
    return data || [];
  }
);
