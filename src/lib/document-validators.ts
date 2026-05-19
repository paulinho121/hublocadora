export function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');

  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // todos iguais ex: 111.111.111-11

  const calc = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += parseInt(digits[i]) * (length + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 || remainder === 11 ? 0 : remainder;
  };

  return calc(9) === parseInt(digits[9]) && calc(10) === parseInt(digits[10]);
}

export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');

  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false; // todos iguais

  const calc = (length: number) => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += parseInt(digits[i]) * weights[i];
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calc(12) === parseInt(digits[12]) && calc(13) === parseInt(digits[13]);
}

export function validateDocument(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return validateCPF(value);
  if (digits.length === 14) return validateCNPJ(value);
  return false;
}
