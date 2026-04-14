import { describe, it, expect, vi } from 'vitest';
import { bookingMatchFlow, maintenanceAnalysisFlow } from './flows';

// Mock do Genkit
vi.mock('../genkit', () => ({
  ai: {
    defineFlow: vi.fn((config, fn) => {
      return async (input: any) => fn(input);
    }),
    defineTool: vi.fn((config, fn) => {
      return async (input: any) => fn(input);
    }),
    generate: vi.fn().mockResolvedValue({
      text: 'Mocked output',
      output: {
        status: 'ok',
        recommendation: 'Everything is fine'
      }
    }),
  }
}));

describe('AI Flows', () => {
  it('bookingMatchFlow deve retornar estrutura correta', async () => {
    const result = await bookingMatchFlow('Preciso de uma camera para um curta');
    expect(result).toHaveProperty('suggestion');
    expect(result).toHaveProperty('recommendedItems');
  });

  it('maintenanceAnalysisFlow deve retornar status válido', async () => {
    const result = await maintenanceAnalysisFlow({
      equipmentName: 'Sony A7S III',
      reportText: 'Camera em perfeito estado'
    });
    expect(['ok', 'attention', 'urgent_maintenance']).toContain(result.status);
    expect(result.recommendation).toBeDefined();
  });
});
