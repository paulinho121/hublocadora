/**
 * Rascunho da reserva de um visitante sem login. É salvo quando ele clica em
 * reservar, sobrevive ao cadastro/confirmação de e-mail e é restaurado na página
 * do equipamento quando ele volta logado.
 */
export type PendingBooking = {
  equipmentId: string;
  startDate: string;
  endDate: string;
  quantity: number;
  method: 'pickup' | 'delivery';
  address: string;
  contact: string;
  notes: string;
};

const KEY = 'cinehub:pending-booking';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function savePendingBooking(draft: PendingBooking) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // armazenamento indisponível (aba anônima etc.) — o usuário só refaz a seleção
  }
}

export function loadPendingBooking(equipmentId: string): PendingBooking | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (draft.equipmentId !== equipmentId || Date.now() - draft.savedAt > MAX_AGE_MS) return null;
    return draft;
  } catch {
    return null;
  }
}

export function clearPendingBooking() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignora
  }
}
