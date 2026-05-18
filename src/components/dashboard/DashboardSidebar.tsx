import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Package, 
  CalendarDays, 
  Truck, 
  Settings, 
  LogOut, 
  ChevronRight, 
  ChevronLeft,
  User,
  Globe,
  History,
  Activity,
  Heart,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { NotificationCenter } from "./NotificationCenter";
import { motion } from "motion/react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  companyName: string | undefined;
}

export function DashboardSidebar({ activeTab, onTabChange, companyName }: SidebarProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useTenant();
  
  // Persist sidebar state in localStorage for a seamless user experience
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };
  
  const menuItems = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'inventory', label: 'Inventário', icon: Package },
    { id: 'bookings', label: 'Reservas', icon: CalendarDays },
    { id: 'logistics', label: 'Logística', icon: Truck },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'favorites', label: 'Favoritos', icon: Heart },
    ...(isAdmin ? [
      { id: 'network', label: 'Minha Rede', icon: Globe },
      { id: 'audit', label: 'Auditoria', icon: History }
    ] : []),
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className={cn(
      "border-r border-zinc-900/50 bg-zinc-950/80 backdrop-blur-2xl flex flex-col hidden md:flex shrink-0 transition-all duration-300 ease-in-out relative",
      isCollapsed ? "w-20" : "w-72"
    )}>
      {/* Floating Toggle Collapse Button on Right Border */}
      <button 
        onClick={toggleCollapse}
        className="absolute -right-3 top-8 h-6 w-6 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white flex items-center justify-center text-zinc-400 shadow-xl transition-all z-50 group/toggle"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3 transition-transform group-hover/toggle:translate-x-0.5" />
        ) : (
          <ChevronLeft className="h-3 w-3 transition-transform group-hover/toggle:-translate-x-0.5" />
        )}
      </button>

      {/* Brand / Company Header */}
      <div className={cn("pb-10 transition-all duration-300", isCollapsed ? "p-4 pt-8" : "p-8 pb-10")}>
        <div className={cn("flex items-center group cursor-default", isCollapsed ? "justify-center" : "gap-3")}>
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(225,29,72,0.3)] group-hover:scale-110 transition-transform shrink-0">
             <Activity className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 animate-in fade-in duration-300">
              <h2 className="text-xl font-black tracking-tighter uppercase truncate leading-none mb-1">
                {companyName || 'Moving'}
              </h2>
              <div className="flex items-center gap-1.5 shrink-0">
                 <div className="h-1 w-1 rounded-full bg-emerald-500" />
                 <span className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] truncate">Locadora Verificada</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Nav */}
      <nav className={cn("flex-1 space-y-1.5 overflow-y-auto custom-scrollbar transition-all duration-300", isCollapsed ? "px-2" : "px-4")}>
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "group transition-all duration-300 relative flex items-center rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.1em]",
                isCollapsed 
                  ? "w-12 h-12 justify-center mx-auto" 
                  : "w-full justify-between px-4 py-3.5",
                isActive ? "text-white" : "text-zinc-500 hover:text-zinc-200"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              {/* Sliding Active Background */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary rounded-2xl shadow-[0_4px_15px_rgba(225,29,72,0.25)] border border-white/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              <div className={cn("flex items-center relative z-10", isCollapsed ? "justify-center" : "gap-3.5")}>
                <item.icon className={cn("h-4 w-4 transition-transform duration-500", isActive && "scale-110")} />
                {!isCollapsed && (
                  <span className={cn("transition-all animate-in fade-in duration-300", isActive ? "translate-x-0.5" : "translate-x-0")}>
                    {item.label}
                  </span>
                )}
              </div>
              
              {!isCollapsed && isActive && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative z-10"
                >
                  <ChevronRight className="h-3 w-3" />
                </motion.div>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className={cn("mt-auto border-t border-zinc-900/50 bg-zinc-950/80 backdrop-blur-md transition-all duration-300", isCollapsed ? "p-2" : "p-4")}>
        <div className="flex flex-col items-center gap-4 mb-4">
           <NotificationCenter />
        </div>
        
        <div className={cn(
          "bg-zinc-900/40 border border-zinc-900 flex items-center mb-3 transition-all duration-300 overflow-hidden",
          isCollapsed ? "h-12 w-12 rounded-2xl justify-center mx-auto" : "p-4 rounded-2xl gap-3"
        )} title={isCollapsed ? user?.email || 'Usuário' : undefined}>
           <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 shrink-0">
              <User className="h-4 w-4 text-zinc-400" />
           </div>
           {!isCollapsed && (
             <div className="min-w-0 flex-1 animate-in fade-in duration-300">
                <p className="text-xs uppercase font-black text-zinc-300 truncate tracking-wider leading-none mb-1">Empresário</p>
                <p className="text-xs text-zinc-500 truncate lowercase font-medium">{user?.email}</p>
             </div>
           )}
        </div>
        
        <Button 
          variant="ghost" 
          onClick={() => signOut()}
          className={cn(
            "text-[10px] sm:text-xs uppercase font-black tracking-widest text-zinc-600 hover:text-destructive hover:bg-destructive/5 h-10 rounded-xl transition-all duration-300",
            isCollapsed ? "w-12 h-12 justify-center mx-auto p-0" : "w-full justify-start"
          )}
          title={isCollapsed ? "Sair da Plataforma" : undefined}
        >
          <LogOut className={cn("h-3.5 w-3.5 shrink-0", !isCollapsed && "mr-2")} /> 
          {!isCollapsed && "Sair"}
        </Button>
      </div>
    </aside>
  );
}
