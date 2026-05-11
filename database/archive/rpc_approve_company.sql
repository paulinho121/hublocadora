-- ======================================================
-- RPC: APPROVE_COMPANY (Bypass RLS para Administradores)
-- ======================================================

CREATE OR REPLACE FUNCTION public.approve_company(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Verifica se quem está chamando é um admin (opcional, pois SECURITY DEFINER já roda com privilégios)
    -- Mas é bom manter por segurança
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores podem aprovar empresas.';
    END IF;

    UPDATE public.companies
    SET status = 'approved'
    WHERE id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
