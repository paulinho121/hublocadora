import { Link } from 'react-router-dom';
import { Camera, ShieldCheck, HelpCircle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-900 py-12 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="space-y-4">
          <Link to="/" className="flex items-center space-x-2 text-primary">
            <Camera className="h-6 w-6" />
            <span className="font-bold text-xl tracking-tighter lowercase">
              cinehub
            </span>
          </Link>
          <p className="text-zinc-500 text-sm font-medium leading-relaxed">
            O marketplace de locação de equipamentos audiovisuais profissional. 
            Conectando locadoras e produtores com inteligência e segurança.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] uppercase font-black text-zinc-400 tracking-[0.2em] flex items-center gap-2">
            <ShieldCheck className="h-3 w-3" /> Jurídico & LGPD
          </h4>
          <nav className="flex flex-col gap-2">
            <Link to="/privacy" className="text-sm text-zinc-500 hover:text-primary transition-colors font-medium">Política de Privacidade</Link>
            <Link to="/terms" className="text-sm text-zinc-500 hover:text-primary transition-colors font-medium">Termos de Uso</Link>
            <Link to="/docs" className="text-sm text-zinc-500 hover:text-primary transition-colors font-medium">Documentação API</Link>
          </nav>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] uppercase font-black text-zinc-400 tracking-[0.2em] flex items-center gap-2">
            <HelpCircle className="h-3 w-3" /> Suporte
          </h4>
          <p className="text-sm text-zinc-500 font-medium">
            Dúvidas? Entre em contato:<br />
            <span className="text-zinc-300">suporte@cinehub.pro</span>
          </p>
          <div className="flex items-center gap-1.5">
             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Servidores Online</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-zinc-900/50 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
          © 2026 Cinehub Technologies. Todos os direitos reservados.
        </p>
        <div className="flex gap-6 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
           <span>v2.4.0-Stable</span>
           <span>Brasil</span>
        </div>
      </div>
    </footer>
  );
}
