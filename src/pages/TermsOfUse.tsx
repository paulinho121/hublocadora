import { motion } from 'motion/react';
import { Scale, FileCheck, AlertTriangle, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function TermsOfUse() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 py-20 px-6 md:px-10">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-8 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-100"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <header className="border-b border-zinc-900 pb-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <Scale className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase text-white">Termos de Uso</h1>
            </div>
            <p className="text-zinc-500 font-medium">Última atualização: 26 de Abril de 2026</p>
          </header>

          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
              <FileCheck className="h-5 w-5 text-emerald-500" /> 1. Natureza do Serviço
            </h2>
            <p className="leading-relaxed">
              O Moving é uma plataforma de marketplace e gestão de ativos audiovisuais. Atuamos como intermediários entre locadores (Master e Sublocadoras) e locatários (Produtores). Ao utilizar a plataforma, você concorda que o Moving facilita a transação e logística, mas a responsabilidade pelo uso do equipamento é do locatário.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-emerald-500" /> 2. Responsabilidades do Locatário
            </h2>
            <ul className="list-disc pl-6 space-y-3 text-zinc-400">
              <li>O locatário é responsável pela integridade física do equipamento desde a retirada até a devolução.</li>
              <li>O uso de seguros co-participativos oferecidos pela plataforma é obrigatório para determinados ativos de alto valor.</li>
              <li>Atrasos na devolução acarretarão em multas automáticas calculadas proporcionalmente à diária do item.</li>
            </ul>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
              <Scale className="h-5 w-5 text-emerald-500" /> 3. Sub-locação e Roteirização
            </h2>
            <p className="leading-relaxed">
              Você está ciente de que seu pedido pode ser atendido por diferentes unidades da rede Moving (Roteirização). O valor pago e as condições contratuais permanecem as mesmas, independentemente da unidade de origem do ativo.
            </p>
          </section>

          <footer className="pt-10 border-t border-zinc-900 text-sm text-zinc-600">
            <p>Ao clicar em "Confirmar Reserva" no checkout, você ratifica sua concordância integral com estes termos.</p>
          </footer>
        </motion.div>
      </div>
    </div>
  );
}
