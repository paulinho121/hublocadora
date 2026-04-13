import { useState } from 'react';
import { Package, Calculator, Calendar, Mail, Sparkles, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectPlanner } from '@/components/ai/ProjectPlanner';
import { RentalQuote } from '@/components/ai/RentalQuote';
import { AIAssistant } from '@/components/ai/AIAssistant';

export function AIToolsPage() {
  const [activeTab, setActiveTab] = useState('assistant');

  const tools = [
    {
      id: 'assistant',
      label: 'Assistente IA',
      icon: Bot,
      description: 'Chat inteligente para consultas gerais sobre equipamentos',
      component: <AIAssistant />
    },
    {
      id: 'planner',
      label: 'Planejamento',
      icon: Package,
      description: 'Monte pacotes completos de equipamentos para seu projeto',
      component: <ProjectPlanner />
    },
    {
      id: 'quote',
      label: 'Cotação',
      icon: Calculator,
      description: 'Gere cotações profissionais de aluguel',
      component: <RentalQuote />
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Ferramentas de IA CineHub</h1>
              <p className="text-zinc-400">Inteligência artificial para otimizar seus projetos audiovisuais</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <Card
                key={tool.id}
                className={`border-zinc-800 bg-zinc-950/50 cursor-pointer transition-all hover:border-primary/30 ${
                  activeTab === tool.id ? 'border-primary/50 bg-zinc-950/80' : ''
                }`}
                onClick={() => setActiveTab(tool.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <tool.icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{tool.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {tool.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'assistant' && (
            <div className="fixed bottom-6 right-6 z-50">
              <AIAssistant />
            </div>
          )}

          {activeTab === 'planner' && <ProjectPlanner />}

          {activeTab === 'quote' && <RentalQuote />}
        </div>

        {/* Footer Info */}
        <div className="mt-12 p-6 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Sobre as Ferramentas de IA
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-zinc-300">
            <div>
              <h4 className="font-semibold text-primary mb-2">Tecnologias Utilizadas</h4>
              <ul className="space-y-1">
                <li>• Google Gemini 1.5 Flash</li>
                <li>• Firebase Genkit Framework</li>
                <li>• Schemas Zod para validação</li>
                <li>• Integração com catálogo Supabase</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-primary mb-2">Fluxos Disponíveis</h4>
              <ul className="space-y-1">
                <li>• Sugestão de equipamentos por projeto</li>
                <li>• Planejamento completo de pacotes</li>
                <li>• Cotação automática de aluguel</li>
                <li>• Verificação de disponibilidade</li>
                <li>• Análise de manutenção</li>
                <li>• Otimização logística</li>
                <li>• Geração de follow-up</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}