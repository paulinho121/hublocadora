/**
 * Mensagem de erro legível para o usuário.
 *
 * Erros técnicos do banco/rede (ex.: "violates check constraint", "permission denied")
 * viram um texto claro. Mensagens escritas por nós nas funções do banco (RAISE EXCEPTION,
 * em português) já são legíveis e passam como estão. O detalhe técnico vai para o console.
 */
const TECHNICAL: [RegExp, string][] = [
  [/permission denied|row-level security|not authorized|JWT/i, 'Você não tem permissão para fazer isso.'],
  [/violates (check|foreign key|not-null) constraint|invalid input syntax|column .* does not exist|relation .* does not exist/i,
    'Não foi possível salvar: algum dado não foi aceito. Confira e tente de novo.'],
  [/duplicate key|already exists/i, 'Este registro já existe.'],
  [/Could not find the function|schema cache|Bucket not found/i, 'Este recurso ainda não está disponível. Tente de novo mais tarde.'],
  [/Failed to fetch|NetworkError|network|timeout/i, 'Sem conexão no momento. Verifique a internet e tente de novo.'],
];

export function friendlyError(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  const message = (error as any)?.message ?? (typeof error === 'string' ? error : '');
  if (message) console.error('[CineHub]', error);
  if (!message) return fallback;
  for (const [pattern, text] of TECHNICAL) {
    if (pattern.test(message)) return text;
  }
  // Mensagens nossas (português, sem jargão de banco) são mostradas como estão
  return message;
}
