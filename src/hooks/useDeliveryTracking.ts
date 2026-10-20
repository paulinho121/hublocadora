import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Tipo que reflete nossa tabela 'deliveries' do banco de dados
export type DeliveryTracking = {
  id: string;
  booking_id: string;
  driver_name: string;
  driver_phone: string;
  status: 'pending' | 'picking' | 'ready' | 'shipped' | 'delivered' | 'confirmed' | 'cancelled';
  current_lat: number | null;
  current_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
  location_updated_at: string | null;
  estimated_arrival: string | null;
  updated_at: string;
  booking?: { delivery_address: string | null } | null;
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
          .select('*, booking:bookings(delivery_address)')
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
          // O payload do Realtime não traz o join com bookings — preserva o anterior
          if (isMounted) {
            setDelivery(prev => ({ ...(payload.new as DeliveryTracking), booking: prev?.booking }));
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
