-- ======================================================
-- INFRAESTRUTURA DE INTELIGÊNCIA DE REDE (MASTER)
-- Tabelas para Rastreabilidade, Logs e Financeiro B2B
-- ======================================================

-- 1. Logs de Movimentação de Ativos (RG do Equipamento)
CREATE TABLE IF NOT EXISTS public.network_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    equipment_id UUID REFERENCES public.equipments(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    origin_company_id UUID REFERENCES public.companies(id),
    destination_company_id UUID REFERENCES public.companies(id),
    action_type TEXT NOT NULL, -- 'assignment', 'rental', 'return', 'maintenance', 'status_change'
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Transações Financeiras e Divisão de Receita (Payouts)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    master_company_id UUID REFERENCES public.companies(id), -- Quem recebe o bruto
    partner_company_id UUID REFERENCES public.companies(id), -- Quem fornece o item
    total_amount NUMERIC NOT NULL, -- Valor total pago pelo cliente
    master_fee NUMERIC NOT NULL, -- Taxa/Comissão do Hub (Master)
    partner_amount NUMERIC NOT NULL, -- Valor líquido a repassar para a sublocadora
    status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS
ALTER TABLE public.network_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Segurança (Admin Master vê tudo, Parceiros vêem o deles)
CREATE POLICY "Admin select all logs" ON public.network_logs 
    FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Partners select own logs" ON public.network_logs 
    FOR SELECT TO authenticated 
    USING (origin_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) 
    OR destination_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admin select all transactions" ON public.financial_transactions 
    FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Partners select own transactions" ON public.financial_transactions 
    FOR SELECT TO authenticated 
    USING (partner_company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- 5. Função para gerar log automático ao aprovar reserva (Opcional, mas poderoso)
CREATE OR REPLACE FUNCTION public.log_booking_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') THEN
        INSERT INTO public.network_logs (equipment_id, booking_id, action_type, description)
        VALUES (NEW.equipment_id, NEW.id, 'rental_approved', 'Reserva aprovada pelo Master e enviada para roteirização.');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_log_booking_approval ON public.bookings;
CREATE TRIGGER tr_log_booking_approval
    AFTER UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.log_booking_assignment();
