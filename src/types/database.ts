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
    id: string; // uuid
    owner_id: string; // references profile.id
    name: string;
    document: string; // CNPJ / CPF
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

export interface Equipment {
    id: string;
    company_id: string; // references company.id
    name: string;
    category: string; // e.g., 'Camera', 'Lenses', 'Lighting'
    description: string;
    daily_rate: number;
    condition: 'excellent' | 'good' | 'fair' | 'maintenance';
    status: 'available' | 'rented' | 'maintenance' | 'unavailable';
    images: string[]; // URLs of images
    features: Record<string, any>; // JSONB para flexibilidade (resolução, mount, peso etc)
    stock_quantity: number;
    master_item_id?: string; // referece to master_catalog
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

export interface Category {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    created_at: string;
}

export interface Booking {
    id: string;
    equipment_id: string; // references equipment.id
    renter_id: string; // references profile.id (quem está alugando)
    company_id: string; // references company.id (dono do item)
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
