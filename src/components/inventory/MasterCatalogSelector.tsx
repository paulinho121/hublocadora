import { useState } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  ChevronRight,
  Info,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useMasterCatalog, useCreateEquipment, useEquipments, useUpdateEquipment } from '@/hooks/useEquipments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MasterCatalog } from '@/types/database';
import { motion, AnimatePresence } from 'framer-motion';

interface MasterCatalogSelectorProps {
  companyId: string;
  onSuccess?: () => void;
}

export function MasterCatalogSelector({ companyId, onSuccess }: MasterCatalogSelectorProps) {
  const { data: catalog, isLoading } = useMasterCatalog();
  const { data: userInventory } = useEquipments({ companyId });
  const createEquipment = useCreateEquipment(companyId);
  const updateEquipment = useUpdateEquipment();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<MasterCatalog | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [dailyRate, setDailyRate] = useState(0);

  // Check if selected item already exists in inventory
  const existingItem = selectedItem 
    ? userInventory?.find(e => e.master_item_id === selectedItem.id)
    : null;

  const filteredCatalog = catalog?.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = async () => {
    if (!selectedItem) return;

    try {
      if (existingItem) {
        // Mode: Update/Increment Existing
        await updateEquipment.mutateAsync({
          id: existingItem.id,
          stock_quantity: existingItem.stock_quantity + quantity,
          daily_rate: dailyRate || existingItem.daily_rate // Use new rate if provided
        });
      } else {
        // Mode: New Creation
        await createEquipment.mutateAsync({
          name: selectedItem.name,
          category: selectedItem.category,
          description: selectedItem.description,
          images: [selectedItem.image_url],
          daily_rate: dailyRate,
          stock_quantity: quantity,
          condition: 'excellent',
          status: 'available',
          features: { brand: selectedItem.brand },
          master_item_id: selectedItem.id
        });
      }

      setSelectedItem(null);
      setQuantity(1);
      setDailyRate(0);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error adding equipment:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Carregando Catálogo Master...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <Input 
          placeholder="Buscar equipamentos Aputure, Amaran..." 
          className="pl-12 h-14 bg-zinc-950 border-zinc-800 text-lg rounded-2xl focus:ring-primary/50"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCatalog?.map((item) => (
          <motion.div 
            key={item.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedItem(item)}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              selectedItem?.id === item.id 
                ? 'border-primary bg-primary/5 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]' 
                : 'border-zinc-900 bg-zinc-950 hover:border-zinc-700'
            }`}
          >
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0">
              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-tighter bg-zinc-900 px-2 py-0.5 rounded text-zinc-400">
                  {item.brand}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-tighter text-primary">
                  {item.category}
                </span>
              </div>
              <h4 className="font-bold text-zinc-100 truncate italic tracking-tight">{item.name}</h4>
              <p className="text-xs text-zinc-500 line-clamp-1">{item.description}</p>
            </div>
            <ChevronRight className={`w-5 h-5 ${selectedItem?.id === item.id ? 'text-primary' : 'text-zinc-700'}`} />
          </motion.div>
        ))}
      </div>

      {/* Confirmation Area */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:right-10 md:w-96 z-50 bg-zinc-950/90 backdrop-blur-xl border border-primary/20 p-6 rounded-3xl shadow-2xl space-y-6"
          >
            <div className="flex items-start justify-between">
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-primary">
                  {existingItem ? 'Atualizar Estoque' : selectedItem.name}
                </h3>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">
                  {existingItem ? `Já possui ${existingItem.stock_quantity} un.` : 'Configurar Adição'}
                </p>
              <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)} className="rounded-full">
                <Plus className="w-5 h-5 rotate-45" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {existingItem ? 'Adicionar +' : 'Qtd no Estoque'}
                </Label>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 border-zinc-800 bg-zinc-900 rounded-lg"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    -
                  </Button>
                  <span className="flex-1 text-center font-black text-xl">{quantity}</span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 border-zinc-800 bg-zinc-900 rounded-lg"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Valor Diária (R$)</Label>
                <Input 
                  type="number"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(Number(e.target.value))}
                  className="h-10 bg-zinc-900 border-zinc-800 font-bold"
                />
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3">
              <Info className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-[10px] text-amber-200/80 leading-relaxed font-medium">
                Fotos e descrição serão importadas do catálogo oficial e <span className="font-bold underline text-amber-400">não poderão ser alteradas</span> posteriormente, garantindo a qualidade do marketplace.
              </p>
            </div>

            <Button 
              className={`w-full h-14 rounded-2xl font-black italic uppercase tracking-tighter text-lg shadow-2xl hover:scale-[1.02] active:scale-95 transition-all ${
                existingItem ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'shadow-primary/30'
              }`}
              onClick={handleAdd}
              disabled={createEquipment.isPending || updateEquipment.isPending}
            >
              {createEquipment.isPending || updateEquipment.isPending ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  <Check className="w-6 h-6" />
                  <span>{existingItem ? 'Incrementar Estoque' : 'Adicionar ao Inventário'}</span>
                </div>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredCatalog?.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl">
          <AlertCircle className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-zinc-500 font-bold uppercase tracking-widest">Nenhum equipamento encontrado</h3>
          <p className="text-zinc-600 text-sm mt-2">Tente buscar por termos como "LS 600" ou "Nova".</p>
        </div>
      )}
    </div>
  );
}
