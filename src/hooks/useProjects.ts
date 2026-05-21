import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Project, ProjectShipment } from '@/types/database';

// ─── Fetch all projects for the logged-in renter ─────────────────────────────

export function useProjects() {
    const { user } = useAuth();

    return useQuery<Project[]>({
        queryKey: ['projects', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('projects')
                .select(`
                    *,
                    bookings!project_id(
                        id, status, start_date, end_date, quantity, total_amount,
                        delivery_method, notes,
                        equipment:equipment_id(id, name, images, daily_rate, state_uf),
                        company:company_id(id, name, logo_url, address_city, address_state),
                        project_shipments!booking_id(*)
                    )
                `)
                .eq('renter_id', user!.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data ?? []) as Project[];
        },
        enabled: !!user,
        staleTime: 30_000,
    });
}

// ─── Create a project record ──────────────────────────────────────────────────

interface CreateProjectInput {
    name: string;
    renter_id: string;
    delivery_method: 'pickup' | 'delivery' | 'mixed';
    delivery_address: string | null;
    delivery_contact: string | null;
    start_date: string;   // used to compute delivery window
    end_date: string;
}

export function useCreateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateProjectInput) => {
            const { data, error } = await supabase
                .from('projects')
                .insert([{
                    renter_id:            input.renter_id,
                    name:                 input.name || 'Projeto via HUB',
                    status:               'pending',
                    delivery_method:      input.delivery_method,
                    delivery_address:     input.delivery_address,
                    delivery_contact:     input.delivery_contact,
                    delivery_window_start: input.start_date,
                    delivery_window_end:   input.end_date,
                }])
                .select()
                .single();

            if (error) throw error;
            return data as { id: string };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}

// ─── Create a shipment record (one per booking) ───────────────────────────────

interface CreateShipmentInput {
    project_id: string;
    booking_id: string;
    company_id: string;
    committed_ship_by?: string | null;
}

export async function createOutboundShipment(input: CreateShipmentInput) {
    const { error } = await supabase
        .from('project_shipments')
        .insert([{
            project_id:        input.project_id,
            booking_id:        input.booking_id,
            company_id:        input.company_id,
            direction:         'outbound',
            status:            'awaiting_approval',
            committed_ship_by: input.committed_ship_by ?? null,
        }]);
    if (error) throw error;
}

// ─── Update shipment (rental house adds tracking / renter confirms receipt) ───

export function useUpdateShipment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            data,
        }: {
            id: string;
            data: Partial<Pick<ProjectShipment,
                'carrier' | 'tracking_code' | 'tracking_url' | 'status'
                | 'estimated_arrival' | 'actual_arrival' | 'notes'
            >>;
        }) => {
            const { error } = await supabase
                .from('project_shipments')
                .update(data)
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}

// ─── Initiate return — creates one return shipment per delivered outbound ─────

export function useInitiateReturn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            projectId,
            items,
        }: {
            projectId: string;
            items: { bookingId: string; companyId: string }[];
        }) => {
            const { error } = await supabase
                .from('project_shipments')
                .insert(
                    items.map(i => ({
                        project_id: projectId,
                        booking_id: i.bookingId,
                        company_id: i.companyId,
                        direction:  'return',
                        status:     'awaiting_approval', // renter must add tracking
                    })),
                );
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
}

// ─── Confirm return — rental house marks item as physically received ───────────

export function useConfirmReturn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            shipmentId,
            bookingId,
            notes,
        }: {
            shipmentId: string;
            bookingId:  string;
            notes?:     string;
        }) => {
            const { error: sErr } = await supabase
                .from('project_shipments')
                .update({
                    status:         'delivered',
                    actual_arrival: new Date().toISOString(),
                    notes:          notes ?? null,
                })
                .eq('id', shipmentId);
            if (sErr) throw sErr;

            // Mark booking as completed once item physically returned
            const { error: bErr } = await supabase
                .from('bookings')
                .update({ status: 'completed' })
                .eq('id', bookingId);
            if (bErr) throw bErr;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['marketplace-active-bookings'] });
        },
    });
}

