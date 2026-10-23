/**
 * Agenda da locação: retirada → dias de gravação → devolução.
 *
 * - Cobra-se só os dias de gravação (primeiro e último incluídos).
 * - O equipamento fica ocupado da retirada até a devolução.
 * - Retirada e devolução só em dia útil: sábado e domingo as locadoras fecham.
 *   Gravar no fim de semana pode.
 *
 * Datas sempre como 'yyyy-MM-dd' (data local, sem fuso).
 */

export interface RentalSchedule {
  pickupDate: string;
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

/** Diárias cobradas: dias de gravação, contando o primeiro e o último */
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

/** Agenda a partir dos dias de gravação, com retirada e devolução sugeridas */
export function scheduleForShoot(shootStart: string, shootEnd: string, today = todayStr()): RentalSchedule {
  const start = shootStart < today ? today : shootStart;
  const end = shootEnd < start ? start : shootEnd;
  let pickupDate = suggestedPickup(start, today);
  // Se a retirada só puder ser depois do início (ex.: hoje é sábado), a gravação começa nela
  const shootStartDate = pickupDate > start ? pickupDate : start;
  const shootEndDate = end < shootStartDate ? shootStartDate : end;
  if (pickupDate > shootStartDate) pickupDate = shootStartDate;
  return { pickupDate, shootStartDate, shootEndDate, returnDate: suggestedReturn(shootEndDate) };
}

/** Agenda padrão: gravação amanhã (1 diária) */
export function defaultSchedule(today = todayStr()): RentalSchedule {
  return scheduleForShoot(addDaysStr(today, 1), addDaysStr(today, 1), today);
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
