import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RentalContract } from '@/lib/contract';

/**
 * Contratos que o usuário pode ver (RLS: os que ele assina como cliente e os da locadora dele).
 * Sem a migração V46 a tabela não existe: devolve lista vazia e o app segue sem contrato.
 */
export function useContracts() {
  const { user } = useAuth();

  return useQuery<RentalContract[]>({
    queryKey: ['rental-contracts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_contracts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('[CineHub] Contratos indisponíveis:', error.message);
        return [];
      }
      return (data ?? []) as RentalContract[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

/** Locadora: envia a via assinada no papel e marca o contrato como assinado (V47) */
export function useRegisterPaperSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { contract: RentalContract; file: File; signedDate: string; registeredBy: string }) => {
      const { contract, file } = input;
      const ext = (file.name.split('.').pop() || file.type.split('/')[1] || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${contract.company_id}/${contract.id}/via-assinada-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('contracts')
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) throw upErr;

      const { data, error } = await supabase.rpc('register_paper_signature', {
        p_contract_id: contract.id,
        p_file_path: path,
        p_signed_date: input.signedDate,
        p_registered_by_name: input.registeredBy,
      });
      if (error) throw error;
      return data as RentalContract;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-contracts'] });
    },
  });
}

/**
 * Link temporário (10 min) para abrir a via assinada no papel. Buscado antes do toque:
 * no PWA do iOS, abrir uma aba depois de um await é bloqueado.
 */
export function usePaperCopyUrl(path?: string | null) {
  return useQuery({
    queryKey: ['rental-contract-file', path],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('contracts').createSignedUrl(path!, 600);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: 5 * 60_000,
  });
}

export function useSignContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { contractId: string; name: string; document: string; content: string }) => {
      const { data, error } = await supabase.rpc('sign_rental_contract', {
        p_contract_id: input.contractId,
        p_signer_name: input.name,
        p_signer_document: input.document,
        p_content: input.content,
        p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });
      if (error) throw error;
      return data as RentalContract;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-contracts'] });
    },
  });
}
