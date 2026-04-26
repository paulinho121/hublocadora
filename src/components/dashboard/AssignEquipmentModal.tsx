import { useState } from 'react';
import { useBranches } from '@/hooks/useBranches';
import { useUpdateEquipment } from '@/hooks/useEquipments';
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
            // Se a branch tiver um invite_token aceito e virou uma company,
            // poderíamos pegar o company_id real dela. 
            // Por enquanto, vamos usar a lógica de vincular à unidade física.
            
            // 1. Atualiza a localização base no equipamento
            const branch = branches?.find(b => b.id === selectedBranchId);
            await updateMutation.mutateAsync({ 
                id: equipment.id, 
                location_base: branch?.name || equipment.location_base 
            });

            // 2. Se o sistema evoluir para sub-locação formal entre empresas,
            // aqui poderíamos setar o subrental_company_id.
            
            alert(`Equipamento atribuído à unidade ${branch?.name} com sucesso!`);
            onClose();
        } catch (error) {
            alert('Erro ao atribuir equipamento');
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
