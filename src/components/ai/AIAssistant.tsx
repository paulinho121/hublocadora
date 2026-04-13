import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIService } from '@/services/AIService';
import { Button } from '@/components/ui/button';

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Olá! Sou o assistente inteligente do CineHub. Como posso te ajudar com o seu projeto hoje?' }
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const data = await AIService.matchEquipment(userMessage);
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.suggestion }]);
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
            className="mb-4 w-[350px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/90 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">CineHub AI</h3>
                  <p className="text-[10px] text-zinc-400">Online e pronto para sugerir</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
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
                    {chat.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start italic text-zinc-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Pensando nos melhores itens...
                </div>
              )}
            </div>

            {/* Input Footer */}
            <div className="border-t border-zinc-800 p-4">
              <div className="flex items-center gap-2 rounded-xl bg-zinc-900 px-3 py-1 ring-1 ring-zinc-800 focus-within:ring-primary/50 transition-all">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Descreva seu projeto..."
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
