import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Equipment } from "@/types/database";
import { Edit2, Trash2, Package, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface InventoryCardProps {
  item: Equipment;
  onEdit: (item: Equipment) => void;
  onDelete: (id: string) => void;
}

export function InventoryCard({ item, onEdit, onDelete }: InventoryCardProps) {
  const navigate = useNavigate();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'rented': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'maintenance': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    }
  };

  const imageUrl = item.images && item.images.length > 0 ? item.images[0] : null;

  return (
    <Card className="group relative overflow-hidden bg-zinc-950/40 border-zinc-800/50 hover:border-primary/30 transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {/* Item Image or Placeholder */}
      <div 
        className="relative h-32 w-full overflow-hidden bg-zinc-900 flex items-center justify-center cursor-pointer"
        onClick={() => navigate(`/equipment/${item.id}`)}
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={item.name} 
            className="w-full h-full object-contain p-3 transition-all duration-500"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-700">
            <Package className="h-12 w-12" />
            <span className="text-[10px] uppercase font-bold tracking-widest">Sem imagem</span>
          </div>
        )}
        
        <Badge 
          variant="outline" 
          className={`absolute top-3 right-3 text-[10px] uppercase font-black px-2 py-1 backdrop-blur-md ${getStatusColor(item.status)}`}
        >
          {item.status}
        </Badge>
      </div>

      <CardContent className="p-5">
        <div className="mb-4">
          <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-1">{item.category}</p>
          <h3 
            className="font-bold text-lg leading-tight truncate group-hover:text-primary transition-colors cursor-pointer"
            onClick={() => navigate(`/equipment/${item.id}`)}
          >
            {item.name}
          </h3>
        </div>

        <div className="flex items-end justify-between mt-auto">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-0.5">Taxa Diária</p>
            <div className="text-xl font-black tracking-tighter text-zinc-100">
              {formatCurrency(item.daily_rate)}
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest ml-1">/ dia</span>
            </div>
            <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest mt-1">Estoque: {item.stock_quantity || 0} un</p>
          </div>

          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onEdit(item)} 
              className="h-8 w-8 hover:bg-primary/20 hover:text-primary transition-colors"
              title="Editar"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onDelete(item.id)}
              className="h-8 w-8 hover:bg-destructive/10 text-zinc-600 hover:text-destructive transition-colors"
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Reveal Overlay (optional, but nice) */}
        <div className="mt-4 pt-4 border-t border-zinc-900 hidden group-hover:block animate-in fade-in slide-in-from-top-2 duration-300">
           <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-[10px] uppercase font-bold h-8 gap-1.5 border-zinc-800 hover:bg-zinc-900"
            onClick={() => navigate(`/equipment/${item.id}`)}
           >
             <Info className="h-3 w-3" /> Ver Detalhes
           </Button>
        </div>
      </CardContent>
    </Card>
  );
}
