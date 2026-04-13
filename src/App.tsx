import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { Camera, LogOut, LayoutDashboard, Settings, ShoppingBag, User, BarChart3, Package, CalendarDays, Truck } from 'lucide-react';

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
import { AIAssistant } from '@/components/ai/AIAssistant';

function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="container flex h-16 md:h-20 items-center justify-between mx-auto px-4 max-w-6xl">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center space-x-2 text-primary">
            <Camera className="h-6 w-6 md:h-8 md:w-8" />
            <span className="font-bold text-xl md:text-2xl tracking-tighter lowercase">
              cinehub
            </span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-muted-foreground uppercase tracking-widest">
            <NavLink to="/dashboard" className={({isActive}) => isActive ? "text-foreground" : "hover:text-foreground transition-colors"}>Locadora</NavLink>
            {profile?.role === 'admin' && (
              <NavLink to="/admin" className={({isActive}) => isActive ? "text-foreground" : "hover:text-foreground transition-colors"}>Gestão HUB</NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground hidden lg:inline-block">
                {user.email}
              </span>
              <Button size="sm" variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-foreground h-9 md:h-10">
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Sair</span>
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-sm font-medium text-primary hover:text-primary/80 hover:bg-transparent hidden md:flex"
                onClick={() => navigate('/register')}
              >
                criar conta
              </Button>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 md:px-8 rounded-lg text-sm md:text-base h-9 md:h-11 font-bold"
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
            <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
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
        <span className="text-[10px] font-bold uppercase tracking-tighter">Market</span>
      </NavLink>
      <NavLink 
        to="/dashboard" 
        className={({isActive}) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
      >
        <LayoutDashboard className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-tighter">Locadora</span>
      </NavLink>
      {profile?.role === 'admin' && (
        <NavLink 
          to="/admin" 
          className={({isActive}) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Admin</span>
        </NavLink>
      )}
      <button className="flex flex-col items-center gap-1 text-muted-foreground">
        <User className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-tighter">Perfil</span>
      </button>
    </nav>
  );
}


function MainLayout() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="min-h-screen bg-background font-sans antialiased flex flex-col">
      {!isAuthPage && <Navbar />}
      <main className="flex-1 pb-20 md:pb-0">
        <Routes>
          <Route path="/" element={<Marketplace />} />
          <Route path="/equipment/:id" element={<EquipmentDetails />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
