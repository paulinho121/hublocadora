import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  Package,
  CalendarDays,
  Truck,
  MoreHorizontal,
  X,
  FileText,
  History,
  Heart,
  Globe,
  Settings,
  Activity,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

type TabType =
  | "overview"
  | "inventory"
  | "bookings"
  | "logistics"
  | "reports"
  | "network"
  | "settings"
  | "audit"
  | "history"
  | "favorites";

interface MobileBottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const primaryItems = [
  { id: "overview" as TabType, label: "Início", icon: BarChart3 },
  { id: "inventory" as TabType, label: "Inventário", icon: Package },
  { id: "bookings" as TabType, label: "Reservas", icon: CalendarDays },
  { id: "logistics" as TabType, label: "Logística", icon: Truck },
];

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { signOut } = useAuth();
  const { isAdmin } = useTenant();

  const secondaryItems = [
    { id: "reports" as TabType, label: "Relatórios", icon: FileText },
    { id: "history" as TabType, label: "Histórico", icon: History },
    { id: "favorites" as TabType, label: "Favoritos", icon: Heart },
    ...(isAdmin
      ? [
          { id: "network" as TabType, label: "Minha Rede", icon: Globe },
          { id: "audit" as TabType, label: "Auditoria", icon: Activity },
        ]
      : []),
    { id: "settings" as TabType, label: "Configurações", icon: Settings },
  ];

  const isSecondaryActive = secondaryItems.some((i) => i.id === activeTab);

  const handlePrimaryTab = (tab: TabType) => {
    onTabChange(tab);
    setDrawerOpen(false);
  };

  const handleSecondaryTab = (tab: TabType) => {
    onTabChange(tab);
    setDrawerOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-[72px] left-0 right-0 z-50 md:hidden bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-900/80 rounded-t-3xl px-4 pt-4 pb-6"
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-6" />

            <div className="grid grid-cols-3 gap-3">
              {secondaryItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSecondaryTab(item.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200",
                      isActive
                        ? "bg-primary text-white shadow-[0_4px_15px_rgba(225,29,72,0.25)]"
                        : "bg-zinc-900/60 text-zinc-400 active:scale-95"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-wider leading-none">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-900/50">
              <button
                onClick={() => signOut()}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-zinc-600 hover:text-red-400 active:scale-95 transition-all text-xs font-black uppercase tracking-widest"
              >
                <LogOut className="h-4 w-4" />
                Sair da Plataforma
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-900/80 h-[72px] flex items-center px-2 safe-area-bottom">
        {primaryItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handlePrimaryTab(item.id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 h-full relative transition-all duration-200 active:scale-95"
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveTab"
                  className="absolute inset-x-2 inset-y-2 bg-primary/15 rounded-2xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <item.icon
                className={cn(
                  "h-5 w-5 relative z-10 transition-colors duration-200",
                  isActive ? "text-primary" : "text-zinc-500"
                )}
              />
              <span
                className={cn(
                  "text-[9px] font-black uppercase tracking-wider relative z-10 leading-none transition-colors duration-200",
                  isActive ? "text-primary" : "text-zinc-600"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Mais button */}
        <button
          onClick={() => setDrawerOpen((p) => !p)}
          className="flex-1 flex flex-col items-center justify-center gap-1 h-full relative transition-all duration-200 active:scale-95"
        >
          {isSecondaryActive && !drawerOpen && (
            <motion.div
              layoutId="mobileActiveTab"
              className="absolute inset-x-2 inset-y-2 bg-primary/15 rounded-2xl"
              transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
            />
          )}
          <AnimatePresence mode="wait" initial={false}>
            {drawerOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X
                  className={cn(
                    "h-5 w-5 relative z-10",
                    isSecondaryActive ? "text-primary" : "text-zinc-500"
                  )}
                />
              </motion.div>
            ) : (
              <motion.div
                key="more"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <MoreHorizontal
                  className={cn(
                    "h-5 w-5 relative z-10",
                    isSecondaryActive ? "text-primary" : "text-zinc-500"
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <span
            className={cn(
              "text-[9px] font-black uppercase tracking-wider relative z-10 leading-none transition-colors duration-200",
              isSecondaryActive ? "text-primary" : "text-zinc-600"
            )}
          >
            Mais
          </span>
        </button>
      </nav>
    </>
  );
}
