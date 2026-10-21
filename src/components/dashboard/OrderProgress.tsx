import { Check, X } from 'lucide-react';

/**
 * Progresso do pedido em bolinhas: preenchidas até a etapa atual.
 * Junta o status do pedido (bookings) com o da entrega (deliveries).
 */

const STEPS = ['Recebido', 'Aprovado', 'Em separação', 'Pronto', 'Em trânsito', 'Entregue', 'Concluído'];

function currentStep(bookingStatus: string, deliveryStatus?: string | null): number {
  if (bookingStatus === 'completed') return 6;
  if (bookingStatus === 'pending') return 0;
  switch (deliveryStatus) {
    case 'picking':   return 2;
    case 'ready':     return 3;
    case 'shipped':   return 4;
    case 'delivered':
    case 'confirmed': return 5;
  }
  if (bookingStatus === 'active') return 5;
  return 1; // aprovado, entrega ainda não começou
}

interface OrderProgressProps {
  bookingStatus: string;
  deliveryStatus?: string | null;
  /** Versão da lista: só as bolinhas e o nome da etapa atual */
  compact?: boolean;
}

export function OrderProgress({ bookingStatus, deliveryStatus, compact = false }: OrderProgressProps) {
  const stopped = bookingStatus === 'rejected' || bookingStatus === 'cancelled';

  if (stopped) {
    return (
      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-400">
        <X className="h-3.5 w-3.5" /> {bookingStatus === 'rejected' ? 'Pedido recusado' : 'Pedido cancelado'}
      </div>
    );
  }

  const step = currentStep(bookingStatus, deliveryStatus);
  const done = step === STEPS.length - 1;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= step ? (done ? 'bg-emerald-500' : 'bg-primary') : 'bg-zinc-800'
              } ${i === step && !done ? 'w-4' : 'w-1.5'}`}
            />
          ))}
        </div>
        <span className={`text-[11px] font-bold ${done ? 'text-emerald-400' : 'text-zinc-300'}`}>{STEPS[step]}</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
      <ol className="flex items-start min-w-[520px]">
        {STEPS.map((label, i) => {
          const filled = i <= step;
          const isCurrent = i === step && !done;
          return (
            <li key={label} className="flex-1 flex flex-col items-center relative">
              {/* Linha até a próxima bolinha */}
              {i < STEPS.length - 1 && (
                <span className={`absolute top-3 left-1/2 w-full h-0.5 ${i < step ? (done ? 'bg-emerald-500' : 'bg-primary') : 'bg-zinc-800'}`} />
              )}
              <span
                className={`relative z-10 h-6 w-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                  filled
                    ? done ? 'bg-emerald-500 border-emerald-500' : 'bg-primary border-primary'
                    : 'bg-zinc-950 border-zinc-700'
                } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
              >
                {filled && i < step && <Check className="h-3.5 w-3.5 text-white" />}
                {filled && i === step && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
              <span className={`mt-2 text-[11px] font-bold text-center leading-tight px-1 ${
                isCurrent ? 'text-white' : filled ? 'text-zinc-300' : 'text-zinc-600'
              }`}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
