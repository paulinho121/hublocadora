import { ai } from '../genkit.js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

/**
 * Tool: Busca equipamentos no banco com base em uma query semântica
 */
export const searchEquipmentsTool = ai.defineTool(
  {
    name: 'searchEquipments',
    description: 'Busca equipamentos disponíveis no catálogo do CineHub por categoria ou nome.',
    inputSchema: z.object({
      query: z.string().describe('Termo de busca ou categoria (ex: camera, lente, iluminacao)'),
    }),
    outputSchema: z.array(z.any()),
  },
  async ({ query }) => {
    const { data, error } = await supabase
      .from('equipments')
      .select('*')
      .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
      .eq('status', 'available')
      .limit(5);

    if (error) throw error;
    return data || [];
  }
);
