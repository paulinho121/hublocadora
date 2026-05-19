import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CONSENT_KEY = 'cinehub_cookie_consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true, date: new Date().toISOString() }));
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: false, date: new Date().toISOString() }));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-2xl"
        >
          <div className="relative overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-900/95 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Cookie size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-white">Privacidade e Cookies</h3>
                  <Shield size={12} className="text-primary" />
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Utilizamos cookies essenciais para o funcionamento da plataforma e cookies analíticos para melhorar a experiência.
                  Seus dados são tratados conforme a{' '}
                  <span className="text-primary font-medium">LGPD (Lei nº 13.709/2018)</span>.
                  Não compartilhamos dados sensíveis com terceiros.
                </p>
              </div>
              <button
                onClick={decline}
                className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={decline}
                className="text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Somente essenciais
              </Button>
              <Button
                size="sm"
                onClick={accept}
                className="text-xs bg-primary hover:bg-primary/90 text-white font-bold px-5"
              >
                Aceitar todos
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
