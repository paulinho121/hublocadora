-- ==============================================================================
-- CINEHUB DATABASE MIGRATION
-- V47_PAPER_SIGNED_CONTRACTS
--
-- CONTRATO ASSINADO NO PAPEL (alternativa à assinatura eletrônica da V46)
--   A locadora imprime o contrato, as duas partes assinam a via impressa e a
--   locadora envia o arquivo assinado (PDF ou foto). Isso marca o contrato como
--   assinado e libera a retirada/entrega, como a assinatura eletrônica.
--
--   - O arquivo fica num bucket PRIVADO ("contracts"), na pasta
--     <empresa>/<contrato>/. Só a locadora envia; locadora e cliente podem ver.
--     Arquivos enviados não podem ser trocados nem apagados pelo app.
--   - Fica registrado quem enviou, quando, e a data escrita na via assinada.
--
-- Rode depois da V46. Pode rodar mais de uma vez.
-- ==============================================================================


-- ── 1. Colunas ──────────────────────────────────────────────────────────────────
ALTER TABLE public.rental_contracts ADD COLUMN IF NOT EXISTS signature_method text NOT NULL DEFAULT 'electronic';
ALTER TABLE public.rental_contracts DROP CONSTRAINT IF EXISTS rental_contracts_signature_method_check;
ALTER TABLE public.rental_contracts ADD CONSTRAINT rental_contracts_signature_method_check
    CHECK (signature_method IN ('electronic', 'paper'));

ALTER TABLE public.rental_contracts ADD COLUMN IF NOT EXISTS paper_file_path         text;
ALTER TABLE public.rental_contracts ADD COLUMN IF NOT EXISTS paper_signed_date       date;
ALTER TABLE public.rental_contracts ADD COLUMN IF NOT EXISTS paper_registered_at     timestamptz;
ALTER TABLE public.rental_contracts ADD COLUMN IF NOT EXISTS paper_registered_by     uuid;
ALTER TABLE public.rental_contracts ADD COLUMN IF NOT EXISTS paper_registered_by_name text;


-- ── 2. Bucket privado para as vias assinadas ──────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contracts', 'contracts', false, 15728640,  -- 15 MB
        ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Envio: só a locadora, na pasta da própria empresa
DROP POLICY IF EXISTS "Contracts_Insert_Company" ON storage.objects;
CREATE POLICY "Contracts_Insert_Company" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'contracts'
        AND (
            (storage.foldername(name))[1] = public.get_my_company_id()::text
            OR EXISTS (
                SELECT 1 FROM public.companies c
                WHERE c.id::text = (storage.foldername(name))[1] AND public.is_branch_manager_of(c.id)
            )
        )
    );

-- Leitura: a locadora, o cliente do contrato e o admin
DROP POLICY IF EXISTS "Contracts_Select_Parties" ON storage.objects;
CREATE POLICY "Contracts_Select_Parties" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'contracts'
        AND (
            (storage.foldername(name))[1] = public.get_my_company_id()::text
            OR public.cinehub_is_admin()
            OR EXISTS (
                SELECT 1 FROM public.rental_contracts rc
                WHERE rc.id::text = (storage.foldername(name))[2]
                  AND (rc.renter_id = auth.uid() OR public.is_branch_manager_of(rc.company_id))
            )
        )
    );
-- Sem políticas de UPDATE/DELETE: a via enviada não pode ser trocada nem apagada pelo app.


-- ── 3. Registrar a assinatura no papel ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.register_paper_signature(
    p_contract_id uuid,
    p_file_path text,
    p_signed_date date,
    p_registered_by_name text
)
RETURNS public.rental_contracts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_c public.rental_contracts;
    v_name text := btrim(COALESCE(p_registered_by_name, ''));
BEGIN
    SELECT * INTO v_c FROM public.rental_contracts WHERE id = p_contract_id FOR UPDATE;
    IF v_c.id IS NULL THEN
        RAISE EXCEPTION 'Contrato não encontrado.';
    END IF;
    IF NOT (v_c.company_id = public.get_my_company_id() OR public.is_branch_manager_of(v_c.company_id)) THEN
        RAISE EXCEPTION 'Só a locadora pode registrar o contrato assinado no papel.';
    END IF;
    IF v_c.status = 'void' THEN
        RAISE EXCEPTION 'Este contrato foi substituído por uma versão nova. Imprima e assine a versão atual.';
    END IF;
    IF v_c.status = 'signed' THEN
        RAISE EXCEPTION 'Este contrato já está assinado pelas duas partes.';
    END IF;
    IF length(v_name) < 5 OR position(' ' IN v_name) = 0 THEN
        RAISE EXCEPTION 'Informe o nome completo de quem está registrando.';
    END IF;
    IF p_signed_date IS NULL OR p_signed_date > current_date OR p_signed_date < v_c.created_at::date THEN
        RAISE EXCEPTION 'A data da assinatura precisa estar entre a emissão do contrato e hoje.';
    END IF;
    IF p_file_path IS NULL OR p_file_path NOT LIKE v_c.company_id::text || '/' || v_c.id::text || '/%' THEN
        RAISE EXCEPTION 'Arquivo do contrato inválido. Envie de novo.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'contracts' AND name = p_file_path) THEN
        RAISE EXCEPTION 'O arquivo do contrato assinado não foi encontrado. Envie de novo.';
    END IF;

    UPDATE public.rental_contracts SET
        status = 'signed',
        signature_method = 'paper',
        paper_file_path = p_file_path,
        paper_signed_date = p_signed_date,
        paper_registered_at = now(),
        paper_registered_by = auth.uid(),
        paper_registered_by_name = v_name,
        updated_at = now()
    WHERE id = v_c.id
    RETURNING * INTO v_c;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (v_c.renter_id, 'Contrato assinado no papel',
            'A locadora registrou a via assinada do contrato ' || v_c.code || '. A retirada/entrega está liberada.', 'booking');

    RETURN v_c;
END;
$$;

REVOKE ALL ON FUNCTION public.register_paper_signature(uuid, text, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_paper_signature(uuid, text, date, text) TO authenticated;


-- ── 4. Conferência ──────────────────────────────────────────────────────────────
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'contracts';
