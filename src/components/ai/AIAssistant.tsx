import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader2, Play, Package, Calculator, Calendar, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIService } from '@/services/AIService';
import { Button } from '@/components/ui/button';

type AssistantMode = 'general' | 'project' | 'quote' | 'availability' | 'followup';

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AssistantMode>('general');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Olá! Sou o assistente inteligente do CineHub. Como posso te ajudar com o seu projeto hoje?' }
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const getModeIcon = (modeType: AssistantMode) => {
    switch (modeType) {
      case 'project': return <Package size={16} />;
      case 'quote': return <Calculator size={16} />;
      case 'availability': return <Calendar size={16} />;
      case 'followup': return <Mail size={16} />;
      default: return <Sparkles size={16} />;
    }
  };

  const getModeLabel = (modeType: AssistantMode) => {
    switch (modeType) {
      case 'project': return 'Planejamento';
      case 'quote': return 'Cotação';
      case 'availability': return 'Disponibilidade';
      case 'followup': return 'Follow-up';
      default: return 'Geral';
    }
  };

  const detectIntent = (message: string): AssistantMode => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('planej') || lowerMessage.includes('pacote') || lowerMessage.includes('briefing') || lowerMessage.includes('projeto')) {
      return 'project';
    }
    if (lowerMessage.includes('cotação') || lowerMessage.includes('preço') || lowerMessage.includes('valor') || lowerMessage.includes('aluguel')) {
      return 'quote';
    }
    if (lowerMessage.includes('disponib') || lowerMessage.includes('data') || lowerMessage.includes('quando') || lowerMessage.includes('livre')) {
      return 'availability';
    }
    if (lowerMessage.includes('follow') || lowerMessage.includes('acompanh') || lowerMessage.includes('email') || lowerMessage.includes('cliente')) {
      return 'followup';
    }

    return 'general';
  };

  const handleSend = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    const detectedMode = detectIntent(userMessage);
    setMode(detectedMode);

    setMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      let response = '';

      switch (detectedMode) {
        case 'project':
          const projectData = await AIService.planProject(
            userMessage,
            'comercial', // default, could be detected from message
            'R$ 10.000 - R$ 50.000', // default, could be extracted
            3, // default days
            'São Paulo' // default location
          );
          response = `📦 **Pacote Recomendado: ${projectData.packageName}**\n\n` +
                    `**Equipamentos Principais:**\n${projectData.primaryEquipment.map(item => `• ${item}`).join('\n')}\n\n` +
                    `**Acessórios:**\n${projectData.accessories.map(item => `• ${item}`).join('\n')}\n\n` +
                    `**Opções de Backup:**\n${projectData.backupOptions.map(item => `• ${item}`).join('\n')}\n\n` +
                    `**Orçamento Estimado:** ${projectData.estimatedBudget}\n\n` +
                    `**Justificativa:** ${projectData.rationale}`;
          break;

        case 'quote':
          const quoteData = await AIService.rentalQuote(
            ['Câmera Sony A7IV', 'Lente 24-70mm f/2.8'], // example items, could be extracted
            5, // default days
            'São Paulo', // default location
            true, // include insurance
            ['Transporte', 'Operador'] // example extras
          );
          response = `💰 **Cotação de Aluguel**\n\n` +
                    `**Custo Total:** ${quoteData.totalCost}\n\n` +
                    `**Breakdown:**\n${quoteData.breakdown.map(item => `• ${item.item}: ${item.cost}`).join('\n')}\n\n` +
                    `**Upgrades Recomendados:**\n${quoteData.recommendedUpgrades.map(item => `• ${item}`).join('\n')}\n\n` +
                    `**Observações:** ${quoteData.notes}`;
          break;

        case 'availability':
          const availabilityData = await AIService.checkAvailability(
            '2024-12-01', // example start date
            '2024-12-05', // example end date
            'comercial', // example type
            'qualidade' // example priority
          );
          response = `📅 **Disponibilidade Verificada**\n\n` +
                    `**Equipamentos Disponíveis:**\n${availabilityData.availableEquipment.map(item => `• ${item}`).join('\n')}\n\n` +
                    `**Substitutos Sugeridos:**\n${availabilityData.substituteEquipment.map(item => `• ${item}`).join('\n')}\n\n` +
                    `**Urgência:** ${availabilityData.urgency}\n\n` +
                    `**Recomendação:** ${availabilityData.recommendation}`;
          break;

        case 'followup':
          const followupData = await AIService.generateFollowUp(
            'João Silva', // example name
            'Aluguel de câmera Sony A7IV por 3 dias', // example booking
            'confirmed' // example status
          );
          response = `📧 **Follow-up Gerado**\n\n` +
                    `**Assunto:** ${followupData.subject}\n\n` +
                    `**Corpo do E-mail:**\n${followupData.body}\n\n` +
                    `**Call-to-Action:** ${followupData.callToAction}`;
          break;

        default:
          const data = await AIService.matchEquipment(userMessage);
          response = data.suggestion;
      }

      setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('AI Bot Error:', error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Desculpe, tive um problema para processar sua solicitação agora. O servidor está ligado?' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[400px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/90 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  {getModeIcon(mode)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">CineHub AI</h3>
                  <p className="text-[10px] text-zinc-400">Modo: {getModeLabel(mode)}</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="border-b border-zinc-800 p-3">
              <div className="flex gap-2 overflow-x-auto">
                <Button
                  size="sm"
                  variant={mode === 'project' ? 'default' : 'outline'}
                  onClick={() => setMode('project')}
                  className="flex items-center gap-1 text-xs px-3 py-1 h-7"
                >
                  <Package size={12} />
                  Planejamento
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'quote' ? 'default' : 'outline'}
                  onClick={() => setMode('quote')}
                  className="flex items-center gap-1 text-xs px-3 py-1 h-7"
                >
                  <Calculator size={12} />
                  Cotação
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'availability' ? 'default' : 'outline'}
                  onClick={() => setMode('availability')}
                  className="flex items-center gap-1 text-xs px-3 py-1 h-7"
                >
                  <Calendar size={12} />
                  Disponibilidade
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'followup' ? 'default' : 'outline'}
                  onClick={() => setMode('followup')}
                  className="flex items-center gap-1 text-xs px-3 py-1 h-7"
                >
                  <Mail size={12} />
                  Follow-up
                </Button>
              </div>
            </div>

            {/* Chat Body */}
            <div 
              ref={scrollRef}
              className="h-[380px] space-y-4 overflow-y-auto p-4 text-sm"
            >
              {chatHistory.map((chat, index) => (
                <div key={index} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    chat.role === 'user' 
                      ? 'bg-primary text-primary-foreground font-medium' 
                      : 'bg-zinc-800/80 text-zinc-200 border border-zinc-700/50'
                  }`}>
                    <div className="whitespace-pre-wrap">{chat.content}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start italic text-zinc-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando sua solicitação...
                </div>
              )}
            </div>

            {/* Input Footer */}
            <div className="border-t border-zinc-800 p-4">
              <div className="space-y-2">
                <div className="text-xs text-zinc-500">
                  {mode === 'project' && 'Descreva seu projeto: tipo, orçamento, dias de filmagem...'}
                  {mode === 'quote' && 'Liste equipamentos, dias e local para cotação...'}
                  {mode === 'availability' && 'Informe datas e tipo de produção...'}
                  {mode === 'followup' && 'Descreva o status do booking e cliente...'}
                  {mode === 'general' && 'Pergunte sobre equipamentos ou projetos...'}
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-zinc-900 px-3 py-1 ring-1 ring-zinc-800 focus-within:ring-primary/50 transition-all">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={
                      mode === 'project' ? 'Ex: Comercial de produto, R$ 30k, 2 dias...' :
                      mode === 'quote' ? 'Ex: Câmera Sony A7IV, lente 24-70mm, 5 dias...' :
                      mode === 'availability' ? 'Ex: Projeto comercial de 15-20 dezembro...' :
                      mode === 'followup' ? 'Ex: Cliente João confirmou aluguel...' :
                      'Como posso ajudar?'
                    }
                    className="flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-zinc-600"
                  />
                  <button 
                    onClick={handleSend}
                    disabled={loading}
                    className="text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:brightness-110 shadow-primary/20"
      >
        <MessageSquare size={24} />
      </motion.button>
    </div>
  );
}
