import { useEffect, useState } from 'react';

/**
 * Tema do app: claro (padrão) ou escuro, escolhido pelo usuário e salvo no aparelho.
 *
 * O tema escuro é o visual original. O claro inverte a escala de cinzas e o preto/branco
 * via variáveis CSS (index.css, :root[data-theme="light"]), então as classes do Tailwind
 * continuam as mesmas nos componentes.
 *
 * O index.html aplica o tema salvo antes do React carregar, para não piscar.
 */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'cinehub-theme';
const EVENT = 'cinehub-theme-change';

export function getTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#09090b' : '#ffffff');
}

export function setTheme(theme: Theme) {
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* sem armazenamento: vale só nesta sessão */ }
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }));
}

export function useTheme() {
  const [theme, setState] = useState<Theme>(getTheme);
  useEffect(() => {
    const onChange = (e: Event) => setState((e as CustomEvent<Theme>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return { theme, setTheme, toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}
