import { useState } from 'react';
import { useEquipments } from '@/hooks/useEquipments';
import { useBranchStock } from '@/hooks/useBranchStock';
import { useTenant } from '@/hooks/useTenant';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, Loader2, Save, Info, Settings2, Box } from 'lucide-react';
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
        }
    };

    return (
        <Dialog 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`Configuração de Rede: ${branchName}`}
        >
            <div className="space-y-8 py-2">
                <div className="bg-primary/5 border border-primary/10 p-5 rounded-[2rem] flex gap-4 items-start">
                    <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                        <Settings2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">Logística de Unidade</h4>
                        <p className="text-zinc-500 font-medium text-[11px] leading-relaxed">
                            Defina as quantidades de equipamentos disponíveis nesta filial. As alterações são sincronizadas em tempo real com o inventário global.
                        </p>
                    </div>
                </div>

                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input 
                        placeholder="Pesquisar no catálogo da locadora..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-14 pl-12 bg-zinc-900/40 border-zinc-800 rounded-2xl focus:ring-1 focus:ring-primary/50 placeholder:text-zinc-600 font-bold"
                    />
                </div>

                <div className="max-h-[450px] overflow-y-auto custom-scrollbar pr-3 space-y-3">
                    {loadingEquipments ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Acessando Banco de Dados...</span>
                        </div>
                    ) : filteredEquipments && filteredEquipments.length > 0 ? (
                        filteredEquipments.map((equipment) => {
                            const currentStock = getStockForEquipment(equipment.id);
                            return (
                                <div 
                                    key={equipment.id}
                                    className={cn(
                                        "group flex items-center justify-between p-5 rounded-[2rem] border transition-all duration-300",
                                        currentStock > 0 
                                            ? "bg-zinc-900/40 border-primary/20 ring-1 ring-primary/5" 
                                            : "bg-zinc-900/20 border-zinc-800/50 hover:border-zinc-700"
                                    )}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="relative">
                                            {equipment.images?.[0] ? (
                                                <img 
                                                    src={equipment.images[0]} 
                                                    alt=""
                                                    className="h-14 w-14 rounded-2xl object-cover border border-zinc-800 shadow-2xl"
                                                />
                                            ) : (
                                                <div className="h-14 w-14 rounded-2xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                                    <Package className="h-6 w-6 text-zinc-600" />
                                                </div>
                                            )}
                                            {currentStock > 0 && (
                                                <div className="absolute -top-2 -right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
                                                    <Check className="h-3 w-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div>
                                            <h4 className="font-black text-[13px] uppercase tracking-tight text-zinc-200 mb-1 group-hover:text-white transition-colors">
                                                {equipment.name}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[8px] uppercase font-black py-0 px-1.5 border-zinc-800 text-zinc-500">
                                                    {equipment.category}
                                                </Badge>
                                                <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">
                                                    ID: {equipment.id.slice(0, 8)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 bg-zinc-950/60 p-2 pl-4 rounded-2xl border border-zinc-800/50 group-hover:border-zinc-700 transition-colors">
                                        <div className="flex flex-col items-start mr-2">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Disponível</span>
                                            <span className="text-[10px] font-black text-zinc-400">UNIDADES</span>
                                        </div>
                                        <Input 
                                            type="number"
                                            min="0"
                                            defaultValue={currentStock}
                                            className="w-20 h-10 bg-transparent border-0 text-center font-black text-lg text-primary focus:ring-0"
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
                        <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
                            <Box className="h-12 w-12 text-zinc-800 mb-4" />
                            <h5 className="text-zinc-400 font-black uppercase text-xs mb-2">Catálogo Vazio</h5>
                            <p className="text-zinc-600 text-[10px] font-bold uppercase leading-relaxed max-w-[200px]">
                                Não encontramos equipamentos que correspondam à sua busca.
                            </p>
                        </div>
                    )}
                </div>

                <div className="pt-6 border-t border-zinc-900 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase text-zinc-500 tracking-widest">
                        <Info className="h-3 w-3 text-primary" />
                        <span>Sincronização Ativa</span>
                    </div>
                    <Button 
                        onClick={onClose} 
                        className="bg-zinc-100 text-black font-black uppercase tracking-widest px-10 h-12 rounded-2xl hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20"
                    >
                        Finalizar Ajustes
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
