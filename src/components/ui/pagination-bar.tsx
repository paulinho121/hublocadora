import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationBarProps {
  page: number;          // 0-indexed
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationBar({ page, totalPages, totalItems, pageSize, onPageChange, className = '' }: PaginationBarProps) {
  if (totalPages <= 1) return null;

  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalItems);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-zinc-900 ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-600">
        Exibindo <span className="text-zinc-400">{from}–{to}</span> de <span className="text-zinc-400">{totalItems}</span> registros
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(0)}
          disabled={page === 0}
          className="h-9 w-9 p-0 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-30"
          aria-label="Primeira página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          className="h-9 w-9 p-0 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-30"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1 mx-2">
          {Array.from({ length: totalPages }, (_, i) => i)
            .filter(i => Math.abs(i - page) <= 2 || i === 0 || i === totalPages - 1)
            .reduce<(number | 'ellipsis')[]>((acc, i, idx, arr) => {
              if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
              acc.push(i);
              return acc;
            }, [])
            .map((item, idx) =>
              item === 'ellipsis' ? (
                <span key={`ellipsis-${idx}`} className="text-zinc-700 text-xs px-1">…</span>
              ) : (
                <button
                  key={item}
                  onClick={() => onPageChange(item as number)}
                  className={`h-9 min-w-[36px] px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    item === page
                      ? 'bg-primary text-white shadow-[0_0_16px_rgba(var(--primary-rgb),0.3)]'
                      : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {(item as number) + 1}
                </button>
              )
            )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          className="h-9 w-9 p-0 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-30"
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={page >= totalPages - 1}
          className="h-9 w-9 p-0 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 disabled:opacity-30"
          aria-label="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
