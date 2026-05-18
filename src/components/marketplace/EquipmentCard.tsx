import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Camera, ChevronRight, Info } from 'lucide-react';
import { Equipment } from '@/types/database';
import { FavoriteButton } from './FavoriteButton';

interface EquipmentCardProps {
  item: Equipment;
  onClick: () => void;
}

export function EquipmentCard({ item, onClick }: EquipmentCardProps) {
  const navigate = useNavigate();
  const images = item.images ?? [];
  const hasMultiple = images.length > 1;
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!hasMultiple) return;
    timerRef.current = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % images.length);
    }, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [hasMultiple, images.length]);

  const isAvailable = (item.stock_quantity || 0) > 0;
  const dailyRate = item.daily_rate;

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/equipment/${item.id}`);
  };

  return (
    <Card
      className="group overflow-hidden clay-card transition-all duration-500 flex flex-col h-full"
    >
      {/* ── Image area ── */}
      <div
        onClick={handleViewDetails}
        className="relative w-full h-48 overflow-hidden bg-zinc-900/50 shrink-0 cursor-pointer"
      >
        {images.length > 0 ? (
          images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={item.name}
              className={`absolute inset-0 w-full h-full object-contain p-4 transition-all duration-1000 ease-in-out
                ${i === activeIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-110 blur-sm'}`}
            />
          ))
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-800">
            <Camera className="h-16 w-16" />
          </div>
        )}

        {/* Dot indicators */}
        {hasMultiple && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, i) => (
              <span
                key={i}
                className={`block h-1 rounded-full transition-all duration-500 ${i === activeIdx ? 'w-4 bg-primary' : 'w-1 bg-white/20'}`}
              />
            ))}
          </div>
        )}

        {/* Availability badge overlay */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <Badge className={`${isAvailable ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'} uppercase font-black tracking-widest text-[9px] backdrop-blur-md px-2 py-1 rounded-md border`}>
            {isAvailable ? `${item.stock_quantity} No Hub` : 'Esgotado'}
          </Badge>
        </div>

        {/* Favorites button overlay */}
        <div className="absolute top-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
          <FavoriteButton equipmentId={item.id} />
        </div>
        
        {/* Location badge overlay */}
        {item.state_uf && (
          <div className="absolute bottom-4 right-4 z-10">
            <Badge className="bg-zinc-950/60 text-zinc-400 border-white/5 uppercase font-black tracking-widest text-[9px] backdrop-blur-md px-2 py-1 rounded-md border">
              <MapPin className="w-2.5 h-2.5 mr-1" />
              {item.state_uf}
            </Badge>
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-col flex-1 p-5 gap-4">
        <h4
          onClick={handleViewDetails}
          className="text-xs font-black leading-relaxed uppercase tracking-widest group-hover:text-primary transition-colors line-clamp-2 min-h-[2.5rem] cursor-pointer"
        >
          {item.name}
        </h4>

        <div
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="mt-auto flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:bg-primary/5 transition-colors cursor-pointer"
        >
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-zinc-500 font-black tracking-[0.2em] mb-1">Diária</span>
            <div className="text-lg font-display font-black text-white tracking-tighter">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dailyRate)}
            </div>
          </div>
          <Button size="icon" className="h-10 w-10 clay-button-primary transition-all text-white group-hover:-translate-y-0.5">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Ver Detalhes Button - always visible on mobile, hover-only on desktop */}
        <div className="mt-2 pt-2 border-t border-zinc-900 block md:hidden md:group-hover:block animate-in fade-in slide-in-from-top-2 duration-300">
           <Button
            variant="outline"
            size="sm"
            className="w-full text-[10px] uppercase font-bold h-8 gap-1.5 border-zinc-800 hover:bg-zinc-900"
            onClick={handleViewDetails}
           >
             <Info className="h-3 w-3" /> Ver Detalhes
           </Button>
        </div>
      </div>
    </Card>
  );
}
