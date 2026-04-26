import { motion } from 'motion/react';
import { Shield, Lock, Eye, FileText, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
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
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Shield className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase text-white">Política de Privacidade</h1>
            </div>
            <p className="text-zinc-500 font-medium">Última atualização: 26 de Abril de 2026</p>
          </header>

          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
              <Eye className="h-5 w-5 text-primary" /> 1. Coleta de Dados
            </h2>
            <p className="leading-relaxed">
              O Cinehub coleta dados necessários para a prestação de serviços de locação de equipamentos audiovisuais, incluindo nome, e-mail, telefone, CPF/CNPJ e endereço. Esses dados são coletados no momento do cadastro e da reserva.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
              <Lock className="h-5 w-5 text-primary" /> 2. Uso e Compartilhamento
            </h2>
            <p className="leading-relaxed">
              Seus dados são compartilhados entre a **Conta Master (Cinehub)** e as **Sublocadoras parceiras** única e exclusivamente para a finalidade de cumprimento de contrato de locação, logística de entrega e segurança dos ativos.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" /> 3. Seus Direitos (LGPD)
            </h2>
            <p className="leading-relaxed">
              Em conformidade com a LGPD, você possui o direito de:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-zinc-400">
              <li>Confirmar a existência de tratamento de seus dados.</li>
              <li>Acessar seus dados pessoais a qualquer momento.</li>
              <li>Corrigir dados incompletos ou inexatos.</li>
              <li>Solicitar a **anonimização ou exclusão** de seus dados (Direito ao Esquecimento), ressalvados os prazos legais de guarda documental para fins fiscais.</li>
            </ul>
          </section>

          <footer className="pt-10 border-t border-zinc-900 text-sm text-zinc-600">
            <p>Dúvidas sobre seus dados? Entre em contato com nosso DPO em: privacidade@cinehub.pro</p>
          </footer>
        </motion.div>
      </div>
    </div>
  );
}
