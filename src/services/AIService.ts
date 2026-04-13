/**
 * AIService.ts
 * Camada de integração entre o Frontend e o Servidor Genkit Backend.
 */

// Busca a URL do backend via variável de ambiente ou usa o default de desenvolvimento
const API_BASE_URL = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:3001/api/ai';

export const AIService = {
  /**
   * Sugere equipamentos com base na descrição de um projeto.
   */
  async matchEquipment(description: string) {
    const response = await fetch(`${API_BASE_URL}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    if (!response.ok) throw new Error('Falha ao consultar a IA de Match.');
    return response.json();
  },

  /**
   * Gera descrição e título para o catálogo a partir de um modelo.
   */
  async generateCatalog(model: string) {
    const response = await fetch(`${API_BASE_URL}/catalog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    });
    if (!response.ok) throw new Error('Falha ao gerar dados do catálogo.');
    return response.json();
  },

  /**
   * Analisa a logística de transporte para uma lista de itens.
   */
  async optimizeLogistics(items: string[]) {
    const response = await fetch(`${API_BASE_URL}/logistics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!response.ok) throw new Error('Falha ao otimizar logística.');
    return response.json();
  },

  /**
   * Analisa relatório de manutenção.
   */
  async analyzeMaintenance(equipmentName: string, reportText: string) {
    const response = await fetch(`${API_BASE_URL}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipmentName, reportText }),
    });
    if (!response.ok) throw new Error('Falha ao analisar manutenção.');
    return response.json();
  }
};
