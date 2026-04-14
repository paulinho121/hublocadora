import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit';

/**
 * Instância global do Genkit para o CineHub.
 * Configurada para usar o Google AI (Gemini) com chaves de ambiente.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-2.5-flash', 
});

/**
 * Exemplo de Flow: Hello
 * Você pode rodar isso para testar a conexão.
 */
export const helloFlow = ai.defineFlow('helloFlow', async (name: string) => {
  const { text } = await ai.generate(`Hello Gemini, meu nome é ${name}.`);
  return text;
});
