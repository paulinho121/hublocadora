import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  equipmentId: string;
  className?: string;
}

export function FavoriteButton({ equipmentId, className }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, isPending } = useFavorites();
  const active = isFavorite(equipmentId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    toggleFavorite(equipmentId);
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      disabled={isPending}
      onClick={handleClick}
      className={cn(
        "relative h-10 w-10 rounded-xl backdrop-blur-md border transition-all duration-500 overflow-hidden",
        active 
          ? "bg-primary/20 border-primary/30 text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]" 
          : "bg-black/40 border-white/10 text-zinc-400 hover:text-white hover:bg-black/60",
        className
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={active ? 'active' : 'inactive'}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.2, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Heart 
            className={cn(
              "h-5 w-5 transition-colors", 
              active ? "fill-current" : "fill-none"
            )} 
          />
        </motion.div>
      </AnimatePresence>

      {/* Ripple effect on click */}
      {isPending && (
        <motion.div 
          layoutId="ripple"
          className="absolute inset-0 bg-primary/20 animate-ping"
        />
      )}
    </Button>
  );
}
