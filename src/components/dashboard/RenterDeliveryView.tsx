import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, KeyRound, MapPin, Phone, Store, Truck, User } from 'lucide-react';

/**
 * Entrega vista por quem alugou: só o que interessa ao cliente (em que pé está,
 * onde e quando chega, o código para o motorista). A operação da locadora
 * (separação, número de série, despacho) fica no LogisticsTab.
 */

const RENTER_STATUS: Record<string, { title: string; text: (pickup: boolean) => string }> = {
  pending:   { title: 'Pedido aprovado',            text: () => 'A locadora vai começar a separar o seu equipamento.' },
  picking:   { title: 'Em separação',               text: () => 'A locadora está separando e conferindo o seu equipamento.' },
  ready:     { title: 'Pronto',                     text: pickup => (pickup ? 'Pode retirar na locadora. Apresente o código abaixo.' : 'Separado e aguardando o envio.') },
  shipped:   { title: 'A caminho',                  text: () => 'O equipamento saiu para entrega. Passe o código abaixo ao motorista.' },
  delivered: { title: 'Entregue',                   text: () => 'Confira o equipamento e confirme o recebimento no pedido.' },
  confirmed: { title: 'Recebido',                   text: () => 'Você confirmou o recebimento. Bom set!' },
  cancelled: { title: 'Entrega cancelada',          text: () => 'Fale com a locadora para entender o que aconteceu.' },
};

export function RenterDeliveryView({ deliveries }: { deliveries: any[] }) {
  if (deliveries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center">
        <p className="text-sm font-semibold text-zinc-300">A entrega ainda não começou</p>
        <p className="text-sm text-zinc-500 mt-1">Assim que a locadora aprovar e começar a separar, você acompanha aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deliveries.map((d: any) => {
        const booking = d.booking || {};
        const pickup = booking.delivery_method !== 'delivery';
        const info = RENTER_STATUS[d.status] || { title: d.status, text: () => '' };
        const token = d.delivery_token || d.delivery_secrets?.[0]?.token;
        // O código só serve na hora de receber: na retirada (pronto) ou com o motorista (a caminho)
        const showToken = token && ((pickup && d.status === 'ready') || d.status === 'shipped');

        return (
          <div key={d.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 md:p-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {pickup ? <Store className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <p className="text-xs text-zinc-500 truncate">{booking.equipment?.name || 'Equipamento'}{d.quantity > 1 ? ` · ${d.quantity} un.` : ''}</p>
                <p className="text-base font-bold text-zinc-100">{info.title}</p>
                <p className="text-sm text-zinc-400 leading-snug">{info.text(pickup)}</p>
              </div>
            </div>

            {showToken && (
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-primary">Código de recebimento</p>
                  <p className="text-2xl font-bold tracking-[0.3em] text-zinc-100 tabular-nums">{token}</p>
                </div>
              </div>
            )}

            <ul className="space-y-2 text-sm text-zinc-400">
              {!pickup && booking.delivery_address && (
                <li className="flex gap-2"><MapPin className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" /> {booking.delivery_address}</li>
              )}
              {!pickup && booking.delivery_contact && (
                <li className="flex gap-2"><User className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" /> Recebe: {booking.delivery_contact}</li>
              )}
              {d.estimated_arrival && d.status === 'shipped' && (
                <li className="flex gap-2"><Clock className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" /> Previsão de chegada: {format(new Date(d.estimated_arrival), "HH:mm 'de' dd/MM", { locale: ptBR })}</li>
              )}
              {d.driver_name && (d.status === 'shipped' || d.status === 'delivered') && (
                <li className="flex gap-2">
                  <Phone className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                  Motorista: {d.driver_name}
                  {d.driver_phone && <a href={`tel:${d.driver_phone}`} className="text-primary font-semibold">{d.driver_phone}</a>}
                </li>
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
