import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Mantém pedidos, entregas e prorrogações em tempo real para todo usuário logado.
 *
 * Sem filtro por empresa: o Supabase só entrega os eventos das linhas que o usuário
 * pode ler (RLS) — a locadora recebe os pedidos dela, o cliente os que ele fez.
 * Cada mudança invalida as consultas afetadas; várias mudanças seguidas (ex.: aprovar
 * um pedido cria a entrega) viram uma só atualização.
 *
 * Requer as tabelas na publicação supabase_realtime (V43).
 */

const KEYS_BY_TABLE: Record<string, string[]> = {
  bookings: [
    'bookings', 'all-bookings', 'admin-bookings', 'admin-stats', 'projects',
    'marketplace-active-bookings', 'availability', 'equipment-occupied',
    'reports-bookings', 'network-report-bookings', 'payments-approved',
  ],
  deliveries: ['deliveries', 'bookings', 'projects'],
  booking_extensions: ['booking-extensions', 'booking-extensions-pending', 'bookings'],
};

const BATCH_MS = 300;

export function RealtimeSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const pending = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = (table: string) => {
      KEYS_BY_TABLE[table]?.forEach(k => pending.add(k));
      if (timer) return;
      timer = setTimeout(() => {
        pending.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
        pending.clear();
        timer = null;
      }, BATCH_MS);
    };

    let channel = supabase.channel(`realtime-sync-${user.id}`);
    for (const table of Object.keys(KEYS_BY_TABLE)) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => schedule(table));
    }
    channel.subscribe();

    // Ao voltar para o app (tela bloqueada, troca de aba), busca o que pode ter mudado
    const onVisible = () => {
      if (document.visibilityState === 'visible') Object.keys(KEYS_BY_TABLE).forEach(schedule);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return null;
}
