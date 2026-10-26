import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { CheckCircle2, Clock, FileSignature, FileText, Loader2, Lock, Printer, X, Upload, PenLine, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useContracts, useSignContract, useRegisterPaperSignature, usePaperCopyUrl } from '@/hooks/useContracts';
import { friendlyError } from '@/lib/errors';
import { validateDocument } from '@/lib/document-validators';
import {
  RentalContract, CONTRACT_STATUS, contractFor, contractText, formatDocument, formatSignedAt, isMyTurn, isPaperSigned, formatDay,
} from '@/lib/contract';
import { printContract } from '@/lib/contractPrint';

type Role = 'renter' | 'provider';

/** Um contrato por locadora: o pedido do cliente pode juntar itens de várias */
export function OrderContracts({ bookings, role }: { bookings: any[]; role: Role }) {
  const byCompany = new Map<string, any[]>();
  bookings.forEach(b => byCompany.set(b.company_id, [...(byCompany.get(b.company_id) || []), b]));
  return (
    <>
      {[...byCompany.entries()].map(([companyId, items]) => (
        <ContractPanel key={companyId} bookings={items} role={role} />
      ))}
    </>
  );
}

/**
 * Contrato do pedido no detalhe (um item ou o pedido completo): status das duas
 * assinaturas e o botão para ler/assinar. Some quando o pedido não exige contrato
 * (pedidos antigos, ou banco sem a V46).
 */
