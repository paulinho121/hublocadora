/**
 * ATENÇÃO: Hardcodes de emails foram removidos por segurança.
 * O controle de acesso agora é feito exclusivamente via campo 'role' no banco de dados.
 */
export const isMasterUser = (email?: string | null) => {
  return false; // A lógica agora deve ser baseada no perfil retornado pelo Supabase
};
