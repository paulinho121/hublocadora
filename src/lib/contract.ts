/**
 * Contrato de locação (V46).
 *
 * O banco gera o contrato com os dados do pedido (`data`) quando a locadora aprova.
 * O texto é montado aqui a partir desses dados. Na assinatura do cliente o texto exato
 * vai para o banco (`content`) com o hash SHA-256; a locadora contra-assina esse
 * mesmo texto. Depois disso, o contrato mostrado é sempre o `content` gravado.
 */
import { formatShootDays, weekdayShort, dayMonth } from '@/lib/schedule';

export type ContractStatus = 'awaiting_renter' | 'awaiting_company' | 'signed' | 'void';

export interface ContractItem {
  booking_id: string;
  name: string;
  brand?: string | null;
  quantity: number;
  daily_rate: number;
  pickup_date: string;
  return_date: string;
  shoot_dates: string[];
  shoot_start?: string | null;
  shoot_end?: string | null;
  total: number;
}

export interface ContractData {
  project_name?: string | null;
  company: { name: string; document?: string | null; address?: string | null; city?: string | null; state?: string | null };
  renter: { name?: string | null; email?: string | null; company_name?: string | null; company_document?: string | null };
  pickup_date: string;
  return_date: string;
  delivery_method: 'pickup' | 'delivery';
  delivery_address?: string | null;
  items: ContractItem[];
  total: number;
  generated_at: string;
}

export interface RentalContract {
  id: string;
  code: string;
  project_id: string | null;
  company_id: string;
  renter_id: string;
  booking_ids: string[];
  data: ContractData;
  template_version: string;
  status: ContractStatus;
  content: string | null;
  content_hash: string | null;
  renter_signed_at: string | null;
  renter_signer_name: string | null;
  renter_signer_document: string | null;
  renter_ip: string | null;
  renter_user_agent: string | null;
  company_signed_at: string | null;
  company_signer_name: string | null;
  company_signer_document: string | null;
  company_ip: string | null;
  company_user_agent: string | null;
  void_reason: string | null;
  /** V47: assinado pelo app ou no papel (via assinada enviada pela locadora) */
  signature_method?: 'electronic' | 'paper';
  paper_file_path?: string | null;
  paper_signed_date?: string | null;
  paper_registered_at?: string | null;
  paper_registered_by_name?: string | null;
  created_at: string;
}

