import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Package, 
  CalendarDays, 
  Truck, 
  Settings, 
  LogOut, 
  ChevronRight, 
  User,
  Globe,
  History,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { NotificationCenter } from "./NotificationCenter";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  companyName: string | undefined;
}

export function DashboardSidebar({ activeTab, onTabChange, companyName }: SidebarProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useTenant();
  
  const menuItems = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'inventory', label: 'Inventário', icon: Package },
    { id: 'bookings', label: 'Reservas', icon: CalendarDays },
    { id: 'logistics', label: 'Logística', icon: Truck },
    ...(isAdmin ? [
      { id: 'network', label: 'Minha Rede', icon: Globe },
      { id: 'audit', label: 'Auditoria', icon: History }
    ] : []),
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-72 border-r border-zinc-900 bg-zinc-950 flex flex-col hidden md:flex shrink-0">
      {/* Brand / Company Header */}
      <div className="p-8 pb-10">
        <div className="flex items-center gap-3 mb-6 group cursor-default">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary),0.4)] group-hover:scale-110 transition-transform">
             <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tighter uppercase truncate leading-none mb-1">
              {companyName || 'Moving'}
            </h2>
            <div className="flex items-center gap-1.5 shrink-0">
               <div className="h-1 w-1 rounded-full bg-emerald-500" />
               <span className="text-xs font-black uppercase text-zinc-500 tracking-[0.2em]">Locadora Verificada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "group w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden",
                isActive 
                  ? "clay-nav-active text-white shadow-lg shadow-primary/20" 
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
              )}
              <div className="flex items-center gap-3.5">
                <item.icon className={cn("h-4 w-4 transition-transform", isActive && "scale-110")} />
                <span className={cn("text-xs font-black uppercase tracking-[0.1em] transition-all", isActive ? "translate-x-0.5" : "translate-x-0")}>
                  {item.label}
                </span>
              </div>
              {isActive && <ChevronRight className="h-3 w-3 animate-in fade-in slide-in-from-left-2 duration-500" />}
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 mt-auto border-t border-zinc-900/50 bg-zinc-950/80 backdrop-blur-md">
        <div className="flex flex-col items-center gap-4 mb-4">
           <NotificationCenter />
        </div>
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-900 flex items-center gap-3 mb-3">
           <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
              <User className="h-4 w-4 text-zinc-400" />
           </div>
           <div className="min-w-0 flex-1">
              <p className="text-xs uppercase font-black text-zinc-300 truncate tracking-wider leading-none mb-1">Empresário</p>
              <p className="text-xs text-zinc-500 truncate lowercase font-medium">{user?.email}</p>
           </div>
        </div>
        
        <Button 
          variant="ghost" 
          onClick={() => signOut()}
          className="w-full justify-start text-xs uppercase font-black tracking-widest text-zinc-600 hover:text-destructive hover:bg-destructive/5 h-10 rounded-xl"
        >
          <LogOut className="mr-2 h-3.5 w-3.5" /> Sair da Plataforma
        </Button>
      </div>
    </aside>
  );
}
