import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="relative z-10 flex flex-col items-center text-center max-w-lg"
            >
                {/* 404 Number */}
                <div className="relative mb-8">
                    <span className="text-[10rem] font-black tracking-tighter text-zinc-900 leading-none select-none">
                        404
                    </span>
                    <span className="absolute inset-0 text-[10rem] font-black tracking-tighter leading-none bg-gradient-to-b from-primary/40 to-transparent bg-clip-text text-transparent select-none">
                        404
                    </span>
                </div>

                <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-white mb-3">
                    Página não encontrada
                </h1>
                <p className="text-zinc-500 text-base font-medium mb-10 leading-relaxed">
                    O endereço que você tentou acessar não existe ou foi movido.<br />
                    Volte para o Hub e continue explorando.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Button
                        onClick={() => navigate('/')}
                        className="h-12 px-8 clay-button-primary font-black uppercase tracking-widest text-xs flex items-center gap-2"
                    >
                        <Home className="h-4 w-4" />
                        Voltar ao Hub
                    </Button>
                    <Button
                        onClick={() => navigate('/dashboard')}
                        variant="outline"
                        className="h-12 px-8 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 font-black uppercase tracking-widest text-xs flex items-center gap-2"
                    >
                        <Search className="h-4 w-4" />
                        Ir para Locadora
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
