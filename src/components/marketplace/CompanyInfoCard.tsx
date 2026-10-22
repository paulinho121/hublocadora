import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin, Package, CalendarCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { supabase } from '@/lib/supabase';

interface PublicCompany {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  created_at?: string | null;
}

/** "Sobre a locadora": quem aluga o equipamento, onde fica e há quanto tempo está no CineHub */
export function CompanyInfoCard({ company }: { company?: PublicCompany | null }) {
  const [expanded, setExpanded] = useState(false);

  const { data: catalogCount } = useQuery({
    queryKey: ['company-catalog-count', company?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('equipments')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company!.id)
        .neq('status', 'unavailable');
      if (error) return null;
      return count ?? 0;
    },
    enabled: !!company?.id,
    staleTime: 5 * 60_000,
  });

  if (!company) return null;

  const city = [company.address_city, company.address_state].filter(Boolean).join(' - ');
  const since = company.created_at ? format(new Date(company.created_at), "MMMM 'de' yyyy", { locale: ptBR }) : null;
  const description = company.description?.trim();
  const longDescription = (description?.length || 0) > 160;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 md:p-5 space-y-4" aria-labelledby="company-info-title">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
          {company.logo_url
            ? <img src={company.logo_url} alt={`Logo da ${company.name}`} className="h-full w-full object-cover" />
            : <Building2 className="h-5 w-5 text-primary" />}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-zinc-500">Locadora</p>
          <h3 id="company-info-title" className="text-base font-bold text-white truncate">{company.name}</h3>
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-400">
        {city && <li className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-zinc-500" /> {city}</li>}
        {typeof catalogCount === 'number' && catalogCount > 0 && (
          <li className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-zinc-500" /> {catalogCount} {catalogCount === 1 ? 'equipamento' : 'equipamentos'} no catálogo</li>
        )}
        {since && <li className="flex items-center gap-1.5"><CalendarCheck className="h-3.5 w-3.5 text-zinc-500" /> No CineHub desde {since}</li>}
      </ul>

      {description && (
        <div>
          <p className={`text-sm text-zinc-400 leading-relaxed ${!expanded && longDescription ? 'line-clamp-3' : ''}`}>{description}</p>
          {longDescription && (
            <button onClick={() => setExpanded(v => !v)} className="mt-1 text-xs font-semibold text-primary hover:underline">
              {expanded ? 'Ver menos' : 'Ver mais'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
