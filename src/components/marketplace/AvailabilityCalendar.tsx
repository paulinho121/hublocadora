import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isBefore,
  isToday,
  parseISO,
  isWithinInterval,
  startOfDay,
  isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useEquipmentOccupiedDates } from '@/hooks/useBookings';

interface AvailabilityCalendarProps {
  equipmentId: string;
  stockQuantity: number;
  selectedStart?: string;
  selectedEnd?: string;
  onRangeChange?: (start: string, end: string) => void;
}

type DayStatus = 'available' | 'partial' | 'blocked' | 'past';

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function AvailabilityCalendar({
  equipmentId,
  stockQuantity,
  selectedStart,
  selectedEnd,
  onRangeChange,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pendingStart, setPendingStart] = useState<string | null>(selectedStart ?? null);

  const { data: occupiedDates, isLoading } = useEquipmentOccupiedDates(equipmentId);

  const today = startOfDay(new Date());

  const getBookedQuantity = useMemo(() => (date: Date): number => {
    if (!occupiedDates) return 0;
    return occupiedDates.reduce((acc, booking) => {
      const bStart = startOfDay(parseISO(booking.start_date));
      const bEnd = startOfDay(parseISO(booking.end_date));
      if (isWithinInterval(date, { start: bStart, end: bEnd })) {
        return acc + booking.quantity;
      }
      return acc;
    }, 0);
  }, [occupiedDates]);

  const getDayStatus = (date: Date): DayStatus => {
    if (isBefore(date, today)) return 'past';
    const booked = getBookedQuantity(date);
    if (booked >= stockQuantity) return 'blocked';
    if (booked > 0) return 'partial';
    return 'available';
  };

  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  }, [currentMonth]);

  const firstDayOffset = getDay(startOfMonth(currentMonth));

  const handleDayClick = (dateStr: string, status: DayStatus) => {
    if (status === 'blocked' || status === 'past') return;
    if (!onRangeChange) return;

    if (!pendingStart || (pendingStart && selectedEnd)) {
      // First click: set start
      setPendingStart(dateStr);
      onRangeChange(dateStr, dateStr);
    } else {
      // Second click: set end (swap if before start)
      const start = pendingStart < dateStr ? pendingStart : dateStr;
      const end = pendingStart < dateStr ? dateStr : pendingStart;
      setPendingStart(null);
      onRangeChange(start, end);
    }
  };

  const isInSelectedRange = (day: Date): boolean => {
    if (!selectedStart || !selectedEnd) return false;
    try {
      return isWithinInterval(day, {
        start: parseISO(selectedStart),
        end: parseISO(selectedEnd),
      });
    } catch {
      return false;
    }
  };

  const dayClasses: Record<DayStatus, string> = {
    available: 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer',
    partial: 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/30 cursor-pointer',
    blocked: 'bg-red-500/10 text-red-500/50 line-through cursor-not-allowed opacity-60',
    past: 'text-zinc-500 cursor-not-allowed',
  };

  return (
    <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-5 space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-black uppercase tracking-widest text-zinc-200 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button
          onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Week day headers */}
          <div className="grid grid-cols-7">
            {WEEK_DAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-zinc-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map(day => {
              const status = getDayStatus(day);
              const dateStr = format(day, 'yyyy-MM-dd');
              const isStart = selectedStart === dateStr;
              const isEnd = selectedEnd === dateStr;
              const isSelected = isStart || isEnd;
              const inRange = isInSelectedRange(day);

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayClick(dateStr, status)}
                  disabled={status === 'blocked' || status === 'past'}
                  title={
                    status === 'blocked'
                      ? 'Indisponível'
                      : status === 'partial'
                      ? 'Disponibilidade parcial'
                      : status === 'past'
                      ? 'Data passada'
                      : 'Disponível'
                  }
                  className={[
                    'relative h-9 w-full rounded-lg text-xs font-bold transition-all duration-150',
                    dayClasses[status],
                    isToday(day) ? 'ring-1 ring-primary ring-offset-1 ring-offset-zinc-900' : '',
                    isSelected ? '!bg-primary text-white ring-2 ring-white/30 ring-offset-1 ring-offset-zinc-900 !cursor-pointer' : '',
                    inRange && !isSelected ? 'bg-primary/15 !text-white/70' : '',
                  ].join(' ')}
                >
                  {format(day, 'd')}
                  {isStart && selectedStart !== selectedEnd && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-3 border-t border-zinc-800/70">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-emerald-500/40" />
          <span className="text-[11px] font-semibold text-zinc-500">Disponível</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-amber-500/40" />
          <span className="text-[11px] font-semibold text-zinc-500">Parcial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-red-500/30" />
          <span className="text-[11px] font-semibold text-zinc-500">Ocupado</span>
        </div>
      </div>

      {onRangeChange && (
        <p className="text-center text-[11px] text-zinc-400 font-medium">
          {!pendingStart || selectedEnd
            ? 'Clique em uma data para iniciar a seleção'
            : 'Clique em outra data para definir o período'}
        </p>
      )}
    </div>
  );
}
