import { supabase } from '@/lib/supabase';

export class AISuggestionService {
    static async getSuggestedKit(mainEquipmentName: string, category: string) {
        try {
            const { data, error } = await supabase.functions.invoke('ai-suggestion', {
                body: { mainEquipmentName, category },
            });

            if (error) {
                console.error("AISuggestion Error:", error);
                return [];
            }

            return data;
        } catch (error) {
            console.error("AISuggestion Exception:", error);
            return [];
        }
    }
}
