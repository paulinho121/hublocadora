export interface Profile {
    id: string; // auth.users.id
    email: string;
    full_name: string | null;
    role: 'client' | 'rental_house' | 'production_company' | 'admin';
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
    status: 'pending' | 'approved' | 'rejected';
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
    name: string;
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
}

export interface Booking {
    id: string;
    equipment_id: string; 
    renter_id: string; 
    company_id: string; 
    start_date: string;
    end_date: string;
    total_amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'cancelled';
    notes: string | null;
    quantity: number;
    delivery_method: 'pickup' | 'delivery';
    delivery_address: string | null;
    created_at: string;
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

export type DeliveryStatus = 'pending' | 'picking' | 'ready' | 'shipped' | 'delivered' | 'cancelled';

export interface Delivery {
    id: string;
    booking_id: string;
    driver_name: string | null;
    driver_phone: string | null;
    status: DeliveryStatus;
    current_lat: number | null;
    current_lng: number | null;
    estimated_arrival: string | null;
    created_at: string;
    updated_at: string;
}
