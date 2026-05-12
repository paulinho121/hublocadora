import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FavoriteService } from '../services/FavoriteService';
import { toast } from 'sonner';

export function useFavorites() {
  const queryClient = useQueryClient();

  // Query to fetch favorites
  const { data: favoriteIds = [], isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => FavoriteService.getMyFavorites(),
  });

  // Mutation to toggle favorite
  const toggleMutation = useMutation({
    mutationFn: (equipmentId: string) => FavoriteService.toggleFavorite(equipmentId),
    onSuccess: (isAdded, equipmentId) => {
      // Optimistic update or refetch
      queryClient.setQueryData(['favorites'], (old: string[] | undefined) => {
        if (!old) return isAdded ? [equipmentId] : [];
        return isAdded 
          ? [...old, equipmentId] 
          : old.filter(id => id !== equipmentId);
      });

      toast.success(isAdded ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
    },
    onError: (error) => {
      console.error('Favorite error:', error);
      toast.error('Erro ao atualizar favoritos');
    }
  });

  const isFavorite = (equipmentId: string) => favoriteIds.includes(equipmentId);

  return {
    favoriteIds,
    isLoading,
    toggleFavorite: toggleMutation.mutate,
    isFavorite,
    isPending: toggleMutation.isPending
  };
}
