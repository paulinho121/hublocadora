import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { LogOut, LayoutDashboard, Settings, ShoppingBag, BarChart3, Package, CalendarDays, Truck, History, FileText, Heart, FolderOpen, Clapperboard, Globe, LayoutGrid, X } from 'lucide-react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import CineHubLogo from '@/components/ui/cinehub-logo';
import { QueryClientProvider } from '@tanstack/react-query';

// Context & Auth
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';
import { ProjectProvider, useProject } from '@/contexts/ProjectContext';
import { ProjectDrawer } from '@/components/marketplace/ProjectDrawer';
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
const AcceptInvite = lazy(() => import('@/pages/AcceptInvite'));

import { AIAssistant } from '@/components/ai/AIAssistant';
import { Footer } from '@/components/layout/Footer';
import ProfessionalBackground from '@/components/ui/professional-background';
import { CookieConsent } from '@/components/ui/cookie-consent';
import { PWAInstallBanner } from '@/components/ui/pwa-install-banner';

// Fallback de loading para Suspense
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProjectNavButton() {
  const { state, openDrawer } = useProject();
  const count = state.items.length;
  return (
    <button
      onClick={openDrawer}
      className="relative flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all"
      title="Meu Projeto"
    >
      <FolderOpen className="h-4 w-4" />
      <span className="hidden lg:inline">Projeto</span>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-2 lg:static lg:ml-0 w-4 h-4 lg:w-auto lg:h-auto lg:px-1.5 lg:py-0.5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
          {count}
        </span>
      )}
    </button>
  );
}

