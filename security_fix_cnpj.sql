-- CINEHUB MASTER - ANTI-FRAUDE SCRIPT
-- Rode este script no Editor SQL do seu Supabase para blindar o banco de dados.

-- 0.1 DESVÍNCULO DE CHAVES ESTRANGEIRAS (Impede o Erro 23503)
-- Como a empresa duplicada já está vinculada a um perfil, precisamos
-- "soltar" essa ligação antes de apagar a empresa.
UPDATE public.profiles
SET company_id = NULL
WHERE company_id IN (
    SELECT a.id FROM public.companies a
    INNER JOIN (
        SELECT MIN(ctid) as min_ctid, document
        FROM public.companies 
        GROUP BY document HAVING COUNT(*) > 1
    ) b ON a.document = b.document
    WHERE a.ctid <> b.min_ctid
);

-- 0.2 LIMPEZA DE SOCIEDADES DUPLICADAS (Deduplication)
-- Mantendo APENAS o cadastro mais recente/mestre.
DELETE FROM public.companies a USING (
    SELECT MIN(ctid) as min_ctid, document
    FROM public.companies 
    GROUP BY document HAVING COUNT(*) > 1
) b
WHERE a.document = b.document 
AND a.ctid <> b.min_ctid;

-- 1. ADICIONA UMA TRAVA DE EXCLUSIVIDADE NO CNPJ/CPF (Nível Banco de Dados)
-- Isso impede que dois usuários usem a mesma empresa, bloqueando falhas através de APIs ou postman.
ALTER TABLE public.companies 
ADD CONSTRAINT unique_company_document UNIQUE (document);
