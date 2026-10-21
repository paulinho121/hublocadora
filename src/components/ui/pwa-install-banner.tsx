import { useState, useEffect } from 'react';
import { X, Share, Plus, Download } from 'lucide-react';

const DISMISSED_KEY = 'cinehub_pwa_dismissed';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as any).standalone === true)
  );
}

export function PWAInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const ios = isIOS();

  useEffect(() => {
    // Não mostra se já está instalado
    if (isInStandaloneMode()) return;

    // Não mostra se o usuário dispensou recentemente (7 dias)
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    if (ios) {
      // iOS não tem beforeinstallprompt — mostra banner manual
      setVisible(true);
    } else {
      // Android/Chrome: captura o evento nativo
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setVisible(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setDeferredPrompt(null);
  };

  if (!visible) return null;

  return (
    <div className="md:hidden fixed left-3 right-3 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/60 rounded-2xl px-4 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center gap-3">
        {/* Ícone do app */}
        <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <img src="/icon-192.png" alt="CineHub" className="w-8 h-8 rounded-lg" />
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-[12px] font-black uppercase tracking-widest leading-tight">
            Instalar CineHub
          </p>
          {ios ? (
            <p className="text-zinc-400 text-[11px] leading-snug mt-0.5">
              Toque em{' '}
              <Share className="inline w-3 h-3 mb-0.5 text-zinc-300" />
              {' '}e depois{' '}
              <span className="text-zinc-200 font-semibold">"Adicionar à Tela de Início"</span>
            </p>
          ) : (
            <p className="text-zinc-400 text-[11px] leading-snug mt-0.5">
              Acesso rápido sem abrir o navegador
            </p>
          )}
        </div>

        {/* Botão instalar (Android) ou fechar (iOS) */}
        {!ios && deferredPrompt ? (
          <button
            onClick={install}
            className="shrink-0 flex items-center gap-1.5 bg-primary text-white px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-primary/25 active:scale-95 transition-transform"
          >
            <Download className="w-3 h-3" />
            Instalar
          </button>
        ) : null}

        <button
          onClick={dismiss}
          className="shrink-0 text-zinc-500 hover:text-zinc-300 p-1.5 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
