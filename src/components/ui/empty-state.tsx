import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Tela vazia padrão: ícone, o que ainda não existe, por quê, e o próximo passo.
 *
 *   <EmptyState icon={Inbox} title="Nenhum pedido ainda" description="…"
 *     action={{ label: 'Explorar equipamentos', onClick: () => navigate('/') }} />
 */
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  /** Versão menor, para dentro de cartões */
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, secondaryAction, compact = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4 gap-3' : 'py-14 md:py-20 px-6 gap-4 border border-dashed border-zinc-800 rounded-2xl'}`}>
      <div className={`${compact ? 'h-11 w-11' : 'h-14 w-14'} rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center`}>
        <Icon className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} text-zinc-500`} aria-hidden />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className={`${compact ? 'text-sm' : 'text-base'} font-bold text-zinc-100`}>{title}</h3>
        {description && <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {action && (
            <Button onClick={action.onClick} className={`rounded-xl font-semibold text-sm ${compact ? 'h-10 px-4' : 'h-11 px-5'}`}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick} className={`rounded-xl font-semibold text-sm text-zinc-400 ${compact ? 'h-10 px-4' : 'h-11 px-5'}`}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
