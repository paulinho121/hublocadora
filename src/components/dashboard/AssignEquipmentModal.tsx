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
    const [quantity, setQuantity] = useState<number>(1);
    const [loading, setLoading] = useState(false);

    const handleAssign = async () => {
        if (!equipment || !selectedBranchId || quantity <= 0) return;

        setLoading(true);
        try {
            const branch = branches?.find(b => b.id === selectedBranchId);
            if (!branch) throw new Error('Unidade não encontrada');

            // 1. Tentar encontrar a EMPRESA vinculada a esta unidade (se for parceiro externo)
            let partnerCompanyId = null;
            if (branch.manager_email) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('company_id')
                    .eq('email', branch.manager_email)
                    .limit(1);
                
                partnerCompanyId = profiles?.[0]?.company_id;
            }

            // 2. Atualiza o vínculo de sub-locação no equipamento (apenas se for externo)
            if (partnerCompanyId) {
                await updateMutation.mutateAsync({ 
                    id: equipment.id, 
                    subrental_company_id: partnerCompanyId
                });
            }

            // 3. MOVIMENTAÇÃO DE ESTOQUE
            // A. Pega a Sede Principal para subtrair
            const mainBranch = branches?.find(b => b.is_main);
            if (mainBranch && mainBranch.id !== selectedBranchId) {
                const { data: currentStock } = await supabase
                    .from('equipment_stock')
                    .select('quantity')
                    .eq('branch_id', mainBranch.id)
                    .eq('equipment_id', equipment.id)
                    .single();

                const currentQty = currentStock?.quantity || 0;
                
                // Subtrai da Sede
                await supabase
                    .from('equipment_stock')
                    .upsert({
                        branch_id: mainBranch.id,
                        equipment_id: equipment.id,
                        quantity: Math.max(0, currentQty - quantity),
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'branch_id,equipment_id' });
            }

            // B. Soma na unidade de destino
            const { data: targetStock } = await supabase
                .from('equipment_stock')
                .select('quantity')
                .eq('branch_id', selectedBranchId)
                .eq('equipment_id', equipment.id)
                .single();

            const targetQty = targetStock?.quantity || 0;

            await supabase
                .from('equipment_stock')
                .upsert({
                    branch_id: selectedBranchId,
                    equipment_id: equipment.id,
                    quantity: targetQty + quantity,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'branch_id,equipment_id' });
            
            alert(`Sucesso! ${quantity} unidade(s) de "${equipment.name}" foram atribuídas a ${branch.name}.`);
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
            title="Atribuir Estoque"
        >
            <div className="space-y-6 py-2">
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Equipamento Selecionado</p>
                        <p className="text-sm font-black text-zinc-100 uppercase">{equipment?.name}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Qtd. a Enviar</p>
                        <input 
                            type="number" 
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            min="1"
                            max={equipment?.stock_quantity || 999}
                            className="bg-zinc-950 border border-zinc-800 rounded-lg w-20 px-3 py-1 text-center font-black text-primary focus:outline-none focus:border-primary/50"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
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
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">
                                            {branch.city} - {branch.state} {branch.is_main && '(Sede)'}
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
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Envio'}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
