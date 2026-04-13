import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';

/**
 * Instância global do Genkit para o CineHub.
 * Configurada para usar o Google AI (Gemini) com chaves de ambiente.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      // Tenta ler do Vite (import.meta) ou do Node (process.env)
      apiKey: import.meta.env?.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-1.5-flash', // Atualizado para a versão estável 1.5
});

/**
 * Exemplo de Flow: Hello
 * Você pode rodar isso para testar a conexão.
 */
export const helloFlow = ai.defineFlow('helloFlow', async (name: string) => {
  const { text } = await ai.generate(`Hello Gemini, meu nome é ${name}.`);
  return text;
});
