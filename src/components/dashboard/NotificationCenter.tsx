import { useState, useEffect } from 'react';
import { Bell, Info, Package, DollarSign, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationService } from '@/services/NotificationService';
import { Notification } from '@/types/database';

export function NotificationCenter() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!user) return;
        NotificationService.getByUser(user.id).then(setNotifications);
        const channel = NotificationService.subscribe(user.id, (n) => setNotifications(prev => [n as Notification, ...prev]));
        return () => { channel.unsubscribe(); };
    }, [user]);

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800">
                <Bell className="h-5 w-5 text-zinc-500" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-4 w-80 bg-zinc-950 border border-zinc-800 rounded-3xl shadow-3xl overflow-hidden z-50">
                    <header className="p-4 border-b border-zinc-900 flex justify-between items-center">
                         <h4 className="text-xs font-black uppercase tracking-widest text-zinc-100">Notificações</h4>
                         <button onClick={() => setIsOpen(false)}><X className="h-4 w-4"/></button>
                    </header>
                    <div className="max-h-80 overflow-y-auto">
                       {notifications.map((n) => (
                          <div key={n.id} className="p-4 border-b border-zinc-900">
                             <p className="text-[10px] font-black uppercase text-zinc-100">{n.title}</p>
                             <p className="text-[10px] text-zinc-500 font-medium">{n.message}</p>
                          </div>
                       ))}
                    </div>
                </div>
            )}
        </div>
    );
}
