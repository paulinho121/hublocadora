import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, HelpCircle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-zinc-950/40 backdrop-blur-xl border-t border-white/5 py-20 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
        <div className="md:col-span-2 space-y-6">
          <Link to="/" className="flex items-center group w-fit transition-transform hover:scale-105 active:scale-95">
            <img src="/logo.png" alt="Moving Logo" className="h-12 md:h-16 w-auto object-contain drop-shadow-[0_0_20px_rgba(var(--primary),0.2)]" />
          </Link>
          <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-sm">
            O ecossistema definitivo para locação de equipamentos audiovisuais. 
            Conectando as maiores locadoras do país a produtores que buscam excelência técnica.
          </p>
        </div>

        <div className="space-y-6">
          <h4 className="text-[10px] uppercase font-black text-zinc-400 tracking-[0.2em] flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Transparência
          </h4>
          <nav className="flex flex-col gap-3">
            <Link to="/privacy" className="text-sm text-zinc-500 hover:text-primary transition-all font-medium">Privacidade</Link>
            <Link to="/terms" className="text-sm text-zinc-500 hover:text-primary transition-all font-medium">Termos de Uso</Link>
            <Link to="/docs" className="text-sm text-zinc-500 hover:text-primary transition-all font-medium">API Portal</Link>
          </nav>
        </div>

        <div className="space-y-6">
          <h4 className="text-[10px] uppercase font-black text-zinc-400 tracking-[0.2em] flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5" /> Central Hub
          </h4>
          <p className="text-sm text-zinc-500 font-medium leading-relaxed">
            Precisa de ajuda com uma locação?<br />
            <span className="text-white font-black text-base tracking-tighter">suporte@moving.pro</span>
          </p>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 w-fit">
             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[9px] font-black uppercase text-emerald-500/80 tracking-wider">Network Online</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">
          © 2026 Moving Technologies · Enterprise Solution
        </p>
        <div className="flex gap-8 text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">
           <span className="flex items-center gap-2 hover:text-white transition-colors cursor-default">
             <div className="w-1 h-1 rounded-full bg-zinc-800" /> v2.4.0-Stable
           </span>
           <span className="flex items-center gap-2 hover:text-white transition-colors cursor-default">
             <div className="w-1 h-1 rounded-full bg-zinc-800" /> Brasil
           </span>
        </div>
      </div>
    </footer>
  );
}