// ─── Helpers — status labels & colors ────────────────────────────────────────

export const PROJECT_STATUS_LABEL: Record<string, string> = {
    draft:      'Rascunho',
    pending:    'Aguardando aprovação',
    approved:   'Aprovado',
    shipping:   'Em trânsito',
    delivered:  'Entregue — aguardando devolução',
    active:     'Em uso',
    returning:  'Devolvendo',
    completed:  'Concluído',
    cancelled:  'Cancelado',
};

export const PROJECT_STATUS_COLOR: Record<string, string> = {
    draft:      'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    pending:    'bg-amber-500/15 text-amber-400 border-amber-500/30',
    approved:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    shipping:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
    delivered:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
    active:     'bg-primary/15 text-primary border-primary/30',
    returning:  'bg-orange-500/15 text-orange-400 border-orange-500/30',
    completed:  'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    cancelled:  'bg-red-500/15 text-red-400 border-red-500/30',
};

// Labels for outbound direction
export const SHIPMENT_STATUS_LABEL: Record<string, string> = {
    awaiting_approval:  'Aguardando aprovação',
    approved:           'Aprovado',
    label_created:      'Etiqueta criada',
    picked_up:          'Coletado',
    in_transit:         'Em trânsito',
    out_for_delivery:   'Saiu para entrega',
    delivered:          'Entregue',
    failed:             'Falha na entrega',
};

// Labels for return direction (same status codes, different meaning)
export const RETURN_SHIPMENT_STATUS_LABEL: Record<string, string> = {
    awaiting_approval:  'Aguardando envio do locatário',
    approved:           'Preparando envio',
    label_created:      'Etiqueta de retorno criada',
    picked_up:          'Coletado para retorno',
    in_transit:         'Em retorno à locadora',
    out_for_delivery:   'Saiu para entrega na locadora',
    delivered:          'Recebido pela locadora ✓',
    failed:             'Falha no retorno',
};

export const SHIPMENT_STATUS_COLOR: Record<string, string> = {
    awaiting_approval:  'text-zinc-400',
    approved:           'text-emerald-400',
    label_created:      'text-blue-400',
    picked_up:          'text-blue-400',
    in_transit:         'text-blue-400',
    out_for_delivery:   'text-amber-400',
    delivered:          'text-emerald-400',
    failed:             'text-red-400',
};

// ─── Status machine — driven by outbound vs return shipments separately ───────

/** Derives project status from its bookings + shipments */
export function deriveProjectStatus(bookings: Project['bookings']): string {
    if (!bookings || bookings.length === 0) return 'draft';

    const bookingStatuses = bookings.map(b => b.status);
    const allShipments    = bookings.flatMap(b => b.project_shipments ?? []);
    const outbound        = allShipments.filter(s => s.direction === 'outbound');
    const returns         = allShipments.filter(s => s.direction === 'return');

    if (bookingStatuses.some(s => s === 'cancelled'))     return 'cancelled';
    if (bookingStatuses.every(s => s === 'completed'))    return 'completed';

    // ── Return phase ───────────────────────────────────────────────────────────
    if (returns.length > 0) {
        if (returns.every(s => s.status === 'delivered')) return 'completed';
        if (returns.some(s => s.status === 'in_transit' || s.status === 'picked_up'))
                                                          return 'returning';
        return 'returning'; // returns exist but not yet in transit
    }

    // ── Outbound phase ────────────────────────────────────────────────────────
    if (outbound.length > 0) {
        if (outbound.every(s => s.status === 'delivered')) return 'delivered'; // ready to return
        if (outbound.some(s =>
            s.status === 'in_transit' || s.status === 'out_for_delivery' || s.status === 'picked_up',
        ))                                                return 'shipping';
    }

    if (bookingStatuses.every(s => s === 'approved' || s === 'active')) return 'approved';
    if (bookingStatuses.some(s => s === 'rejected'))   return 'pending';
    return 'pending';
}
