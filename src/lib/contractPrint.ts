/**
 * Versão do contrato para impressão (A4) ou "Salvar como PDF" do navegador.
 *
 * Em vez de abrir outra janela ou iframe (o PWA do iOS não imprime bem assim), o
 * contrato vai para um bloco no próprio documento que só aparece na impressão;
 * o resto do app some com @media print.
 */
import { RentalContract, contractText, formatDocument, formatSignedAt, formatDay, isPaperSigned, CONTRACT_STATUS } from '@/lib/contract';

const ROOT_ID = 'contract-print-root';

const esc = (s: string) => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));

const PRINT_CSS = `
#${ROOT_ID} { display: none; }
@media print {
  @page { size: A4; margin: 18mm 16mm 20mm; }
  html, body { background: #fff !important; color: #111 !important; height: auto !important; overflow: visible !important; }
  body > *:not(#${ROOT_ID}) { display: none !important; }
  #${ROOT_ID} { display: block; font: 10.5pt/1.5 Georgia, 'Times New Roman', serif; color: #111; }
  #${ROOT_ID} * { color: #111; background: transparent; box-shadow: none; }
  #${ROOT_ID} .ct-head { margin-bottom: 14pt; }
  #${ROOT_ID} .ct-head p { text-align: center; }
  #${ROOT_ID} .ct-title { font: 700 13pt/1.3 Arial, Helvetica, sans-serif; letter-spacing: .02em; margin: 0 0 3pt; }
  #${ROOT_ID} .ct-sub { font: 9pt/1.4 Arial, Helvetica, sans-serif; color: #444; margin: 0; }
  #${ROOT_ID} h2 { font: 700 10pt/1.3 Arial, Helvetica, sans-serif; margin: 12pt 0 4pt; break-after: avoid; page-break-after: avoid; }
  #${ROOT_ID} p { margin: 0 0 4pt; text-align: justify; orphans: 3; widows: 3; }
  #${ROOT_ID} p.ct-item { padding-left: 14pt; text-align: left; }
  #${ROOT_ID} .ct-signs { display: flex; gap: 14mm; margin-top: 26pt; break-inside: avoid; page-break-inside: avoid; }
  #${ROOT_ID} .ct-sign { flex: 1; font: 9pt/1.5 Arial, Helvetica, sans-serif; }
  #${ROOT_ID} .ct-line { border-top: 1px solid #111; margin-top: 34pt; padding-top: 3pt; font-weight: 700; text-align: center; }
  #${ROOT_ID} .ct-field { border-bottom: 1px dotted #777; margin-top: 9pt; min-height: 13pt; }
  #${ROOT_ID} .ct-esign { margin-top: 8pt; padding: 6pt 8pt; border: 1px solid #999; font-size: 8pt; line-height: 1.45; }
  #${ROOT_ID} .ct-foot { margin-top: 18pt; padding-top: 6pt; border-top: 1px solid #ccc; font: 7.5pt/1.4 Arial, Helvetica, sans-serif; color: #555; word-break: break-all; }
}`;

/** Bloco de assinatura de uma parte: linha para assinar à mão + registro eletrônico, se houver */
function signBlock(role: string, partyName: string, at: string | null, name: string | null, doc: string | null, ip: string | null) {
  const signed = !!at;
  return `<div class="ct-sign">
    <div class="ct-line">${esc(role)}</div>
    <div style="text-align:center">${esc(partyName)}</div>
    <div class="ct-field">Nome: ${signed ? esc(name || '') : ''}</div>
    <div class="ct-field">CPF/CNPJ: ${signed ? esc(formatDocument(doc)) : ''}</div>
    <div class="ct-field">Data: ${signed ? esc(formatSignedAt(at).split(' às ')[0]) : '____/____/________'}</div>
    ${signed
      ? `<div class="ct-esign"><b>Assinado eletronicamente</b><br>${esc(name || '')} · ${esc(formatDocument(doc))}<br>${esc(formatSignedAt(at))}${ip ? ` · IP ${esc(ip)}` : ''}</div>`
      : ''}
  </div>`;
}

