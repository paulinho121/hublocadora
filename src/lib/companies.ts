import { supabase } from '@/lib/supabase';

/**
 * Colunas de companies que anon/authenticated podem ler diretamente (V38).
 * Documento, telefone, endereço completo e dados financeiros são privados:
 * use withPrivateFields (dono/admin) ou withPrivateFieldsAdmin (admin).
 * Um select('*') em companies falha com "permission denied".
 */
export const COMPANY_PUBLIC_COLUMNS: string =
  'id, owner_id, name, description, logo_url, address_city, address_state, state_uf, status, created_at, parent_company_id';

/** Completa a empresa com os campos privados, se o usuário for dono/membro ou admin. */
export async function withPrivateFields<T extends { id: string }>(company: T): Promise<T> {
  const { data, error } = await supabase.rpc('get_company_private', { p_company_id: company.id });
  if (error || !data) return company;
  return { ...company, ...(data as object) };
}

/** Completa uma lista de empresas com os campos privados (somente admin). */
export async function withPrivateFieldsAdmin<T extends { id: string }>(companies: T[]): Promise<T[]> {
  const { data, error } = await supabase.rpc('admin_get_companies_private');
  if (error || !data) return companies;
  const byId = new Map((data as any[]).map(({ company_id, ...rest }) => [company_id, rest]));
  return companies.map(c => ({ ...c, ...(byId.get(c.id) || {}) }));
}
