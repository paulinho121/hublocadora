/**
 * Agenda da locação: retirada → dias de gravação → devolução.
 *
 * - O cliente marca os dias de gravação, que podem ser espaçados (ex.: 26, 27 e 30).
 * - Cobra-se só os dias de gravação marcados.
 * - O equipamento fica com o cliente da retirada até a devolução (inclusive nos
 *   dias sem gravação no meio, que não são cobrados).
 * - Retirada e devolução só em dia útil: sábado e domingo as locadoras fecham.
 *   Gravar no fim de semana pode.
 *
 * Datas sempre como 'yyyy-MM-dd' (data local, sem fuso).
 */

export interface RentalSchedule {
  pickupDate: string;
  /** Dias de gravação marcados, em ordem e sem repetição */
  shootDates: string[];
  /** Primeiro e último dia de gravação (atalhos para shootDates) */
  shootStartDate: string;
  shootEndDate: string;
  returnDate: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

function toDate(d: string) {
  return new Date(d + 'T00:00');
}

function toStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDaysStr(d: string, n: number) {
  const x = toDate(d);
  x.setDate(x.getDate() + n);
  return toStr(x);
}

export function todayStr() {
  return toStr(new Date());
}

/** Sábado ou domingo: locadoras fechadas (sem retirada nem devolução) */
export function isClosedDay(d: string) {
  const day = toDate(d).getDay();
  return day === 0 || day === 6;
}

/** O próprio dia, se for útil; senão o dia útil anterior */
export function prevOpenDay(d: string) {
  let x = d;
  while (isClosedDay(x)) x = addDaysStr(x, -1);
  return x;
}

/** O próprio dia, se for útil; senão o próximo dia útil */
export function nextOpenDay(d: string) {
  let x = d;
  while (isClosedDay(x)) x = addDaysStr(x, 1);
  return x;
}

/** Todos os dias de start a end (inclusive) */
export function dateRange(start: string, end: string) {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDaysStr(d, 1)) out.push(d);
  return out;
}

/** Ordena e tira repetidos */
export function normalizeDates(dates: string[]) {
  return [...new Set(dates.filter(Boolean))].sort();
}

/** Diárias de um período contínuo (primeiro e último incluídos) */
export function shootDays(start: string, end: string) {
  const diff = Math.round((toDate(end).getTime() - toDate(start).getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}

/** Retirada sugerida: o dia útil antes da gravação (ou o primeiro dia útil possível a partir de hoje) */
export function suggestedPickup(shootStart: string, today = todayStr()) {
  const before = prevOpenDay(addDaysStr(shootStart, -1));
  if (before >= today) return before;
  // Não dá para retirar antes: retira no próprio dia da gravação (ou no próximo dia útil)
  return nextOpenDay(today > shootStart ? today : shootStart);
}

/** Devolução sugerida: o primeiro dia útil depois do último dia de gravação */
export function suggestedReturn(shootEnd: string) {
  return nextOpenDay(addDaysStr(shootEnd, 1));
}

/** Agenda a partir dos dias de gravação marcados, com retirada e devolução sugeridas */
export function scheduleForShootDays(dates: string[], today = todayStr()): RentalSchedule {
  let days = normalizeDates(dates).filter(d => d >= today);
  if (days.length === 0) days = [addDaysStr(today, 1)];
  const pickupDate = suggestedPickup(days[0], today);
  // Se a retirada só puder ser depois do primeiro dia (ex.: hoje é sábado), esses dias saem
  days = days.filter(d => d >= pickupDate);
  if (days.length === 0) days = [pickupDate];
  return {
    pickupDate,
    shootDates: days,
    shootStartDate: days[0],
    shootEndDate: days[days.length - 1],
    returnDate: suggestedReturn(days[days.length - 1]),
  };
}

/** Agenda para um período contínuo de gravação */
export function scheduleForShoot(shootStart: string, shootEnd: string, today = todayStr()): RentalSchedule {
  const end = shootEnd < shootStart ? shootStart : shootEnd;
  return scheduleForShootDays(dateRange(shootStart, end), today);
}

/** Agenda padrão: gravação amanhã (1 diária) */
export function defaultSchedule(today = todayStr()): RentalSchedule {
  return scheduleForShootDays([addDaysStr(today, 1)], today);
}

/**
 * Corrige uma retirada escolhida pela pessoa: dia útil, a partir de hoje e até o
 * primeiro dia de gravação. Fim de semana volta para a sexta.
 */
export function clampPickup(pickup: string, s: RentalSchedule, today = todayStr()) {
  let p = prevOpenDay(pickup > s.shootStartDate ? s.shootStartDate : pickup);
  if (p < today) p = nextOpenDay(today);
  return p > s.shootStartDate ? s.shootStartDate : p;
}

/**
 * Corrige uma devolução escolhida pela pessoa: dia útil, no último dia de gravação
 * ou depois. Fim de semana vai para a segunda.
 */
export function clampReturn(ret: string, s: RentalSchedule) {
  return nextOpenDay(ret < s.shootEndDate ? s.shootEndDate : ret);
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** "qui 29/10" */
export function weekdayShort(d: string) {
  const x = toDate(d);
  return `${WEEKDAYS[x.getDay()]} ${pad(x.getDate())}/${pad(x.getMonth() + 1)}`;
}

/** "29/10" */
export function dayMonth(d: string) {
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
}

/** "26, 27 e 30/10" · "30/10, 02 e 03/11" */
export function formatShootDays(dates: string[]) {
  const days = normalizeDates(dates);
  if (days.length === 0) return '—';
  const byMonth: { month: string; days: string[] }[] = [];
  for (const d of days) {
    const month = d.slice(5, 7);
    const last = byMonth[byMonth.length - 1];
    if (last && last.month === month) last.days.push(d.slice(8, 10));
    else byMonth.push({ month, days: [d.slice(8, 10)] });
  }
  const join = (list: string[]) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}` : list[0]);
  return byMonth.map(g => `${join(g.days)}/${g.month}`).join(', ');
}