export function ContractPanel({ bookings, role }: { bookings: any[]; role: Role }) {
  const { data: contracts } = useContracts();
  const [open, setOpen] = useState(false);
  const [paperOpen, setPaperOpen] = useState(false);

  const required = bookings.filter(b => b.contract_required && !['rejected', 'cancelled'].includes(b.status));
  if (required.length === 0) return null;

  const contract = contractFor(contracts, required.map(b => b.id));

  if (!contract) {
    // Contrato só nasce quando a locadora responde todos os itens dela
    if (!required.some(b => b.status === 'pending')) return null;
    return (
      <section className="rounded-3xl border border-zinc-900 bg-zinc-900/30 p-5 md:p-6 flex gap-3 items-start">
        <FileText className="h-5 w-5 text-zinc-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-zinc-200">Contrato de locação</p>
          <p className="text-sm text-zinc-500">
            {role === 'provider'
              ? 'O contrato é gerado quando você aprovar o pedido. O cliente assina e você contra-assina.'
              : 'O contrato é gerado quando a locadora aprovar o pedido. Você assina e a locadora contra-assina.'}
          </p>
        </div>
      </section>
    );
  }

  const myTurn = isMyTurn(contract, role);
  const st = CONTRACT_STATUS[contract.status];

  return (
    <section className={`rounded-3xl border p-5 md:p-6 space-y-4 ${myTurn ? 'border-amber-500/30 bg-amber-500/[0.04]' : 'border-zinc-900 bg-zinc-900/30'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileSignature className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-black tracking-tight uppercase">Contrato de locação</p>
            <p className="text-xs text-zinc-500 font-medium">Nº {contract.code}</p>
          </div>
        </div>
        <Badge className={`text-[11px] font-semibold ${st.className}`}>{st.label}</Badge>
      </div>

      {isPaperSigned(contract) ? (
        <PaperSignedRow contract={contract} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <SignerRow label="Cliente" signedAt={contract.renter_signed_at} name={contract.renter_signer_name} />
          <SignerRow label="Locadora" signedAt={contract.company_signed_at} name={contract.company_signer_name} />
        </div>
      )}

      {contract.status !== 'signed' && (
        <p className="text-xs text-zinc-400 flex gap-2">
          <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          A retirada/entrega só é liberada depois das duas assinaturas.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={() => setOpen(true)}
          className={`w-full sm:w-auto h-12 rounded-xl font-semibold ${myTurn ? 'bg-amber-500 text-black hover:bg-amber-400' : ''}`}
          variant={myTurn ? 'default' : 'outline'}
        >
          {myTurn ? (role === 'renter' ? 'Ler e assinar o contrato' : 'Ler e contra-assinar') : 'Ver contrato'}
        </Button>
        <Button onClick={() => printContract(contract)} variant="ghost" className="w-full sm:w-auto h-12 rounded-xl font-semibold gap-2 text-zinc-400 hover:text-white">
          <Printer className="h-4 w-4" /> Imprimir / Baixar PDF
        </Button>
        {role === 'provider' && contract.status !== 'signed' && !paperOpen && (
          <Button onClick={() => setPaperOpen(true)} variant="ghost" className="w-full sm:w-auto h-12 rounded-xl font-semibold gap-2 text-zinc-400 hover:text-white">
            <PenLine className="h-4 w-4" /> Assinado no papel
          </Button>
        )}
      </div>

      {paperOpen && <PaperSignatureForm contract={contract} onDone={() => setPaperOpen(false)} />}

      {open && <ContractSheet contract={contract} role={role} onClose={() => setOpen(false)} />}
    </section>
  );
}

function SignerRow({ label, signedAt, name }: { label: string; signedAt: string | null; name: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 px-4 py-3 min-w-0">
      {signedAt
        ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        : <Clock className="h-5 w-5 text-zinc-500 shrink-0" />}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-zinc-500">{label}</p>
        <p className="text-sm font-bold text-zinc-100 truncate">
          {signedAt ? `${name} · ${formatSignedAt(signedAt)}` : 'Aguardando assinatura'}
        </p>
      </div>
    </div>
  );
}

/** Contrato assinado no papel: data da via assinada, quem registrou e o arquivo */
function PaperSignedRow({ contract }: { contract: RentalContract }) {
  const { data: url, isLoading } = usePaperCopyUrl(contract.paper_file_path);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 px-4 py-3">
      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
      <div className="min-w-[12rem] flex-1">
        <p className="text-[11px] font-semibold text-zinc-500">Assinado no papel pelas duas partes</p>
        <p className="text-sm font-bold text-zinc-100">Em {formatDay(contract.paper_signed_date)}</p>
        <p className="text-xs text-zinc-500">Via enviada por {contract.paper_registered_by_name} · {formatSignedAt(contract.paper_registered_at)}</p>
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="h-11 px-4 rounded-xl border border-zinc-800 flex items-center gap-2 text-sm font-semibold text-zinc-200 hover:border-zinc-600">
          <ExternalLink className="h-4 w-4" /> Ver via assinada
        </a>
      ) : isLoading ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : null}
    </div>
  );
}

/** Locadora: as duas partes assinaram a via impressa → envia o arquivo e libera a entrega */
function PaperSignatureForm({ contract, onDone }: { contract: RentalContract; onDone: () => void }) {
  const { profile } = useAuth();
  const register = useRegisterPaperSignature();
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [file, setFile] = useState<File | null>(null);
  const [signedDate, setSignedDate] = useState(todayStr);
  const [name, setName] = useState(profile?.full_name || '');
  const [confirmed, setConfirmed] = useState(false);

  const tooBig = !!file && file.size > 15 * 1024 * 1024;
  const nameOk = name.trim().length >= 5 && name.trim().includes(' ');
  const canSubmit = !!file && !tooBig && !!signedDate && signedDate <= todayStr && nameOk && confirmed && !register.isPending;

  const handleSubmit = async () => {
    if (!file) return;
    try {
      await register.mutateAsync({ contract, file, signedDate, registeredBy: name.trim() });
      toast.success('Via assinada registrada. A retirada/entrega está liberada.');
      onDone();
    } catch (err) {
      toast.error(friendlyError(err));
    }
  };

  const inputClass = 'w-full h-12 rounded-xl bg-zinc-900 border border-zinc-800 px-4 text-base text-zinc-100 focus:outline-none focus:border-primary';

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-bold text-zinc-100">Contrato assinado no papel</p>
        <p className="text-xs text-zinc-500">
          Imprima o contrato, colha a assinatura do cliente e a sua e envie a via assinada (PDF ou foto de todas as páginas). Isso substitui a assinatura pelo app.
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-zinc-400">Via assinada (PDF ou foto, até 15 MB)</span>
        <span className={`flex items-center gap-3 h-12 rounded-xl border border-dashed px-4 cursor-pointer ${tooBig ? 'border-red-500/60' : file ? 'border-emerald-500/50' : 'border-zinc-700'}`}>
          <Upload className="h-4 w-4 text-zinc-400 shrink-0" />
          <span className="text-sm text-zinc-300 truncate">{file ? file.name : 'Escolher arquivo'}</span>
          <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={e => setFile(e.target.files?.[0] || null)} />
        </span>
        {tooBig && <span className="text-xs text-red-400">O arquivo passa de 15 MB.</span>}
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-zinc-400">Data das assinaturas</span>
          <input type="date" value={signedDate} max={todayStr} onChange={e => setSignedDate(e.target.value)} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-zinc-400">Seu nome completo</span>
          <input value={name} onChange={e => setName(e.target.value)} autoComplete="name" className={inputClass} />
        </label>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} className="mt-0.5 h-5 w-5" />
        <span className="text-sm text-zinc-300">
          Confirmo que o cliente e a locadora assinaram a via impressa do contrato nº {contract.code}.
        </span>
      </label>

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <Button variant="ghost" onClick={onDone} className="h-12 rounded-xl font-semibold">Cancelar</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit} className="h-12 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500">
          {register.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar e liberar a entrega'}
        </Button>
      </div>
    </div>
  );
}

/** Tela cheia no celular: texto do contrato, registro das assinaturas e o formulário de aceite */
function ContractSheet({ contract, role, onClose }: { contract: RentalContract; role: Role; onClose: () => void }) {
  const { profile } = useAuth();
  const { company } = useTenant();
  const sign = useSignContract();
  const myTurn = isMyTurn(contract, role);
  const text = contractText(contract);

  const [name, setName] = useState(profile?.full_name || '');
  const [doc, setDoc] = useState(role === 'provider' ? formatDocument(company?.document) : '');
  const [agreed, setAgreed] = useState(false);

  // Trava a rolagem da página por trás
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const nameOk = name.trim().length >= 5 && name.trim().includes(' ');
  const docOk = validateDocument(doc);
  const canSign = myTurn && nameOk && docOk && agreed && !sign.isPending;

  const handleSign = async () => {
    try {
      await sign.mutateAsync({ contractId: contract.id, name: name.trim(), document: doc, content: text });
      toast.success(role === 'renter'
        ? 'Contrato assinado. Agora falta a locadora contra-assinar.'
        : 'Contrato assinado pelas duas partes. A retirada/entrega está liberada.');
      onClose();
    } catch (err) {
      toast.error(friendlyError(err));
    }
  };


  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="contract-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl h-[100dvh] sm:h-[90vh] bg-zinc-950 text-zinc-100 sm:rounded-3xl border border-zinc-900 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
        <header className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-zinc-900 shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <h2 id="contract-title" className="text-base sm:text-lg font-black tracking-tight uppercase truncate">Contrato de locação</h2>
            <p className="text-xs text-zinc-500">Nº {contract.code} · {CONTRACT_STATUS[contract.status].label}</p>
          </div>
          <button onClick={() => printContract(contract)} className="h-11 px-3 rounded-xl flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs font-semibold" aria-label="Imprimir ou baixar PDF">
            <Printer className="h-5 w-5" /> <span className="hidden sm:inline">Imprimir / Baixar PDF</span>
          </button>
          <button onClick={onClose} className="h-11 w-11 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-8 py-5 space-y-6">
          <pre className="whitespace-pre-wrap break-words font-sans text-[13px] sm:text-sm leading-relaxed text-zinc-300">{text}</pre>

          <SignatureLog contract={contract} />
        </div>

        {myTurn && (
          <footer className="shrink-0 border-t border-zinc-900 bg-zinc-950 px-4 sm:px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-zinc-400">Nome completo de quem assina</span>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                  className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-800 px-4 text-base text-zinc-100 focus:outline-none focus:border-primary"
                />
              </label>
              <label className="space-y-1.5 block">
                <span className="text-xs font-semibold text-zinc-400">{role === 'provider' ? 'CNPJ da locadora ou seu CPF' : 'CPF ou CNPJ'}</span>
                <input
                  value={doc}
                  onChange={e => setDoc(e.target.value)}
                  onBlur={() => setDoc(d => formatDocument(d))}
                  inputMode="numeric"
                  className={`w-full h-12 rounded-xl bg-zinc-900 border px-4 text-base text-zinc-100 focus:outline-none focus:border-primary ${doc && !docOk ? 'border-red-500/60' : 'border-zinc-800'}`}
                />
              </label>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={agreed} onCheckedChange={v => setAgreed(v === true)} className="mt-0.5 h-5 w-5" />
              <span className="text-sm text-zinc-300">
                Li e concordo com todas as cláusulas. Sei que esta assinatura eletrônica registra meu nome, documento, data, hora, IP e aparelho.
              </span>
            </label>
            <Button onClick={handleSign} disabled={!canSign} className="w-full h-12 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500">
              {sign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : role === 'renter' ? 'Assinar contrato' : 'Contra-assinar contrato'}
            </Button>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

function SignatureLog({ contract }: { contract: RentalContract }) {
  const rows = [
    { label: 'LOCATÁRIO', at: contract.renter_signed_at, name: contract.renter_signer_name, doc: contract.renter_signer_document, ip: contract.renter_ip },
    { label: 'LOCADORA', at: contract.company_signed_at, name: contract.company_signer_name, doc: contract.company_signer_document, ip: contract.company_ip },
  ];
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
      <p className="text-xs font-black tracking-wider text-zinc-400 uppercase">Assinaturas eletrônicas</p>
      {rows.map(r => (
        <div key={r.label} className="text-sm">
          <p className="font-bold text-zinc-200">{r.label}</p>
          {r.at
            ? <p className="text-zinc-400 break-words">{r.name} · {formatDocument(r.doc)} · {formatSignedAt(r.at)}{r.ip ? ` · IP ${r.ip}` : ''}</p>
            : <p className="text-zinc-500">Aguardando assinatura</p>}
        </div>
      ))}
      {isPaperSigned(contract) && (
        <p className="text-sm text-zinc-300">
          <span className="font-bold text-zinc-200">Assinado no papel</span> em {formatDay(contract.paper_signed_date)} · via enviada por {contract.paper_registered_by_name} em {formatSignedAt(contract.paper_registered_at)}
        </p>
      )}
      {contract.content_hash && (
        <p className="text-[11px] text-zinc-500 break-all">Código do texto assinado (SHA-256): {contract.content_hash}</p>
      )}
    </div>
  );
}