export const CONTRACT_STATUS: Record<ContractStatus, { label: string; className: string }> = {
  awaiting_renter:  { label: 'Aguardando cliente',  className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  awaiting_company: { label: 'Aguardando locadora', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  signed:           { label: 'Contrato assinado',   className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  void:             { label: 'Substituído',         className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
};

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

/** "123.456.789-09" / "12.345.678/0001-90" (ou o texto como veio) */
export function formatDocument(doc?: string | null) {
  const d = (doc || '').replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return doc || '';
}

/** "26/10/2026 às 14:32" no fuso do aparelho */
export function formatSignedAt(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} às ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const fullDate = (d: string) => `${weekdayShort(d)}/${d.slice(0, 4)}`;

function itemShootDays(i: ContractItem) {
  if (i.shoot_dates?.length) return i.shoot_dates;
  if (i.shoot_start && i.shoot_end) {
    const out: string[] = [];
    for (let d = new Date(i.shoot_start + 'T00:00'); ; d.setDate(d.getDate() + 1)) {
      const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push(s);
      if (s >= i.shoot_end) break;
    }
    return out;
  }
  return [];
}

/** Texto do contrato (modelo padrão CineHub, versão 1) */
export function renderContractText(data: ContractData, code: string): string {
  const c = data.company;
  const r = data.renter;
  const renterName = r.company_name || r.name || 'Cliente';
  const renterDoc = r.company_name && r.company_document ? `, inscrita no CNPJ/CPF ${formatDocument(r.company_document)}` : '';
  const renterContact = [r.company_name && r.name ? `representada por ${r.name}` : null, r.email ? `e-mail ${r.email}` : null]
    .filter(Boolean).join(', ');
  const forum = [c.city, c.state].filter(Boolean).join('/') || 'da sede da LOCADORA';

  const items = data.items.map((i, n) => {
    const days = itemShootDays(i);
    const brand = i.brand ? ` (${i.brand})` : '';
    const shoot = days.length
      ? `gravação em ${formatShootDays(days)} (${days.length} ${days.length === 1 ? 'diária' : 'diárias'})`
      : `de ${dayMonth(i.pickup_date)} a ${dayMonth(i.return_date)}`;
    return `  1.${n + 1}. ${i.quantity} × ${i.name}${brand} — diária de ${brl(i.daily_rate)} por unidade — ${shoot} — subtotal ${brl(i.total)}.`;
  }).join('\n');

  const allShoot = [...new Set(data.items.flatMap(itemShootDays))].sort();
  const handover = data.delivery_method === 'delivery'
    ? `entregue pela LOCADORA no endereço ${data.delivery_address || 'informado no pedido'}`
    : 'retirado pelo LOCATÁRIO no endereço da LOCADORA';

  return [
    'CONTRATO DE LOCAÇÃO DE EQUIPAMENTOS AUDIOVISUAIS',
    `Nº ${code}${data.project_name ? ` · Projeto: ${data.project_name}` : ''}`,
    '',
    'PARTES',
    `LOCADORA: ${c.name}${c.document ? `, inscrita no CNPJ/CPF ${formatDocument(c.document)}` : ''}${c.address ? `, com endereço em ${c.address}` : ''}.`,
    `LOCATÁRIO: ${renterName}${renterDoc}${renterContact ? `, ${renterContact}` : ''}, qualificado pelo nome e CPF/CNPJ informados na assinatura eletrônica ao final deste contrato.`,
    '',
    'As partes, por meio da plataforma CineHub, celebram este contrato de locação de bens móveis, regido pelos artigos 565 a 578 do Código Civil e pelas cláusulas abaixo.',
    '',
    'CLÁUSULA 1 — OBJETO',
    'A LOCADORA aluga ao LOCATÁRIO os seguintes equipamentos, com seus acessórios, cabos, baterias e cases:',
    items,
    '',
    'CLÁUSULA 2 — PRAZO',
    `2.1. Retirada/entrega: ${fullDate(data.pickup_date)}. Devolução: ${fullDate(data.return_date)}.`,
    allShoot.length
      ? `2.2. Dias de gravação (cobrados): ${formatShootDays(allShoot)}. Os demais dias entre a retirada e a devolução não são cobrados, mas o equipamento permanece sob a guarda e a responsabilidade do LOCATÁRIO.`
      : '2.2. O equipamento permanece sob a guarda e a responsabilidade do LOCATÁRIO da retirada à devolução.',
    '2.3. Retiradas e devoluções acontecem de segunda a sexta-feira, no horário de funcionamento da LOCADORA.',
    '2.4. A prorrogação depende de pedido pela plataforma e de aprovação da LOCADORA, com cobrança das diárias adicionais.',
    '',
    'CLÁUSULA 3 — PREÇO E PAGAMENTO',
    `3.1. O valor total da locação é de ${brl(data.total)}, correspondente às diárias de gravação descritas na Cláusula 1.`,
    '3.2. O pagamento será feito pelos meios disponíveis na plataforma CineHub ou na forma combinada entre as partes, antes da retirada, salvo acordo diferente por escrito.',
    '',
    'CLÁUSULA 4 — RETIRADA, ENTREGA E CONFERÊNCIA',
    `4.1. O equipamento será ${handover}. A entrega é confirmada pelo código de segurança do LOCATÁRIO na plataforma.`,
    '4.2. O LOCATÁRIO deve conferir o equipamento no recebimento. Defeitos ou faltas não apontados nesse momento presumem o recebimento em perfeito estado de funcionamento e conservação.',
    '4.3. Na devolução, a LOCADORA confere o equipamento e registra qualquer dano, falta ou necessidade de limpeza.',
    '',
    'CLÁUSULA 5 — USO E GUARDA',
    '5.1. O LOCATÁRIO usará o equipamento apenas na produção indicada, por pessoal qualificado, seguindo as orientações do fabricante, e o transportará e guardará de forma adequada.',
    '5.2. É proibido sublocar, emprestar, ceder ou dar o equipamento em garantia, bem como abri-lo ou repará-lo sem autorização da LOCADORA.',
    '',
    'CLÁUSULA 6 — DANOS, PERDA, ROUBO OU FURTO',
    '6.1. Da retirada à devolução, o LOCATÁRIO responde por danos, perda, roubo ou furto do equipamento, exceto o desgaste natural do uso correto.',
    '6.2. Em caso de dano, o LOCATÁRIO pagará o conserto em assistência indicada pela LOCADORA. Em caso de perda total, roubo ou furto, pagará o valor de reposição de mercado de equipamento equivalente, novo ou em estado equivalente.',
    '6.3. Qualquer ocorrência deve ser comunicada à LOCADORA em até 24 horas. Em roubo ou furto, o LOCATÁRIO apresentará o boletim de ocorrência.',
    '6.4. Enquanto o equipamento estiver parado por conserto causado pelo LOCATÁRIO, ou até a reposição, podem ser cobradas as diárias que a LOCADORA deixar de receber, limitadas a 10 (dez) diárias.',
    '',
    'CLÁUSULA 7 — ATRASO NA DEVOLUÇÃO',
    '7.1. A devolução após a data combinada, sem prorrogação aprovada, sujeita o LOCATÁRIO ao pagamento de uma diária por dia de atraso para cada equipamento, além de multa de 10% (dez por cento) sobre o valor das diárias em atraso.',
    '',
    'CLÁUSULA 8 — CANCELAMENTO',
    '8.1. O cancelamento segue os Termos de Uso da plataforma CineHub. Depois da retirada/entrega, não há devolução das diárias contratadas.',
    '',
    'CLÁUSULA 9 — ASSINATURA ELETRÔNICA',
    '9.1. As partes aceitam a assinatura eletrônica deste contrato pela plataforma CineHub, nos termos do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020. São registrados o nome e o CPF/CNPJ de quem assina, a data e a hora, o endereço IP, o aparelho e o código (hash SHA-256) do texto assinado.',
    '9.2. A retirada ou entrega do equipamento só acontece depois da assinatura das duas partes.',
    '',
    'CLÁUSULA 10 — FORO',
    `10.1. Fica eleito o foro da comarca de ${forum} para resolver questões deste contrato.`,
  ].join('\n');
}

/** Texto a mostrar e assinar: o gravado (depois da assinatura do cliente) ou o montado agora */
export function contractText(c: RentalContract) {
  return c.content || renderContractText(c.data, c.code);
}

/** Assinado no papel: a via assinada foi enviada pela locadora */
export function isPaperSigned(c: RentalContract) {
  return c.status === 'signed' && c.signature_method === 'paper';
}

/** "26/10/2026" a partir de 'yyyy-MM-dd' */
export function formatDay(d?: string | null) {
  return d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '';
}

/** Contrato vigente (não substituído) que cobre algum destes pedidos */
export function contractFor(contracts: RentalContract[] | undefined, bookingIds: string[]) {
  return (contracts || [])
    .filter(c => c.status !== 'void' && c.booking_ids.some(id => bookingIds.includes(id)))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] || null;
}

/** É a vez de quem está olhando assinar? */
export function isMyTurn(c: RentalContract, role: 'renter' | 'provider') {
  return (role === 'renter' && c.status === 'awaiting_renter') || (role === 'provider' && c.status === 'awaiting_company');
}
