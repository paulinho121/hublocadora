import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Confirmação no visual do app, no lugar do window.confirm() do navegador.
 *
 *   if (!(await confirmAction({ title: 'Excluir pedido?', destructive: true }))) return;
 *
 * Funciona de qualquer lugar; o <ConfirmHost /> (montado no App) desenha a janela.
 */

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type Request = ConfirmOptions & { resolve: (ok: boolean) => void };

let open: ((req: Request) => void) | null = null;

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    if (!open) return resolve(window.confirm(options.title)); // host não montado
    open({ ...options, resolve });
  });
}

export function ConfirmHost() {
  const [request, setRequest] = useState<Request | null>(null);

  useEffect(() => {
    open = setRequest;
    return () => { open = null; };
  }, []);

  if (!request) return null;

  const close = (ok: boolean) => {
    request.resolve(ok);
    setRequest(null);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => close(false)} />
      <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        <h2 id="confirm-title" className="text-lg font-bold text-white">{request.title}</h2>
        {request.description && <p className="text-sm text-zinc-400 leading-relaxed">{request.description}</p>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button variant="ghost" onClick={() => close(false)} className="h-12 flex-1 rounded-xl text-zinc-300">
            {request.cancelLabel || 'Cancelar'}
          </Button>
          <Button
            autoFocus
            onClick={() => close(true)}
            className={`h-12 flex-1 rounded-xl font-bold ${request.destructive ? 'bg-red-600 hover:bg-red-500 text-white' : ''}`}
          >
            {request.confirmLabel || 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
