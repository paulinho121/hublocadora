import { useState, useEffect, useRef } from 'react';
import { Bell, Info, Package, DollarSign, X, Check, Trash2, Clock, ShieldCheck, Truck, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationService } from '@/services/NotificationService';
import { Notification } from '@/types/database';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function NotificationCenter() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        if (!user) return;
        
        const loadNotifications = async () => {
            try {
                const data = await NotificationService.getByUser(user.id);
                setNotifications(data);
            } catch (error) {
                console.error('Error loading notifications:', error);
            }
        };

        loadNotifications();

        const channel = NotificationService.subscribe(user.id, (n) => {
            setNotifications(prev => [n as Notification, ...prev]);
        });

        return () => { channel.unsubscribe(); };
    }, [user]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id: string) => {
        try {
            await NotificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!user) return;
        try {
            await NotificationService.markAllAsRead(user.id);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'booking': return <Package className="h-4 w-4 text-emerald-500" />;
            case 'payment': return <CreditCard className="h-4 w-4 text-amber-500" />;
            case 'logistics': return <Truck className="h-4 w-4 text-blue-500" />;
            default: return <Info className="h-4 w-4 text-zinc-400" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'booking': return 'Reserva';
            case 'payment': return 'Pagamento';
            case 'logistics': return 'Logística';
            default: return 'Sistema';
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={cn(
                    "h-12 w-12 flex items-center justify-center rounded-2xl transition-all duration-500 relative group",
                    isOpen 
                        ? "bg-primary text-black shadow-[0_0_30px_rgba(163,230,53,0.3)]" 
                        : "bg-zinc-900 border border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-100"
                )}
            >
                <Bell className={cn("h-5 w-5 transition-transform duration-500", isOpen && "scale-110")} />
                
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-black animate-pulse">
                        {unreadCount > 9 ? '+9' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="absolute right-0 mt-4 w-[380px] bg-zinc-950/80 border border-white/5 rounded-[32px] shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden z-[100]"
                    >
                        <header className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
                             <div className="space-y-1">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Central de Alertas</h4>
                                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Você tem {unreadCount} mensagens não lidas</p>
                             </div>
                             {unreadCount > 0 && (
                                <button 
                                    onClick={handleMarkAllAsRead}
                                    className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                                >
                                    Ler Tudo
                                </button>
                             )}
                        </header>

                        <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                           {notifications.length > 0 ? (
                               notifications.map((n, idx) => (
                                  <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={n.id} 
                                    onClick={() => !n.read && handleMarkAsRead(n.id)}
                                    className={cn(
                                        "p-6 border-b border-white/5 cursor-pointer transition-all duration-300 relative group",
                                        n.read ? "opacity-60 grayscale-[0.5]" : "bg-white/[0.02] hover:bg-white/[0.04]"
                                    )}
                                  >
                                     {!n.read && (
                                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                     )}
                                     
                                     <div className="flex gap-4">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5",
                                            n.read ? "bg-zinc-900" : "bg-black"
                                        )}>
                                            {getIcon(n.type)}
                                        </div>
                                        
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                                    {getTypeLabel(n.type)}
                                                </span>
                                                <span className="text-[9px] font-bold text-zinc-700 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                                                </span>
                                            </div>
                                            
                                            <h5 className="text-xs font-black uppercase tracking-tight text-zinc-100 group-hover:text-white transition-colors">
                                                {n.title}
                                            </h5>
                                            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                                                {n.message}
                                            </p>
                                        </div>
                                     </div>
                                  </motion.div>
                               ))
                           ) : (
                               <div className="p-12 text-center space-y-4">
                                   <div className="h-16 w-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-white/5">
                                       <ShieldCheck className="h-8 w-8 text-zinc-800" />
                                   </div>
                                   <div className="space-y-1">
                                       <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Espaço Limpo</p>
                                       <p className="text-[10px] text-zinc-700 font-medium uppercase tracking-tighter">Nenhuma nova notificação por aqui.</p>
                                   </div>
                               </div>
                           )}
                        </div>
                        
                        <footer className="p-4 bg-black/60 border-t border-white/5 text-center">
                             <button className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-400 transition-colors">
                                Configurações de Notificação
                             </button>
                        </footer>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
