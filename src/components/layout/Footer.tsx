import { Link } from 'react-router-dom';
import { ShieldCheck, HelpCircle, ArrowUpRight } from 'lucide-react';
import CineHubLogo from '@/components/ui/cinehub-logo';
import { useAuth } from '@/contexts/AuthContext';

export function Footer() {
  const { user } = useAuth();
  return (
    <>
    {/* Celular: cartão grafite compacto e centralizado */}
    <footer
      className="md:hidden mx-4 -mt-16 rounded-2xl bg-[#2f2f33] text-white [--color-white:#fff] px-6 py-8 text-center"
      // Logado, a barra de navegação fica por cima do fim da página: sobra espaço para ela
      style={{ marginBottom: user ? 'calc(env(safe-area-inset-bottom) + 96px)' : 'calc(env(safe-area-inset-bottom) + 24px)' }}
    >
      <Link to="/" className="inline-block text-[28px] leading-none tracking-tight text-white">
        <span className="font-bold">cine</span><span className="font-light">hub</span>
      </Link>
      <p className="mt-5 text-[15px] leading-relaxed text-white/90">
        © 2026 CineHub. Locação de equipamentos audiovisuais entre locadoras e produtoras.
        Todos os direitos reservados.
      </p>
      <nav className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[15px]">
        <Link to="/terms" className="inline-flex items-center gap-1 underline underline-offset-4 text-white">
          Termos de Uso <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link to="/privacy" className="inline-flex items-center gap-1 underline underline-offset-4 text-white">
          Privacidade <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </nav>
      <a href="mailto:suporte@moving.pro" className="mt-3 inline-block text-sm text-white/70 underline underline-offset-4">
        suporte@moving.pro
      </a>
    </footer>

    {/* Computador */}
    <footer className="hidden md:block bg-zinc-950/40 backdrop-blur-xl border-t border-white/5 py-20 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
        <div className="md:col-span-2 space-y-6">
          <Link to="/" className="flex items-center group w-fit transition-transform hover:scale-105 active:scale-95">
            <CineHubLogo className="scale-150 origin-left" />
          </Link>
          <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-sm">
            O ecossistema definitivo para locação de equipamentos audiovisuais. 
            Conectando as maiores locadoras do país a produtores que buscam excelência técnica.
          </p>
        </div>

        <div className="space-y-6">
          <h4 className="text-[11px] font-semibold text-zinc-400 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Transparência
          </h4>
          <nav className="flex flex-col md:gap-3">
            <Link to="/privacy" className="py-2.5 md:py-0 text-sm text-zinc-500 hover:text-primary transition-all font-medium">Privacidade</Link>
            <Link to="/terms" className="py-2.5 md:py-0 text-sm text-zinc-500 hover:text-primary transition-all font-medium">Termos de Uso</Link>
            <Link to="/docs" className="py-2.5 md:py-0 text-sm text-zinc-500 hover:text-primary transition-all font-medium">API Portal</Link>
          </nav>
        </div>

        <div className="space-y-6">
          <h4 className="text-[11px] font-semibold text-zinc-400 flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5" /> Central Hub
          </h4>
          <p className="text-sm text-zinc-500 font-medium leading-relaxed">
            Precisa de ajuda com uma locação?<br />
            <span className="text-white font-black text-base tracking-tighter">suporte@moving.pro</span>
          </p>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 w-fit">
             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[11px] font-semibold text-emerald-500/80 ">Sistema online</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-[11px] text-zinc-400 font-semibold ">
          © 2026 Moving Technologies · Enterprise Solution
        </p>
        <div className="flex gap-8 text-[11px] text-zinc-400 font-semibold ">
           <span className="flex items-center gap-2 hover:text-white transition-colors cursor-default">
             <div className="w-1 h-1 rounded-full bg-zinc-800" /> v2.4.0-Stable
           </span>
           <span className="flex items-center gap-2 hover:text-white transition-colors cursor-default">
             <div className="w-1 h-1 rounded-full bg-zinc-800" /> Brasil
           </span>
        </div>
      </div>
    </footer>
    </>
  );
}