/** Converte o texto do contrato em parágrafos: títulos em negrito, itens recuados */
function bodyHtml(text: string) {
  const lines = text.split('\n');
  // As duas primeiras linhas (título e número) viram o cabeçalho
  return lines.slice(2).map(line => {
    const t = line.trim();
    if (!t) return '';
    if (/^(PARTES|CLÁUSULA \d+)/.test(t)) return `<h2>${esc(t)}</h2>`;
    if (/^1\.\d+\./.test(t)) return `<p class="ct-item">${esc(t)}</p>`;
    return `<p>${esc(t)}</p>`;
  }).join('\n');
}

export function contractPrintHtml(c: RentalContract) {
  const text = contractText(c);
  const [title, sub] = text.split('\n');
  const renterParty = c.data.renter.company_name || c.data.renter.name || 'LOCATÁRIO';
  const local = [c.data.company.city, c.data.company.state].filter(Boolean).join('/');

  return `<div class="ct-head"><p class="ct-title">${esc(title)}</p><p class="ct-sub">${esc(sub)}</p></div>
    ${bodyHtml(text)}
    <p style="margin-top:14pt">E, por estarem de acordo, as partes assinam este contrato${local ? ` em ${esc(local)}` : ''}.</p>
    <div class="ct-signs">
      ${signBlock('LOCADORA', c.data.company.name, c.company_signed_at, c.company_signer_name, c.company_signer_document, c.company_ip)}
      ${signBlock('LOCATÁRIO', renterParty, c.renter_signed_at, c.renter_signer_name, c.renter_signer_document, c.renter_ip)}
    </div>
    <div class="ct-signs" style="margin-top:14pt">
      <div class="ct-sign"><div class="ct-line" style="margin-top:26pt">Testemunha 1</div><div class="ct-field">Nome / CPF:</div></div>
      <div class="ct-sign"><div class="ct-line" style="margin-top:26pt">Testemunha 2</div><div class="ct-field">Nome / CPF:</div></div>
    </div>
    <div class="ct-foot">
      Contrato ${esc(c.code)} · ${esc(CONTRACT_STATUS[c.status].label)} · emitido pela plataforma CineHub em ${esc(formatSignedAt(new Date().toISOString()))}.
      ${isPaperSigned(c) ? `<br>Assinado no papel em ${esc(formatDay(c.paper_signed_date))}; via assinada registrada por ${esc(c.paper_registered_by_name || '')} em ${esc(formatSignedAt(c.paper_registered_at))}.` : ''}
      ${c.content_hash ? `<br>Código do texto assinado eletronicamente (SHA-256): ${esc(c.content_hash)}` : ''}
    </div>`;
}

/** Abre a impressão do sistema (no celular e no computador dá para "Salvar como PDF") */
export function printContract(c: RentalContract) {
  document.getElementById(ROOT_ID)?.remove();
  document.getElementById(`${ROOT_ID}-style`)?.remove();

  const style = document.createElement('style');
  style.id = `${ROOT_ID}-style`;
  style.textContent = PRINT_CSS;
  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.innerHTML = contractPrintHtml(c);
  document.head.appendChild(style);
  document.body.appendChild(root);

  const prevTitle = document.title;
  document.title = `Contrato ${c.code}`; // nome sugerido do PDF
  // O bloco fica no documento (escondido na tela) até a próxima impressão: no iOS o
  // afterprint pode chegar antes de a impressão ler a página
  const restoreTitle = () => {
    document.title = prevTitle;
    window.removeEventListener('afterprint', restoreTitle);
  };
  window.addEventListener('afterprint', restoreTitle);
  // Dá tempo do bloco entrar no documento antes de abrir a impressão
  setTimeout(() => window.print(), 50);
}
