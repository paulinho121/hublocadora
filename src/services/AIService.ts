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

  async planProject(projectDescription: string, productionType: string, budget: string, shootingDays: number, locationCity?: string) {
    const response = await fetch(`${API_BASE_URL}/project-planner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectDescription, productionType, budget, shootingDays, locationCity }),
    });
    if (!response.ok) throw new Error('Falha ao planejar o projeto.');
    return response.json();
  },

  async rentalQuote(equipmentItems: string[], rentalDays: number, location: string, includeInsurance = false, extras: string[] = []) {
    const response = await fetch(`${API_BASE_URL}/rental-quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipmentItems, rentalDays, location, includeInsurance, extras }),
    });
    if (!response.ok) throw new Error('Falha ao gerar a cotação de aluguel.');
    return response.json();
  },

  async checkAvailability(startDate: string, endDate: string, projectType: string, priority: 'custo' | 'qualidade' | 'tempo') {
    const response = await fetch(`${API_BASE_URL}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, projectType, priority }),
    });
    if (!response.ok) throw new Error('Falha ao verificar disponibilidade.');
    return response.json();
  },

  async generateFollowUp(customerName: string, bookingSummary: string, status: 'confirmed' | 'picked_up' | 'returned' | 'late') {
    const response = await fetch(`${API_BASE_URL}/followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName, bookingSummary, status }),
    });
    if (!response.ok) throw new Error('Falha ao gerar follow-up.');
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
  },

  /**
   * Chat unificado com o Assistente Mestre (Orquestrador)
   */
  async chat(message: string) {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) throw new Error('Falha ao se comunicar com o assistente.');
    return response.json();
  }
};
