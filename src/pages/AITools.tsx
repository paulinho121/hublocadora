import { useState } from 'react';
import { Package, Calculator, Calendar, Mail, Sparkles, Bot, CheckCircle2, Zap, Shield, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectPlanner } from '@/components/ai/ProjectPlanner';
import { RentalQuote } from '@/components/ai/RentalQuote';
import { AIAssistant } from '@/components/ai/AIAssistant';
import { cn } from '@/lib/utils';

export function AIToolsPage() {
  const [activeTab, setActiveTab] = useState('assistant');

  const tools = [
    {
      id: 'assistant',
      label: 'Assistente IA',
      icon: Bot,
      description: 'Chat inteligente para consultas gerais sobre equipamentos',
      details: 'Suporte 24/7 para dúvidas técnicas e sugestões rápidas.'
    },
    {
      id: 'planner',
      label: 'Planejamento',
      icon: Package,
      description: 'Monte pacotes completos de equipamentos para seu projeto',
      details: 'IA que sugere kits baseados no tipo de produção.'
    },
    {
      id: 'quote',
      label: 'Cotação',
      icon: Calculator,
      description: 'Gere cotações profissionais de aluguel',
      details: 'Cálculos precisos com base em tabelas de preços reais.'
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background Orbs for Premium Look */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 relative z-10 max-w-6xl">
        {/* Header */}
        <div className="mb-12 md:mb-16 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 mb-8 md:mb-10">
            <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.1)] shrink-0">
              <Sparkles className="h-7 w-7 md:h-8 md:w-8 text-primary animate-pulse" />
            </div>
            <div className="flex-1">
              <span className="text-primary text-[11px] md:text-xs font-black uppercase tracking-[0.3em] mb-2 block">CineHub Intelligence</span>
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9] mb-4">
                Ferramentas <br className="hidden md:block" />
                de <span className="text-primary">IA</span>
              </h1>
              <p className="text-muted-foreground text-base md:text-lg max-w-2xl font-medium px-2 md:px-0">
                Sistemas inteligentes integrados ao catálogo do CineHub para otimizar fluxos de produção e orçamentos.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {tools.map((tool) => (
              <div
                key={tool.id}
                onClick={() => setActiveTab(tool.id)}
                className={cn(
                  "group relative p-5 md:p-6 rounded-[2rem] cursor-pointer transition-all duration-500 overflow-hidden",
                  "border-2",
                  activeTab === tool.id 
                    ? "bg-primary/[0.03] border-primary/40 shadow-[0_15px_30px_rgba(0,0,0,0.3)] scale-[1.02]" 
                    : "bg-zinc-900/20 border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900/40"
                )}
              >
                {/* Glow Effect on Hover/Active */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity duration-500",
                  activeTab === tool.id ? "opacity-100" : "group-hover:opacity-100"
                )} />

                <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
                  <div className={cn(
                    "h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center mb-4 md:mb-6 transition-all duration-500",
                    activeTab === tool.id ? "bg-primary text-white scale-110 shadow-lg" : "bg-zinc-800 text-zinc-400"
                  )}>
                    <tool.icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  
                  <h3 className={cn(
                    "text-lg md:text-xl font-black uppercase tracking-tighter mb-2 transition-colors",
                    activeTab === tool.id ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"
                  )}>
                    {tool.label}
                  </h3>
                  
                  <p className="text-xs md:text-sm text-zinc-500 font-medium leading-relaxed line-clamp-2 md:line-clamp-none">
                    {tool.description}
                  </p>

                  <div className={cn(
                    "mt-4 pt-4 border-t border-zinc-800/50 w-full flex items-center justify-center md:justify-start gap-2 text-[11px] uppercase font-black tracking-widest transition-all duration-500",
                    activeTab === tool.id ? "text-primary opacity-100 translate-y-0" : "text-zinc-600 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
                  )}>
                    <Zap className="h-3 w-3" /> ATIVO
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="glass-dark rounded-[2rem] md:rounded-[2.5rem] border border-zinc-800/50 min-h-[400px] md:min-h-[500px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-700 mx-[-4px] sm:mx-0">
          <div className="p-4 sm:p-8 md:p-12">
            {activeTab === 'assistant' && (
              <div className="flex flex-col items-center justify-center py-10 md:py-20 text-center">
                <div className="h-16 w-16 md:h-24 md:w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 md:mb-8 border border-primary/20">
                  <Bot className="h-8 w-8 md:h-12 md:w-12 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-4 px-2">Assistente IA CineHub</h2>
                <p className="text-sm md:text-base text-muted-foreground max-w-md mb-8 px-4">
                  Olá! Sou sua inteligência dedicada para dúvidas técnicas, verificações de estoque e recomendações de equipamentos.
                </p>
                <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-4 md:p-6 text-left w-full max-w-lg mx-auto">
                  <p className="text-[11px] md:text-xs text-zinc-500 uppercase font-bold tracking-widest mb-4">Exemplos do que perguntar:</p>
                  <ul className="space-y-3 text-xs md:text-sm font-medium">
                    <li className="flex items-start gap-3 text-zinc-300">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      "Quais as melhores lentes para um comercial de carro?"
                    </li>
                    <li className="flex items-start gap-3 text-zinc-300">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      "Tem disponibilidade de kit Red Komodo para amanhã?"
                    </li>
                    <li className="flex items-start gap-3 text-zinc-300">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      "Sugira um kit básico para podcast de 3 pessoas."
                    </li>
                  </ul>
                </div>
                <div className="mt-8 md:mt-12 w-full max-w-[200px] md:max-w-none px-4">
                   <AIAssistant />
                </div>
              </div>
            )}

            {activeTab === 'planner' && <div className="overflow-x-auto"><ProjectPlanner /></div>}

            {activeTab === 'quote' && <div className="overflow-x-auto"><RentalQuote /></div>}
          </div>
        </div>

        {/* Feature Grid Infographic */}
        <div className="mt-16 md:mt-20 grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-12">
          <div className="space-y-6 md:space-y-8">
            <div className="text-center lg:text-left px-4 lg:px-0">
              <span className="text-primary text-[11px] font-black uppercase tracking-[0.3em] mb-4 block">Engine Details</span>
              <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter flex items-center justify-center lg:justify-start gap-3 mb-4 md:mb-6">
                <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                Tecnologias de Ponta
              </h3>
              <p className="text-sm md:text-base text-zinc-500 font-medium">
                Nossa infraestrutura utiliza modelos de linguagem de última geração afinados com dados técnicos do mercado audiovisual.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 px-2 md:px-0">
               {[
                 { label: 'Google Gemini 1.5', desc: 'Processamento massivo context-aware.' },
                 { label: 'Firebase Genkit', desc: 'Orquestração de fluxos segura.' },
                 { label: 'Schemas Zod', desc: 'Validação rigorosa de dados técnicos.' },
                 { label: 'Supabase DB', desc: 'Integração em tempo real com estoque.' }
               ].map((item, i) => (
                 <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 p-4 md:p-5 rounded-2xl group hover:border-primary/30 transition-colors">
                   <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-primary mb-3" />
                   <h4 className="text-xs md:text-sm font-bold text-white mb-1 tracking-tight">{item.label}</h4>
                   <p className="text-[11px] md:text-[11px] text-zinc-500 font-medium">{item.desc}</p>
                 </div>
               ))}
            </div>
          </div>

          <div className="glass-dark border border-zinc-800/50 p-6 md:p-10 rounded-[2rem] flex flex-col justify-center mx-2 md:mx-0">
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter flex items-center justify-center lg:justify-start gap-3 mb-6 md:mb-8">
              <Workflow className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              Fluxos Operacionais
            </h3>
            <div className="space-y-3 md:space-y-4">
               {[
                 'Sugestão inteligente de setups por tipo de cena',
                 'Cálculo de logística e roteirização otimizada',
                 'Análise preditiva de manutenção e desgaste',
                 'Geração de follow-up automatizado de cotações',
                 'Cruzamento automático de datas e disponibilidade'
               ].map((text, i) => (
                 <div key={i} className="flex items-center gap-3 md:gap-4 text-xs md:text-sm font-medium text-zinc-400 group">
                   <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors">
                     <span className="text-[10px] md:text-[11px] font-black text-zinc-600 group-hover:text-white">{i + 1}</span>
                   </div>
                   <span className="line-clamp-1 md:line-clamp-none">{text}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}