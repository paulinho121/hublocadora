-- ======================================================
-- LGPD PRIVACY SHIELD - BLINDAGEM JURÍDICA
-- Implementação de Consentimento e Direito ao Esquecimento
-- ======================================================

-- 1. Registro de Consentimentos (Prova Jurídica de Aceite)
CREATE TABLE IF NOT EXISTS public.privacy_consents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    policy_version TEXT NOT NULL,
    consent_type TEXT NOT NULL, -- 'privacy_policy', 'terms_of_use', 'data_sharing'
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ip_address TEXT, -- Importante para auditoria legal
    user_agent TEXT
);

-- 2. Campos de Controle de Privacidade no Perfil
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'is_anonymized') THEN
        ALTER TABLE public.profiles ADD COLUMN is_anonymized BOOLEAN DEFAULT false;
        ALTER TABLE public.profiles ADD COLUMN anonymized_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE public.profiles ADD COLUMN data_usage_consent BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 3. Função de Elite: Anonimização (Direito ao Esquecimento)
-- Esta função apaga os PII (Dados Pessoais Identificáveis) sem quebrar o sistema.
CREATE OR REPLACE FUNCTION public.anonymize_user_data(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 1. Atualiza o perfil para estado anônimo
    UPDATE public.profiles
    SET 
        full_name = 'Usuário Anonimizado',
        email = 'anon_' || substr(id::text, 1, 8) || '@cinehub.anon',
        is_anonymized = true,
        anonymized_at = now()
    WHERE id = target_user_id;

    -- 2. Opcional: Limpar endereços sensíveis em locadoras se o usuário for dono
    UPDATE public.companies
    SET 
        document = 'REMOVIDO_LGPD',
        address_street = 'ENDERECO_ANONIMIZADO'
    WHERE owner_id = target_user_id;

    -- Nota: Mantemos o ID e as transações financeiras para fins fiscais,
    -- mas a pessoa física não é mais identificável.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Logs de Acesso a Dados Pessoais (Auditoria ANPD)
CREATE TABLE IF NOT EXISTS public.data_access_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    accessor_id UUID REFERENCES public.profiles(id),
    target_user_id UUID REFERENCES public.profiles(id),
    access_reason TEXT, -- 'booking_fulfillment', 'support', 'admin_view'
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. RLS para Segurança de Dados
ALTER TABLE public.privacy_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own consents" ON public.privacy_consents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can see access logs" ON public.data_access_logs
    FOR SELECT USING (public.is_admin());
