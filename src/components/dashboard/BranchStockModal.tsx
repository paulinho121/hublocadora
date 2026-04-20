import { useState } from 'react';
import { useEquipments } from '@/hooks/useEquipments';
import { useBranchStock } from '@/hooks/useBranchStock';
import { useTenant } from '@/hooks/useTenant';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BranchStockModalProps {
    branchId: string;
    branchName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function BranchStockModal({ branchId, branchName, isOpen, onClose }: BranchStockModalProps) {
    const { tenantId } = useTenant();
    const { data: equipments, isLoading: loadingEquipments } = useEquipments({ companyId: tenantId || undefined });
    const { stock, updateStock } = useBranchStock(branchId);
    const [search, setSearch] = useState('');

    const filteredEquipments = equipments?.filter(e => 
        e.name.toLowerCase().includes(search.toLowerCase())
    );

    const getStockForEquipment = (equipmentId: string) => {
        return stock?.find(s => s.equipment_id === equipmentId)?.quantity || 0;
    };

    const handleUpdateQuantity = async (equipmentId: string, quantity: number) => {
        try {
            await updateStock.mutateAsync({ equipmentId, quantity });
        } catch (error) {
            console.error('Error updating stock:', error);
            alert('Erro ao atualizar estoque');
        }
    };

    return (
        <Dialog 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Estoque: ${branchName}`}
        >
            <div className="space-y-6">
                <div>
                    <p className="text-zinc-500 font-medium text-sm mb-4">
                        Atribua quantidades de equipamentos para esta sub-locadora.
                    </p>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input 
                            placeholder="Buscar equipamento..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-zinc-900/50 border-zinc-800 rounded-xl focus:ring-primary"
                        />
                    </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    <div className="space-y-3 pb-6">
                        {loadingEquipments ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : filteredEquipments?.map((equipment) => {
                            const currentStock = getStockForEquipment(equipment.id);
                            return (
                                <div 
                                    key={equipment.id}
                                    className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl hover:border-zinc-700 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        {equipment.images?.[0] ? (
                                            <img 
                                                src={equipment.images[0]} 
                                                alt={equipment.name}
                                                className="h-12 w-12 rounded-xl object-cover border border-zinc-800"
                                            />
                                        ) : (
                                            <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                                                <Package className="h-6 w-6 text-zinc-500" />
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-bold text-sm uppercase tracking-tight">{equipment.name}</h4>
                                            <Badge variant="outline" className="text-[9px] uppercase font-black py-0 px-1.5 border-zinc-700 text-zinc-400">
                                                {equipment.category}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">QTD</span>
                                            <Input 
                                                type="number"
                                                min="0"
                                                defaultValue={currentStock}
                                                className="w-20 bg-zinc-950 border-zinc-800 text-center font-bold"
                                                onBlur={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    if (val !== currentStock) {
                                                        handleUpdateQuantity(equipment.id, val);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="pt-4 border-t border-zinc-900 flex justify-end">
                    <Button onClick={onClose} className="bg-zinc-100 text-black font-black uppercase tracking-widest px-8 hover:bg-white transition-all rounded-xl">
                        Concluído
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
