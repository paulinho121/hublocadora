import { describe, it, expect } from 'vitest';
import { renderContractText, contractFor, isMyTurn, formatDocument, isPaperSigned, formatDay, ContractData, RentalContract } from './contract';

const data: ContractData = {
  project_name: 'Curta Maré',
  company: { name: 'Locadora Luz', document: '12345678000190', address: 'Rua A 10, Centro, Recife - PE', city: 'Recife', state: 'PE' },
  renter: { name: 'Ana Souza', email: 'ana@example.com' },
  pickup_date: '2026-10-29',
  return_date: '2026-11-02',
  delivery_method: 'pickup',
  items: [{
    booking_id: 'b1', name: 'Sony FX6', brand: 'Sony', quantity: 2, daily_rate: 500,
    pickup_date: '2026-10-29', return_date: '2026-11-02', shoot_dates: ['2026-10-30', '2026-10-31'], total: 2000,
  }],
  total: 2000,
  generated_at: '2026-10-26T12:00:00Z',
};

const contract = (over: Partial<RentalContract>): RentalContract => ({
  id: 'c1', code: 'CT-2026-00001', project_id: 'p1', company_id: 'co1', renter_id: 'u1', booking_ids: ['b1'],
  data, template_version: 'v1', status: 'awaiting_renter', content: null, content_hash: null,
  renter_signed_at: null, renter_signer_name: null, renter_signer_document: null, renter_ip: null, renter_user_agent: null,
  company_signed_at: null, company_signer_name: null, company_signer_document: null, company_ip: null, company_user_agent: null,
  void_reason: null, created_at: '2026-10-26T12:00:00Z', ...over,
});

describe('renderContractText', () => {
  it('preenche partes, itens, datas, valores e foro a partir do pedido', () => {
    const text = renderContractText(data, 'CT-2026-00001');
    expect(text).toContain('Nº CT-2026-00001 · Projeto: Curta Maré');
    expect(text).toContain('LOCADORA: Locadora Luz, inscrita no CNPJ/CPF 12.345.678/0001-90');
    expect(text).toContain('LOCATÁRIO: Ana Souza');
    expect(text).toContain('2 × Sony FX6 (Sony)');
    expect(text).toContain('gravação em 30 e 31/10 (2 diárias)');
    expect(text).toContain('Retirada/entrega: qui 29/10/2026. Devolução: seg 02/11/2026.');
    expect(text).toMatch(/valor total da locação é de R\$\s?2\.000,00/);
    expect(text).toContain('foro da comarca de Recife/PE');
  });

  it('é determinístico (o hash assinado depende do texto exato)', () => {
    expect(renderContractText(data, 'X')).toBe(renderContractText(data, 'X'));
  });
});

describe('contractFor / isMyTurn', () => {
  it('ignora contratos substituídos e pega o mais novo', () => {
    const old = contract({ id: 'old', status: 'void', created_at: '2026-10-27T00:00:00Z' });
    const cur = contract({ id: 'cur' });
    expect(contractFor([old, cur], ['b1'])?.id).toBe('cur');
    expect(contractFor([old], ['b1'])).toBeNull();
  });

  it('cliente assina primeiro, locadora depois', () => {
    expect(isMyTurn(contract({ status: 'awaiting_renter' }), 'renter')).toBe(true);
    expect(isMyTurn(contract({ status: 'awaiting_renter' }), 'provider')).toBe(false);
    expect(isMyTurn(contract({ status: 'awaiting_company' }), 'provider')).toBe(true);
    expect(isMyTurn(contract({ status: 'signed' }), 'renter')).toBe(false);
  });
});

describe('assinatura no papel', () => {
  it('só conta como papel quando o contrato está assinado por esse meio', () => {
    expect(isPaperSigned(contract({ status: 'signed', signature_method: 'paper' }))).toBe(true);
    expect(isPaperSigned(contract({ status: 'signed', signature_method: 'electronic' }))).toBe(false);
    expect(isPaperSigned(contract({ status: 'awaiting_renter', signature_method: 'paper' }))).toBe(false);
    expect(formatDay('2026-10-26')).toBe('26/10/2026');
  });
});

describe('formatDocument', () => {
  it('formata CPF e CNPJ', () => {
    expect(formatDocument('12345678909')).toBe('123.456.789-09');
    expect(formatDocument('12345678000190')).toBe('12.345.678/0001-90');
  });
});
