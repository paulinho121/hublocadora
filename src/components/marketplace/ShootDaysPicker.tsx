import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDaysStr, normalizeDates, todayStr } from '@/lib/schedule';

/**
 * Calendário para marcar os dias de gravação (toque para marcar/desmarcar;
 * os dias podem ser espaçados). Mostra também a retirada e a devolução.
 */

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const pad = (n: number) => String(n).padStart(2, '0');

interface ShootDaysPickerProps {
  value: string[];
  onChange: (dates: string[]) => void;
  pickupDate?: string;
  returnDate?: string;
}

export function ShootDaysPicker({ value, onChange, pickupDate, returnDate }: ShootDaysPickerProps) {
  const today = todayStr();
  const first = value[0] || addDaysStr(today, 1);
  const [month, setMonth] = useState(() => ({ y: Number(first.slice(0, 4)), m: Number(first.slice(5, 7)) - 1 }));
  const selected = new Set(value);

  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const leading = new Date(month.y, month.m, 1).getDay();
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month.y}-${pad(month.m + 1)}-${pad(i + 1)}`),
  ];

  const isCurrentMonth = month.y === Number(today.slice(0, 4)) && month.m === Number(today.slice(5, 7)) - 1;
  const shift = (n: number) => setMonth(({ y, m }) => {
    const d = new Date(y, m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const toggle = (d: string) => {
    if (selected.has(d)) {
      // Pelo menos um dia de gravação continua marcado
      if (selected.size > 1) onChange(value.filter(x => x !== d));
    } else {
      onChange(normalizeDates([...value, d]));
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={isCurrentMonth}
          aria-label="Mês anterior"
          className="h-9 w-9 rounded-full flex items-center justify-center text-zinc-400 hover:bg-zinc-900 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-zinc-200 capitalize">{MONTHS[month.m]} {month.y}</span>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Próximo mês"
          className="h-9 w-9 rounded-full flex items-center justify-center text-zinc-400 hover:bg-zinc-900"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Dias de gravação">
        {WEEK.map((w, i) => (
          <span key={i} className={`text-[11px] font-semibold pb-1 ${i === 0 || i === 6 ? 'text-zinc-500' : 'text-zinc-400'}`}>{w}</span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const past = d < today;
          const on = selected.has(d);
          const isPickup = d === pickupDate && !on;
          const isReturn = d === returnDate && !on;
          return (
            <button
              key={d}
              type="button"
              disabled={past}
              onClick={() => toggle(d)}
              aria-pressed={on}
              aria-label={`${Number(d.slice(8, 10))} de ${MONTHS[month.m]}${on ? ', dia de gravação' : ''}${isPickup ? ', retirada' : ''}${isReturn ? ', devolução' : ''}`}
              className={`relative h-10 rounded-full text-sm font-semibold tabular-nums transition-colors ${
                on
                  ? 'bg-primary text-white'
                  : past
                    ? 'text-zinc-700 cursor-not-allowed'
                    : isPickup || isReturn
                      ? 'text-zinc-100 ring-1 ring-inset ring-zinc-600 hover:bg-zinc-900'
                      : 'text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              {Number(d.slice(8, 10))}
              {(isPickup || isReturn) && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-zinc-400 leading-none">
                  {isPickup ? 'ret.' : 'dev.'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-zinc-500">
        Toque nos dias em que vai gravar. Podem ser dias espaçados; só eles são cobrados.
      </p>
    </div>
  );
}
