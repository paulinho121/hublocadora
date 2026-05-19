import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { LogOut, LayoutDashboard, Settings, ShoppingBag, User, BarChart3, Package, CalendarDays, Truck, History, FileText } from 'lucide-react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import CineHubLogo from '@/components/ui/cinehub-logo';
import { QueryClientProvider } from '@tanstack/react-query';

// Context & Auth
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { queryClient } from '@/lib/react-query';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/ui/error-boundary';

// Pages — eager (pequenas, carregam sempre)
import Marketplace from '@/pages/Marketplace';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import EquipmentDetails from '@/pages/EquipmentDetails';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfUse from '@/pages/TermsOfUse';
import NotFound from '@/pages/NotFound';
import ResetPassword from '@/pages/ResetPassword';

// Pages — lazy (pesadas, só carregam quando o usuário navega até elas)
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Admin = lazy(() => import('@/pages/Admin'));
const Docs = lazy(() => import('@/pages/Docs'));
const AIToolsPage = lazy(() => import('@/pages/AITools').then(m => ({ default: m.AIToolsPage })));
const AcceptInvite = lazy(() => import('@/pages/AcceptInvite'));

import { AIAssistant } from '@/components/ai/AIAssistant';
import { Footer } from '@/components/layout/Footer';
import ProfessionalBackground from '@/components/ui/professional-background';

// Fallback de loading para Suspense
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

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
            <CineHubLogo />
          </Link>
          <nav className="hidden md:flex items-center space-x-8 text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
            <NavLink to="/dashboard" className={({isActive}) => isActive ? "text-primary" : "hover:text-foreground transition-all"}>Locadora</NavLink>
            {/* <NavLink to="/ai-tools" className={({isActive}) => isActive ? "text-primary" : "hover:text-foreground transition-all"}>IA Tools</NavLink> */}
            {profile?.role === 'admin' && (
              <NavLink to="/admin" className={({isActive}) => isActive ? "text-primary" : "hover:text-foreground transition-all"}>Gestão HUB</NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center space-x-6">
          {user ? (
            <div className="flex items-center gap-6">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground hidden lg:inline-block">
                {user.email}
              </span>
              <Button size="sm" variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-destructive h-10 px-4 rounded-xl font-black uppercase text-xs tracking-widest">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary hover:bg-transparent hidden md:flex"
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
      { id: 'bookings', label: 'Pedidos', icon: CalendarDays },
      { id: 'logistics', label: 'Logística', icon: Truck },
      { id: 'reports', label: 'Relatórios', icon: FileText },
      { id: 'settings', label: 'Ajustes', icon: Settings },
    ];
    return (
      <div className="md:hidden fixed bottom-4 left-3 right-3 z-50 flex justify-center pointer-events-none">
        <nav className="pointer-events-auto flex items-center justify-between w-full max-w-lg bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 px-2 py-2 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] relative">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = currentTab === id;
            return (
              <button
                key={id}
                onClick={() => navigate(`/dashboard?tab=${id}`, { replace: true })}
                className={`flex items-center justify-center transition-all duration-300 relative rounded-xl ${
                  isActive 
                    ? 'bg-primary text-white px-3.5 py-2.5 shadow-lg shadow-primary/20 scale-105 font-black uppercase text-[10px] tracking-wider' 
                    : 'text-zinc-500 hover:text-zinc-300 p-2.5'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'scale-110 mr-1.5' : 'scale-100'}`} />
                {isActive && (
                  <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                    {label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // Non-dashboard pages (e.g. Marketplace, details)
  const navItems = [
    { to: '/', label: 'Market', icon: ShoppingBag },
    { to: '/dashboard', label: 'Locadora', icon: LayoutDashboard },
    ...(profile?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: Settings }] : []),
  ];

  return (
    <div className="md:hidden fixed bottom-4 left-3 right-3 z-50 flex justify-center pointer-events-none">
      <nav className="pointer-events-auto flex items-center justify-around w-full max-w-sm bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 px-3 py-2 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center justify-center transition-all duration-300 rounded-xl ${
                isActive 
                  ? 'bg-primary text-white px-4 py-2.5 shadow-lg shadow-primary/20 scale-105 font-black uppercase text-[10px] tracking-wider' 
                  : 'text-zinc-500 hover:text-zinc-300 p-2.5'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 shrink-0 transition-transform ${isActive ? 'scale-110 mr-1.5' : 'scale-100'}`} />
              {isActive && (
                <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                  {label}
                </span>
              )}
            </NavLink>
          );
        })}
        
        <button className="flex items-center justify-center text-zinc-500 hover:text-zinc-300 p-2.5 transition-all duration-300">
          <User className="w-4.5 h-4.5" />
        </button>
      </nav>
    </div>
  );
}


function MainLayout() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname.startsWith('/invite/') || location.pathname === '/reset-password';

  return (
    <div className="min-h-screen bg-background font-sans antialiased flex flex-col relative overflow-x-hidden">
      <ProfessionalBackground />
      {!isAuthPage && <Navbar />}
      <ErrorBoundary>
        <main className="flex-1 pb-20 md:pb-0">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Marketplace />} />
            <Route path="/equipment/:id" element={<EquipmentDetails />} />
            <Route path="/docs" element={<Docs />} />
            {/* <Route path="/ai-tools" element={<AIToolsPage />} /> */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/invite/:token" element={<AcceptInvite />} />
            <Route path="/reset-password" element={<ResetPassword />} />
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
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            {/* Catch-all: rota inválida exibe 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      </ErrorBoundary>
      {!isAuthPage && <Footer />}
      {!isAuthPage && <BottomNav />}
      {/* <AIAssistant /> */}
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
          <Toaster position="bottom-right" richColors theme="dark" />
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
