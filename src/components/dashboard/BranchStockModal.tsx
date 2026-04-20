import { useState } from 'react';
import { useEquipments } from '@/hooks/useEquipments';
import { useBranchStock } from '@/hooks/useBranchStock';
import { useTransfers } from '@/hooks/useTransfers';
import { useTenant } from '@/hooks/useTenant';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, Loader2, Check, AlertCircle, Settings, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
    const { createTransfer } = useTransfers();
    const [search, setSearch] = useState('');
    const [requestingId, setRequestingId] = useState<string | null>(null);

    const filteredEquipments = equipments?.filter(e => 
        e.name?.toLowerCase().includes(search.toLowerCase())
    ) || [];

    const getStockForEquipment = (equipmentId: string) => {
        return stock?.find(s => s.equipment_id === equipmentId)?.quantity || 0;
    };

    const handleUpdateQuantity = async (equipmentId: string, quantity: number) => {
        try {
            await updateStock.mutateAsync({ equipmentId, quantity });
        } catch (error) {
            console.error('Error updating stock:', error);
        }
    };

    const handleRequestTransfer = async (equipmentId: string) => {
        setRequestingId(equipmentId);
        try {
            await createTransfer.mutateAsync({
                requesterBranchId: branchId,
                equipmentId,
                quantity: 1 // Default to 1, could be a prompt
            });
            alert('Solicitação enviada ao Master com sucesso!');
        } catch (error) {
            alert('Erro ao enviar solicitação');
        } finally {
            setRequestingId(null);
        }
    };

    return (
        <Dialog 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Estoque: ${branchName}`}
        >
            <div className="space-y-6 py-2">
                <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex gap-3 items-start">
                    <Settings className="h-5 w-5 text-primary shrink-0 mt-1" />
                    <p className="text-zinc-500 font-medium text-[11px] leading-relaxed">
                        Gerencie o estoque local ou <span className="text-primary font-bold">solicite reposição</span> diretamente do HUB caso o item esteja em falta.
                    </p>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input 
                        placeholder="Pesquisar equipamentos..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-12 pl-12 bg-zinc-900/40 border-zinc-800 rounded-xl focus:ring-primary"
                    />
                </div>

                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {loadingEquipments ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
                            <span className="text-[10px] font-black uppercase text-zinc-600">Carregando...</span>
                        </div>
                    ) : filteredEquipments.length > 0 ? (
                        filteredEquipments.map((equipment) => {
                            const currentStock = getStockForEquipment(equipment.id);
                            return (
                                <div 
                                    key={equipment.id}
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-2xl border transition-all",
                                        currentStock > 0 ? "bg-zinc-900/40 border-primary/20" : "bg-zinc-900/10 border-zinc-800/50"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative h-12 w-12 shrink-0">
                                            {equipment.images?.[0] ? (
                                                <img 
                                                    src={equipment.images[0]} 
                                                    alt=""
                                                    className="h-full w-full rounded-xl object-cover border border-zinc-800"
                                                />
                                            ) : (
                                                <div className="h-full w-full rounded-xl bg-zinc-800 flex items-center justify-center">
                                                    <Package className="h-5 w-5 text-zinc-600" />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-xs uppercase truncate text-zinc-200">
                                                {equipment.name}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[8px] uppercase font-black px-1.5 py-0 border-zinc-800 text-zinc-500">
                                                    {equipment.category}
                                                </Badge>
                                                {currentStock === 0 && (
                                                    <button 
                                                        disabled={requestingId === equipment.id}
                                                        onClick={() => handleRequestTransfer(equipment.id)}
                                                        className="flex items-center gap-1 text-[8px] font-black uppercase text-primary hover:text-primary/80 transition-colors"
                                                    >
                                                        <Truck className="h-2 w-2" />
                                                        {requestingId === equipment.id ? 'Solicitando...' : 'Solicitar Reposição'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
                                        <span className="text-[9px] font-black uppercase text-zinc-600 ml-2">QTD</span>
                                        <Input 
                                            type="number"
                                            min="0"
                                            defaultValue={currentStock}
                                            className="w-16 h-8 bg-transparent border-0 text-center font-black text-primary focus:ring-0 p-0"
                                            onBlur={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                if (val !== currentStock) {
                                                    handleUpdateQuantity(equipment.id, val);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-10 text-center">
                            <p className="text-zinc-600 text-[10px] font-bold uppercase">Nenhum item encontrado</p>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-zinc-900 flex justify-end">
                    <Button 
                        onClick={onClose} 
                        className="bg-zinc-100 text-black font-black uppercase tracking-widest px-8 h-12 rounded-xl hover:bg-white transition-all"
                    >
                        Concluído
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