function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // No celular o painel tem cabeçalho próprio; "Sair" e "Marketplace" ficam na gaveta "Mais"
  const hideOnMobile = location.pathname === '/dashboard';

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full bg-background/60 backdrop-blur-xl border-b border-white/5 ${hideOnMobile ? 'hidden md:block' : ''}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="container flex h-16 md:h-20 items-center justify-between mx-auto px-6 max-w-7xl">
        <div className="flex items-center gap-12">
          <Link to="/" className="flex items-center transition-transform hover:scale-105 active:scale-95">
            <CineHubLogo />
          </Link>
          <nav className="hidden md:flex items-center space-x-8 text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
            <NavLink to="/dashboard" className={({isActive}) => isActive ? "text-primary" : "hover:text-foreground transition-all"}>Locadora</NavLink>
            <ProjectNavButton />
            {profile?.role === 'admin' && (
              <NavLink to="/admin" className={({isActive}) => isActive ? "text-primary" : "hover:text-foreground transition-all"}>Gestão HUB</NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center space-x-6">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <div className="flex flex-col leading-none">
                  <span className="text-[11px] font-black uppercase tracking-widest text-white/90">
                    {profile?.full_name ?? user.email?.split('@')[0]}
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-500">
                    Online
                  </span>
                </div>
              </div>
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

function ProjectBottomButton() {
  const { state, openDrawer } = useProject();
  const count = state.items.length;
  const isActive = state.isDrawerOpen;
  return (
    <button
      onClick={openDrawer}
      className={`flex items-center justify-center transition-all duration-300 relative rounded-xl ${
        isActive
          ? 'bg-primary text-white px-3.5 py-2.5 shadow-lg shadow-primary/20 scale-105'
          : 'text-zinc-500 hover:text-zinc-300 p-2.5'
      }`}
    >
      <FolderOpen className="w-4 h-4 shrink-0" />
      {isActive && (
        <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap ml-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
          Projeto
        </span>
      )}
      {count > 0 && !isActive && (
        <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}

// Abas mais usadas ficam na barra; o resto (inclusive as que só existem na
// barra lateral do desktop) fica na gaveta "Mais".
const DASHBOARD_PRIMARY_TABS = [
  { id: 'overview',  label: 'Visão',      icon: BarChart3 },
  { id: 'bookings',  label: 'Pedidos',    icon: CalendarDays },
  { id: 'logistics', label: 'Logística',  icon: Truck },
  { id: 'inventory', label: 'Inventário', icon: Package },
];

function DashboardBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useTenant();
  const [moreOpen, setMoreOpen] = useState(false);

  const currentTab = new URLSearchParams(location.search).get('tab') || 'overview';
  const moreTabs = [
    { id: 'projects',  label: 'Projetos',      icon: Clapperboard },
    { id: 'reports',   label: 'Relatórios',    icon: FileText },
    { id: 'history',   label: 'Histórico',     icon: History },
    { id: 'favorites', label: 'Favoritos',     icon: Heart },
    ...(isAdmin ? [
      { id: 'network', label: 'Minha Rede',    icon: Globe },
      { id: 'audit',   label: 'Auditoria',     icon: History },
    ] : []),
    { id: 'settings',  label: 'Configurações', icon: Settings },
  ];
  const isMoreActive = moreTabs.some(t => t.id === currentTab);

  const goTo = (id: string) => {
    setMoreOpen(false);
    navigate(`/dashboard?tab=${id}`, { replace: true });
  };

  const itemClass = (active: boolean) =>
    `flex-1 flex flex-col items-center justify-center gap-1 min-h-[52px] rounded-xl transition-colors ${
      active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-500 active:text-zinc-200'
    }`;

  return (
    <>
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute left-3 right-3 bg-zinc-950 border border-zinc-800 rounded-3xl p-4 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-4 fade-in duration-200"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 88px)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Mais opções</span>
              <button onClick={() => setMoreOpen(false)} className="h-10 w-10 -mr-2 flex items-center justify-center rounded-xl text-zinc-500" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {moreTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => goTo(id)}
                  className={`flex flex-col items-center justify-center gap-2 min-h-[76px] rounded-2xl border transition-colors ${
                    currentTab === id ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 active:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px] font-bold">{label}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-zinc-800/60">
              <button
                onClick={() => { setMoreOpen(false); navigate('/'); }}
                className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-[11px] font-bold active:bg-zinc-800"
              >
                <ShoppingBag className="w-4 h-4" /> Marketplace
              </button>
              <button
                onClick={async () => { setMoreOpen(false); await signOut(); navigate('/'); }}
                className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-red-400 text-[11px] font-bold active:bg-zinc-800"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden fixed left-3 right-3 z-[61] flex justify-center pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <nav className="pointer-events-auto flex items-stretch gap-1 w-full max-w-lg bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 p-1.5 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
          {DASHBOARD_PRIMARY_TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => goTo(id)} className={itemClass(currentTab === id && !moreOpen)}>
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-bold leading-none">{label}</span>
            </button>
          ))}
          <button onClick={() => setMoreOpen(v => !v)} className={itemClass(moreOpen || isMoreActive)} aria-expanded={moreOpen}>
            <LayoutGrid className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-bold leading-none">Mais</span>
          </button>
        </nav>
      </div>
    </>
  );
}

function BottomNav() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  if (!user) return null;

  const isDashboard = location.pathname === '/dashboard';

  // When inside the dashboard, show tab navigation instead of page navigation
  if (isDashboard) return <DashboardBottomNav />;

  // Non-dashboard pages (e.g. Marketplace, details)
  const navItems = [
    { to: '/', label: 'Market', icon: ShoppingBag },
    { to: '/dashboard', label: 'Locadora', icon: LayoutDashboard },
    ...(profile?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: Settings }] : []),
  ];

  return (
    <div className="md:hidden fixed left-3 right-3 z-50 flex justify-center pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
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
        
        <ProjectBottomButton />
      </nav>
    </div>
  );
}


function MainLayout() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname.startsWith('/invite/') || location.pathname === '/reset-password';

  // overflow-x-clip (e não hidden): hidden cria um contêiner de rolagem e quebra o sticky do Navbar
  return (
    <div className="min-h-screen bg-background font-sans antialiased flex flex-col relative overflow-x-hidden supports-[overflow:clip]:overflow-x-clip">
      <ProfessionalBackground />
      {!isAuthPage && <Navbar />}
      {!isAuthPage && <ProjectDrawer />}
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
      {!isAuthPage && <PWAInstallBanner />}
      {/* <AIAssistant /> */}
      <CookieConsent />
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
          <ProjectProvider>
            <Router>
              <MainLayout />
            </Router>
            <Toaster position="bottom-right" richColors theme="dark" />
          </ProjectProvider>
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
