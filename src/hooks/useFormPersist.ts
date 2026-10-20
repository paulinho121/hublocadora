import { useEffect, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';

/**
 * Hook reutilizável de persistência de formulário via localStorage.
 * 
 * Salva automaticamente todos os campos a cada mudança e restaura
 * ao montar o componente. Chame `clearDraft()` após o envio bem-sucedido.
 * 
 * @param key   - Chave única no localStorage (ex: 'cinehub_equipment_draft')
 * @param form  - Instância do useForm retornada pelo react-hook-form
 * @param skip  - Campos para NÃO persistir (ex: senhas, tokens)
 * @param options.restoreAll - Restaura todos os campos do rascunho, inclusive os que
 *        já têm valor padrão (ex: quantidade = 1). Use em formulários de criação, onde os
 *        valores atuais são só os padrões. Em edição, deixe false para não sobrescrever
 *        dados vindos da API com um rascunho antigo.
 * 
 * @returns clearDraft - Função para apagar o rascunho salvo após envio
 */
export function useFormPersist<T extends Record<string, any>>(
  key: string,
  form: UseFormReturn<T>,
  skip: (keyof T)[] = [],
  options: { restoreAll?: boolean } = {}
): { clearDraft: () => void; hasDraft: boolean } {
  const { watch, reset, getValues } = form;
  // Na montagem, o auto-save rodaria com os valores padrão antes de a restauração
  // aplicar — e apagaria o rascunho. Pula essa primeira gravação.
  const skipNextSave = useRef(true);

  // Verifica se existe rascunho no mount
  const hasDraft = (() => {
    try {
      return !!localStorage.getItem(key);
    } catch {
      return false;
    }
  })();

  // Restaura rascunho na montagem do componente
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const saved = JSON.parse(raw);
      // Merge com valores atuais para não sobrescrever defaultValues carregados de API
      const current = getValues();
      const merged = { ...current };
      for (const field in saved) {
        // Só restaura se o campo atual ainda estiver vazio/zerado
        const currentVal = (current as any)[field];
        const savedVal = saved[field];
        const isEmpty = currentVal === '' || currentVal === 0 || currentVal === null || currentVal === undefined;
        if ((options.restoreAll || isEmpty) && savedVal !== null && savedVal !== undefined) {
          (merged as any)[field] = savedVal;
        }
      }
      reset(merged as T, { keepDefaultValues: false });
      skipNextSave.current = true;
    } catch {
      // rascunho corrompido: apaga silenciosamente
      try { localStorage.removeItem(key); } catch {}
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save a cada mudança de campo
  const watchedValues = watch();
  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    try {
      const toSave: Partial<T> = { ...watchedValues };
      // Remove campos sensíveis da persistência
      skip.forEach((field) => { delete toSave[field]; });
      localStorage.setItem(key, JSON.stringify(toSave));
    } catch {}
  }, [watchedValues, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearDraft = () => {
    try { localStorage.removeItem(key); } catch {}
  };

  return { clearDraft, hasDraft };
}
