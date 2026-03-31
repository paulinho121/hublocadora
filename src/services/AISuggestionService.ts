import { GoogleGenerativeAI } from "@google/generative-ai";

export class AISuggestionService {
    static async getSuggestedKit(mainEquipmentName: string, category: string) {
        try {
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `Sugira 3 itens técnicos essenciais para: ${mainEquipmentName} (${category}). Responda em JSON: [{ "name": "Item", "reason": "Motivo" }]`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return JSON.parse(response.text());
        } catch (error) {
            console.error("AISuggestion Error:", error);
            return [];
        }
    }
}
