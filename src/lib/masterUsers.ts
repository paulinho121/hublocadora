export const MASTER_USERS = [
  'logistica@mcistore.com.br',
  'comercial@mcistore.com.br'
];

export const isMasterUser = (email?: string | null) => {
  if (!email) return false;
  return MASTER_USERS.includes(email.toLowerCase());
};
