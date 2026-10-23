export interface Profile {
    id: string; // auth.users.id
    email: string;
    full_name: string | null;
    role: 'admin' | 'rental_house' | 'branch_manager';
    company_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface Company {
    id: string; 
    owner_id: string; 
    name: string;
    document: string; 
    description: string | null;
    logo_url: string | null;
    address_street: string;
    address_number: string;
    address_complement: string | null;
    address_neighborhood: string;
    address_city: string;
    address_state: string;
    address_zip: string;
    status: 'pending' | 'approved' | 'active' | 'rejected' | 'suspended';
    created_at: string;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    created_at: string;
}

export interface MasterCatalog {
    id: string;
    name: string;
    brand: string;
    category: string;
    description: string;
    image_url: string;
    created_at: string;
}

export interface Equipment {
    id: string;
    company_id: string; 
    subrental_company_id?: string | null; // Sub-locadora externa que gerencia este item
    name: string;
    brand?: string | null;
    sub_category?: string | null;
    category: string; 
    description: string;
    daily_rate: number;
    condition: 'excellent' | 'good' | 'fair' | 'maintenance';
    status: 'available' | 'rented' | 'maintenance' | 'unavailable';
    images: string[]; 
    features: Record<string, any>; 
    stock_quantity: number;
    master_item_id?: string;
    location_base?: string;
    state_uf?: string;
    created_at: string;
    stock?: (EquipmentStock & { branch: Branch })[];
}

export interface Booking {
    id: string;
    equipment_id: string;
    renter_id: string;
    company_id: string;
    project_id: string | null;
    /** Retirada (o equipamento sai) */
    start_date: string;
    /** Devolução (o equipamento volta) */
    end_date: string;
    /** Dias de gravação (cobrados). Pedidos antigos não têm. */
    shoot_start_date?: string | null;
    shoot_end_date?: string | null;
    /** Dias de gravação marcados (podem ser espaçados) */
    shoot_dates?: string[] | null;
    total_amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'cancelled';
    notes: string | null;
    quantity: number;
    delivery_method: 'pickup' | 'delivery';
    delivery_address: string | null;
    delivery_contact: string | null;
    subrental_company_id: string | null;
    origin_branch_id: string | null;
    created_at: string;
}

// ─── Project types ────────────────────────────────────────────────────────────

export type ProjectStatus =
    | 'draft' | 'pending' | 'approved' | 'shipping'
    | 'delivered' | 'active' | 'returning' | 'completed' | 'cancelled';

export type ShipmentStatus =
    | 'awaiting_approval' | 'approved' | 'label_created' | 'picked_up'
    | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';

export interface ProjectShipment {
    id: string;
    project_id: string;
    booking_id: string;
    company_id: string;
    direction: 'outbound' | 'return';
    carrier: string | null;
    tracking_code: string | null;
    tracking_url: string | null;
    committed_ship_by: string | null;
    estimated_arrival: string | null;
    actual_arrival: string | null;
    status: ShipmentStatus;
    status_history: { status: string; ts: string; description: string; location?: string }[];
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProjectBooking extends Booking {
    equipment?: Equipment;
    company?: Company;
    project_shipments?: ProjectShipment[];
}

export interface Project {
    id: string;
    renter_id: string;
    name: string;
    status: ProjectStatus;
    delivery_method: 'pickup' | 'delivery' | 'mixed';
    delivery_address: string | null;
    delivery_contact: string | null;
    delivery_window_start: string | null;
    delivery_window_end: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    // joined
    bookings?: ProjectBooking[];
}

export interface Payment {
    id: string;
    booking_id: string;
    tenant_id: string;
    amount: number;
    payment_method: 'pix' | 'credit_card' | 'gateway';
    status: 'pending' | 'approved' | 'rejected' | 'refunded';
    external_id: string | null;
    qr_code: string | null;
    qr_code_base64: string | null;
    payment_link: string | null;
    created_at: string;
}

export interface LogisticsTracking {
    id: string;
    booking_id: string;
    status: 'ready_for_pickup' | 'checked_out' | 'returned' | 'damages_found' | 'completed';
    checkout_inspector_id: string | null;
    checkin_inspector_id: string | null;
    checkout_at: string | null;
    checkin_at: string | null;
    checkout_notes: string | null;
    checkin_notes: string | null;
    checkout_images: string[];
    checkin_images: string[];
    created_at: string;
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'booking' | 'payment' | 'logistics';
    read: boolean;
    created_at: string;
}

export type DeliveryStatus = 'pending' | 'picking' | 'ready' | 'shipped' | 'delivered' | 'confirmed' | 'cancelled';

export interface Delivery {
    id: string;
    booking_id: string;
    serial_number: string | null;
    delivery_token: string | null;
    origin_branch_id: string | null;
    driver_name: string | null;
    driver_phone: string | null;
    status: DeliveryStatus;
    current_lat: number | null;
    current_lng: number | null;
    estimated_arrival: string | null;
    // Reverse Logistics
    reverse_logistics_status: 'not_started' | 'requested' | 'collecting' | 'in_transit' | 'returned' | 'completed' | 'cancelled';
    reverse_logistics_address: string | null;
    reverse_logistics_branch_id: string | null;
    reverse_driver_name: string | null;
    reverse_driver_phone: string | null;
    reverse_token: string | null;

    created_at: string;
    updated_at: string;
}

export interface Branch {
    id: string;
    company_id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    document: string | null;
    manager_email: string | null;
    invite_token: string;
    is_main: boolean;
    status: 'invited' | 'active' | 'inactive';
    created_at: string;
    updated_at: string;
}

export interface EquipmentStock {
    id: string;
    equipment_id: string;
    branch_id: string;
    quantity: number;
    updated_at: string;
}
