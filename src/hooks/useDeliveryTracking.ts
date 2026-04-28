import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Tipo que reflete nossa tabela 'deliveries' do banco de dados
export type DeliveryTracking = {
  id: string;
  booking_id: string;
  driver_name: string;
  driver_phone: string;
  status: 'preparing' | 'in_transit' | 'delivered' | 'cancelled';
  current_lat: number | null;
  current_lng: number | null;
  estimated_arrival: string | null;
  updated_at: string;
};

export function useDeliveryTracking(bookingId: string | null) {
  const [delivery, setDelivery] = useState<DeliveryTracking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Função para buscar o estado inicial
    async function fetchInitialDelivery() {
      try {
        setLoading(true);
        const { data, error: sbError } = await supabase
          .from('deliveries')
          .select('*')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (sbError) throw sbError;
        if (isMounted && data && data.length > 0) setDelivery(data[0]);
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchInitialDelivery();

    // Configurando o Supabase Realtime para escutar mudanças EXATAS nesta delivery
    const channel = supabase
      .channel(`realtime-delivery-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deliveries',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          console.log('Realtime Delivery Update recebido:', payload.new);
          if (isMounted) {
            setDelivery(payload.new as DeliveryTracking);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  return { delivery, loading, error };
}
