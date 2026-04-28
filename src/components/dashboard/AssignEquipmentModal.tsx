import { useState } from 'react';
import { useBranches } from '@/hooks/useBranches';
import { useUpdateEquipment } from '@/hooks/useEquipments';
import { supabase } from '@/lib/supabase';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Building2, Check } from 'lucide-react';
import { Equipment } from '@/types/database';

interface AssignEquipmentModalProps {
    equipment: Equipment | null;
    isOpen: boolean;
    onClose: () => void;
}

export function AssignEquipmentModal({ equipment, isOpen, onClose }: AssignEquipmentModalProps) {
    const { branches, isLoading: loadingBranches } = useBranches();
    const updateMutation = useUpdateEquipment();
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAssign = async () => {
        if (!equipment || !selectedBranchId) return;

        setLoading(true);
        try {
            const branch = branches?.find(b => b.id === selectedBranchId);
            if (!branch) throw new Error('Unidade não encontrada');

            // 1. Tentar encontrar a EMPRESA vinculada a esta unidade (se for parceiro externo)
            let partnerCompanyId = null;
            if (branch.manager_email) {
                // Busca o perfil pelo email para pegar o company_id real dele
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('company_id')
                    .eq('email', branch.manager_email)
                    .limit(1);
                
                partnerCompanyId = profiles?.[0]?.company_id;

                if (!partnerCompanyId) {
                    console.warn(`Aviso: Perfil não encontrado para o email ${branch.manager_email}. O item será atribuído à unidade, mas pode não aparecer no inventário remoto da sub-locadora até que o perfil dela seja vinculado.`);
                }
            }

            // 2. Atualiza o equipamento (localização e vínculo de sub-locação)
            await updateMutation.mutateAsync({ 
                id: equipment.id, 
                location_base: branch.name,
                subrental_company_id: partnerCompanyId || null // Crucial para o RLS
            });

            // 3. Garante que o item apareça no ESTOQUE da unidade (importante para filiais)
            await supabase
                .from('equipment_stock')
                .upsert({
                    branch_id: selectedBranchId,
                    equipment_id: equipment.id,
                    quantity: equipment.stock_quantity || 1, // Mantém a quantidade ou assume 1
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'branch_id,equipment_id'
                });
            
            alert(`Equipamento atribuído com sucesso! Agora ele aparecerá no inventário da unidade ${branch.name}.`);
            onClose();
        } catch (error: any) {
            console.error('Erro na atribuição:', error);
            alert(`Erro ao atribuir: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Atribuir à Unidade"
        >
            <div className="space-y-6 py-2">
                <p className="text-zinc-500 text-sm font-medium">
                    Selecione para qual unidade ou sub-locadora este item será enviado. Ele aparecerá no inventário local desta unidade.
                </p>

                <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {loadingBranches ? (
                        <div className="py-10 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        </div>
                    ) : branches?.map(branch => (
                        <button
                            key={branch.id}
                            onClick={() => setSelectedBranchId(branch.id)}
                            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                                selectedBranchId === branch.id 
                                ? 'border-primary bg-primary/10' 
                                : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800">
                                    <Building2 className="h-5 w-5 text-zinc-500" />
                                </div>
                                <div>
                                    <p className="font-black uppercase tracking-tighter text-zinc-200">{branch.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <MapPin className="h-3 w-3 text-zinc-600" />
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                            {branch.city} - {branch.state}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {selectedBranchId === branch.id && (
                                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-black">
                                    <Check className="h-4 w-4 stroke-[4]" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3 pt-4 border-t border-zinc-900">
                    <Button 
                        variant="ghost" 
                        onClick={onClose}
                        className="flex-1 text-zinc-500 font-bold uppercase tracking-widest text-[10px]"
                    >
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleAssign}
                        disabled={loading || !selectedBranchId}
                        className="flex-[2] bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest rounded-xl"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Atribuição'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
