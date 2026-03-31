import { useState } from 'react';
import { 
  Plus, 
  Tag, 
  X, 
  Check, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useCategories, useCreateCategory } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export function CategoryManagement() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setError('');

    try {
      const slug = newName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      
      await createCategory.mutateAsync({
        name: newName,
        slug: slug,
        description: null
      });
      setNewName('');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar categoria');
    }
  };

  return (
    <div className="space-y-8 py-4">
      <div className="space-y-4">
        <Label className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Adicionar Nova Categoria</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <Input 
              placeholder="Ex: Energia, Estabilização..." 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="pl-10 h-12 bg-zinc-950 border-zinc-900 rounded-xl font-bold"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <Button 
            onClick={handleAdd}
            disabled={createCategory.isPending || !newName.trim()}
            className="h-12 px-6 rounded-xl font-black uppercase italic"
          >
            {createCategory.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar'}
          </Button>
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>

      <div className="space-y-4">
        <Label className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Categorias Atuais</Label>
        <div className="flex flex-wrap gap-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-zinc-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest">Sincronizando...</span>
            </div>
          ) : (
            categories?.map((cat) => (
              <Badge 
                key={cat.id} 
                variant="outline" 
                className="h-10 px-4 rounded-xl border-zinc-900 bg-zinc-950 text-zinc-100 flex items-center gap-2 hover:bg-zinc-900 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-primary/40" />
                <span className="font-bold uppercase italic tracking-tight text-xs">{cat.name}</span>
              </Badge>
            ))
          )}
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-zinc-900 bg-zinc-950/50 flex gap-4">
        <AlertCircle className="w-5 h-5 text-zinc-700 flex-shrink-0" />
        <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
          Apenas usuários com nível de <span className="text-primary font-bold">Admin</span> podem visualizar e gerenciar as categorias globais do sistema CineHub.
        </p>
      </div>
    </div>
  );
}
