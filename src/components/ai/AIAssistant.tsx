import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader2, Package, Calculator, Calendar, Mail, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIService } from '@/services/AIService';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type AssistantMode = 'general' | 'project' | 'quote' | 'availability' | 'followup';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  mode?: AssistantMode;
  timestamp: Date;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AssistantMode>('general');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      content: 'Olá! Sou o **CineHub AI**. Estou aqui para te ajudar a planejar sua próxima produção, calcular cotações ou verificar disponibilidade técnica em segundos. Como posso ser útil?',
      timestamp: new Date()
    }
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatHistory, loading]);

  const handleSend = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');
    
    // Adiciona mensagem do usuário
    const newUserMsg: ChatMessage = { role: 'user', content: userMessage, timestamp: new Date() };
    setChatHistory(prev => [...prev, newUserMsg]);
    setLoading(true);

    try {
      // Chama o Orchestrator (Assistente Mestre)
      const data = await AIService.chat(userMessage);
      
      // Atualiza o modo do UI baseado na detecção da IA
      if (data.mode) setMode(data.mode);

      const assistantMsg: ChatMessage = { 
        role: 'assistant', 
        content: data.response, 
        mode: data.mode,
        timestamp: new Date() 
      };
      
      setChatHistory(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('AI Error:', error);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'Desculpe, tive um problema de conexão com o servidor de IA. Por favor, verifique se o backend está rodando.',
        timestamp: new Date() 
      }]);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="mb-4 w-[450px] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/80 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] backdrop-blur-3xl"
          >
            {/* Header com Gradiente */}
            <div className="relative flex items-center justify-between overflow-hidden border-b border-white/5 bg-gradient-to-r from-zinc-900 to-zinc-950 p-5">
              <div className="relative z-10 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-inner">
                  {getModeIcon(mode)}
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    CineHub AI Assistant
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </h3>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    Modo Ativo: <span className="text-zinc-300">{getModeLabel(mode)}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="group relative z-10 flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={18} className="text-zinc-500 group-hover:text-white" />
              </button>
              
              {/* Luz de fundo decorativa */}
              <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/20 blur-[60px]" />
            </div>

            {/* Quick Modes / Contextual Tabs */}
            <div className="border-b border-white/5 bg-zinc-900/40 p-3">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {(['general', 'project', 'quote', 'availability'] as AssistantMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all ${
                      mode === m 
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                        : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-white/5'
                    }`}
                  >
                    {getModeIcon(m)}
                    {getModeLabel(m)}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Body com Markdown */}
            <div 
              ref={scrollRef}
              className="h-[420px] space-y-6 overflow-y-auto p-6 scroll-smooth"
            >
              {chatHistory.map((chat, index) => (
                <motion.div 
                  initial={{ opacity: 0, x: chat.role === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={index} 
                  className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`group relative max-w-[85%] rounded-2xl p-4 ${
                    chat.role === 'user' 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/10 rounded-tr-none marker:text-white' 
                      : 'bg-zinc-900/50 text-zinc-200 border border-white/5 rounded-tl-none'
                  }`}>
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h3: ({node, ...props}) => <h3 className="text-white font-bold mb-2 mt-4 first:mt-0" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
                          li: ({node, ...props}) => <li className="mb-1" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-primary/50 pl-4 py-1 italic bg-white/5 rounded-r-md my-2" {...props} />
                        }}
                      >
                        {chat.content}
                      </ReactMarkdown>
                    </div>
                    
                    <span className={`absolute -bottom-5 text-[9px] font-medium text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity ${
                      chat.role === 'user' ? 'right-0' : 'left-0'
                    }`}>
                      {chat.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
              
              {loading && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 animate-pulse items-center justify-center rounded-lg bg-zinc-800 border border-white/5">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/80" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input Footer Profissional */}
            <div className="border-t border-white/5 bg-zinc-900/20 p-5">
              <div className="relative flex items-center gap-2 rounded-2xl bg-zinc-900/80 p-2 pl-4 ring-1 ring-white/10 focus-within:ring-primary/50 focus-within:bg-zinc-900 transition-all shadow-inner">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={
                    mode === 'project' ? 'Descreva o projeto para planejar o pacote...' :
                    mode === 'quote' ? 'Quais itens e quantos dias?' :
                    'Mande uma mensagem...'
                  }
                  className="flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-zinc-600"
                />
                <button 
                  onClick={handleSend}
                  disabled={loading || !message.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="mt-3 text-center text-[9px] font-medium uppercase tracking-widest text-zinc-600">
                Powered by Genkit × CineHub Intelligence
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button com Notificação Visual */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all hover:shadow-primary/30"
      >
        {isOpen ? <X size={28} /> : (
          <>
            <MessageSquare size={28} className="transition-transform group-hover:scale-110" />
            <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-primary shadow-lg ring-4 ring-zinc-950">
              AI
            </div>
          </>
        )}
      </motion.button>
    </div>
  );
}
