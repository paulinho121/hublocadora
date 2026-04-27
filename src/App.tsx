import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { Camera, LogOut, LayoutDashboard, Settings, ShoppingBag, User, BarChart3, Package, CalendarDays, Truck, Activity } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

// Context & Auth
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { queryClient } from '@/lib/react-query';

// Pages
import Marketplace from '@/pages/Marketplace';
import Dashboard from '@/pages/Dashboard';
import Admin from '@/pages/Admin';
import Docs from '@/pages/Docs';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import EquipmentDetails from '@/pages/EquipmentDetails';
import { AIToolsPage } from '@/pages/AITools';
import { AIAssistant } from '@/components/ai/AIAssistant';
import AcceptInvite from '@/pages/AcceptInvite';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfUse from '@/pages/TermsOfUse';
import { Footer } from '@/components/layout/Footer';
import ProfessionalBackground from '@/components/ui/professional-background';

function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/60 backdrop-blur-xl border-b border-white/5">
      <div className="container flex h-16 md:h-20 items-center justify-between mx-auto px-6 max-w-7xl">
        <div className="flex items-center gap-12">
          <Link to="/" className="flex items-center transition-transform hover:scale-105 active:scale-95">
            <img src="/logo.png" alt="Moving Logo" className="h-10 md:h-12 w-auto object-contain" />
          </Link>
          <nav className="hidden md:flex items-center space-x-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">
            <NavLink to="/dashboard" className={({isActive}) => isActive ? "text-primary" : "hover:text-foreground transition-all"}>Locadora</NavLink>
            <NavLink to="/ai-tools" className={({isActive}) => isActive ? "text-primary" : "hover:text-foreground transition-all"}>IA Tools</NavLink>
            {profile?.role === 'admin' && (
              <NavLink to="/admin" className={({isActive}) => isActive ? "text-primary" : "hover:text-foreground transition-all"}>Gestão HUB</NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center space-x-6">
          {user ? (
            <div className="flex items-center gap-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden lg:inline-block">
                {user.email}
              </span>
              <Button size="sm" variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-destructive h-10 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary hover:bg-transparent hidden md:flex"
                onClick={() => navigate('/register')}
              >
                criar conta
              </Button>
              <Button
                size="sm"
                className="bg-primary text-white hover:bg-primary/90 px-8 rounded-xl text-xs h-11 font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                onClick={() => navigate('/login')}
              >
                Entrar
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  if (!user) return null;

  const isDashboard = location.pathname === '/dashboard';

  // When inside the dashboard, show tab navigation instead of page navigation
  if (isDashboard) {
    const currentTab = new URLSearchParams(location.search).get('tab') || 'overview';
    const tabs = [
      { id: 'overview', label: 'Visão', icon: BarChart3 },
      { id: 'inventory', label: 'Inventário', icon: Package },
      { id: 'bookings', label: 'Reservas', icon: CalendarDays },
      { id: 'logistics', label: 'Logística', icon: Truck },
      { id: 'settings', label: 'Ajustes', icon: Settings },
    ];
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/40 px-2 py-2 pb-8 flex items-center justify-around shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => navigate(`/dashboard?tab=${id}`, { replace: true })}
            className={`flex flex-col items-center gap-1 transition-all px-2 ${currentTab === id ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[11px] font-bold uppercase tracking-tighter">{label}</span>
          </button>
        ))}
      </nav>
    );
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/40 px-6 py-3 pb-8 flex items-center justify-between shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
      <NavLink 
        to="/" 
        className={({isActive}) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
      >
        <ShoppingBag className="w-6 h-6" />
        <span className="text-[11px] font-bold uppercase tracking-tighter">Market</span>
      </NavLink>
      <NavLink 
        to="/dashboard" 
        className={({isActive}) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
      >
        <LayoutDashboard className="w-6 h-6" />
        <span className="text-[11px] font-bold uppercase tracking-tighter">Locadora</span>
      </NavLink>
      {profile?.role === 'admin' && (
        <NavLink 
          to="/admin" 
          className={({isActive}) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[11px] font-bold uppercase tracking-tighter">Admin</span>
        </NavLink>
      )}
      <button className="flex flex-col items-center gap-1 text-muted-foreground">
        <User className="w-6 h-6" />
        <span className="text-[11px] font-bold uppercase tracking-tighter">Perfil</span>
      </button>
    </nav>
  );
}


function MainLayout() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname.startsWith('/invite/');

  return (
    <div className="min-h-screen bg-background font-sans antialiased flex flex-col relative overflow-x-hidden">
      <ProfessionalBackground />
      {!isAuthPage && <Navbar />}
      <main className="flex-1 pb-20 md:pb-0">
        <Routes>
          <Route path="/" element={<Marketplace />} />
          <Route path="/equipment/:id" element={<EquipmentDetails />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/ai-tools" element={<AIToolsPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/invite/:token" element={<AcceptInvite />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      {!isAuthPage && <Footer />}
      {!isAuthPage && <BottomNav />}
      <AIAssistant />
    </div>
  );
}


export default function App() {
  // Force dark mode for this prototype
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <Router>
            <MainLayout />
          </Router>
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
