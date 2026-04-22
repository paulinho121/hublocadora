import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Trash2 } from "lucide-react"

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  loading?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar Exclusão",
  description = "Essa ação não pode ser desfeita. Isso excluirá permanentemente o item e removerá os dados de nossos servidores.",
  loading = false
}: ConfirmDeleteModalProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="">
      <div className="flex flex-col items-center text-center space-y-6 pt-4">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 text-destructive border-4 border-destructive/5 animate-pulse">
          <Trash2 className="h-8 w-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-100">{title}</h2>
          <p className="text-zinc-500 text-sm leading-relaxed max-w-xs mx-auto">
            {description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="flex-1 h-12 rounded-xl font-bold uppercase text-xs tracking-widest text-zinc-400 hover:text-zinc-100"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            className="flex-1 h-12 rounded-xl font-black uppercase text-xs tracking-widest bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.2)]"
            disabled={loading}
          >
            {loading ? "Excluindo..." : "Confirmar"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
