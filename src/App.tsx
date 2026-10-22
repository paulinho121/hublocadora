import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { LogOut, Settings, ShoppingBag, Package, CalendarDays, History, FileText, Heart, FolderOpen, Clapperboard, Globe, X, ArrowLeftRight, Home, Menu } from 'lucide-react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import CineHubLogo from '@/components/ui/cinehub-logo';
import { QueryClientProvider } from '@tanstack/react-query';

// Context & Auth
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';
import { ProjectProvider, useProject } from '@/contexts/ProjectContext';
import { ProjectDrawer } from '@/components/marketplace/ProjectDrawer';
import { RealtimeSync } from '@/components/RealtimeSync';
import { ConfirmHost } from '@/components/ui/confirm-dialog';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { applyTheme, useTheme } from '@/lib/theme';
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
      className="relative flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
      title="Meu Pedido"
    >
      <FolderOpen className="h-4 w-4" />
      <span className="hidden lg:inline">Pedido</span>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-2 lg:static lg:ml-0 w-4 h-4 lg:w-auto lg:h-auto lg:px-1.5 lg:py-0.5 bg-primary text-white text-[11px] font-black rounded-full flex items-center justify-center leading-none">
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
  // No celular o painel tem cabeçalho próprio; "Sair" fica no "Menu" da barra de baixo
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
          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-muted-foreground ">
            <NavLink to="/dashboard" className={({isActive}) => isActive ? "text-primary" : "hover:text-foreground transition-all"}>Meu painel</NavLink>
            <ProjectNavButton />
            {profile?.role === 'admin' && (
              <NavLink to="/admin" className={({isActive}) => isActive ? "text-primary" : "hover:text-foreground transition-all"}>Gestão HUB</NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          {/* Carrinho no topo do celular (o menu de cima some no celular) */}
          <div className="md:hidden flex items-center h-10 px-2"><ProjectNavButton /></div>
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <div className="flex flex-col leading-none">
                  <span className="text-[11px] font-semibold text-white/90">
                    {profile?.full_name ?? user.email?.split('@')[0]}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-500">
                    Online
                  </span>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-destructive h-10 px-4 rounded-xl font-semibold text-xs ">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-transparent hidden md:flex"
                onClick={() => navigate('/register')}
              >
                Criar conta
              </Button>
              <Button
                size="sm"
                className="bg-primary text-white hover:bg-primary/90 px-8 rounded-xl text-xs h-11 font-semibold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
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

// Barra de baixo do celular (igual no marketplace e no painel):
// Início · Pedidos · Inventário · Menu (todas as outras áreas)
function BottomNav() {
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useTenant();
  const { state: cart, openDrawer } = useProject();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Fecha o menu ao trocar de página
  useEffect(() => { setMenuOpen(false); }, [location.pathname, location.search]);

  // O atalho "Ver mais" da Visão geral abre este menu
  useEffect(() => {
    const open = () => setMenuOpen(true);
    window.addEventListener('cinehub-open-menu', open);
    return () => window.removeEventListener('cinehub-open-menu', open);
  }, []);

  if (!user) return null;

  const onDashboard = location.pathname === '/dashboard';
  const currentTab = onDashboard ? (new URLSearchParams(location.search).get('tab') || 'overview') : null;

  const goTab = (id: string) => {
    setMenuOpen(false);
    navigate(`/dashboard?tab=${id}`, { replace: onDashboard });
  };

  const menuTabs = [
    { id: 'projects',  label: 'Projetos',       icon: Clapperboard },
    { id: 'reports',   label: 'Relatórios',     icon: FileText },
    { id: 'history',   label: 'Histórico',      icon: History },
    { id: 'favorites', label: 'Favoritos',      icon: Heart },
    { id: 'transfers', label: 'Transferências', icon: ArrowLeftRight },
    ...(isAdmin ? [
      { id: 'network', label: 'Minha Rede',     icon: Globe },
      { id: 'audit',   label: 'Auditoria',      icon: History },
    ] : []),
    { id: 'settings',  label: 'Configurações',  icon: Settings },
  ];

  const isMenuActive = menuOpen || (onDashboard && menuTabs.some(t => t.id === currentTab)) || location.pathname === '/admin';

  // Estilo app de banco: o item ativo vira uma pílula com nome; os outros mostram só o ícone
  const itemClass = (active: boolean) =>
    `relative h-12 flex items-center justify-center gap-2 rounded-full transition-all duration-200 ${
      active ? 'px-4 bg-primary/10 text-primary' : 'w-12 text-zinc-400 active:bg-zinc-900'
    }`;

  const tileClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-2 min-h-[76px] rounded-2xl border transition-colors ${
      active ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 active:bg-zinc-800'
    }`;

  return (
    <>
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute left-3 right-3 max-h-[70vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-4 fade-in duration-200"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 88px)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-sm font-semibold text-zinc-300">Menu</span>
              <button onClick={() => setMenuOpen(false)} className="h-10 w-10 -mr-2 flex items-center justify-center rounded-xl text-zinc-500" aria-label="Fechar menu">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Carrinho (pedido em montagem) */}
            <button
              onClick={() => { setMenuOpen(false); openDrawer(); }}
              className="w-full flex items-center gap-3 h-12 px-4 mb-2 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-zinc-200 text-sm font-semibold active:bg-zinc-800"
            >
              <FolderOpen className="w-4 h-4 text-primary" />
              <span className="flex-1 text-left">Meu carrinho</span>
              {cart.items.length > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center">{cart.items.length}</span>
              )}
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => { setMenuOpen(false); navigate('/'); }} className={tileClass(location.pathname === '/')}>
                <ShoppingBag className="w-5 h-5" />
                <span className="text-[11px] font-bold">Marketplace</span>
              </button>
              {menuTabs.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => goTab(id)} className={tileClass(currentTab === id)}>
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px] font-bold text-center leading-tight px-1">{label}</span>
                </button>
              ))}
              {profile?.role === 'admin' && (
                <button onClick={() => { setMenuOpen(false); navigate('/admin'); }} className={tileClass(location.pathname === '/admin')}>
                  <Settings className="w-5 h-5" />
                  <span className="text-[11px] font-bold">Gestão HUB</span>
                </button>
              )}
            </div>

            <button
              onClick={async () => { setMenuOpen(false); await signOut(); navigate('/'); }}
              className="w-full flex items-center justify-center gap-2 h-12 mt-2 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-red-400 text-[11px] font-bold active:bg-zinc-800"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      )}

      <div className="md:hidden fixed left-3 right-3 z-[61] flex justify-center pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <nav aria-label="Navegação principal" className="pointer-events-auto flex items-center justify-around w-full max-w-lg bg-zinc-950 border border-zinc-800 p-1.5 rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          {[
            { key: 'home',      label: 'Início',     icon: Home,         active: currentTab === 'overview', onClick: () => goTab('overview') },
            { key: 'bookings',  label: 'Pedidos',    icon: CalendarDays, active: currentTab === 'bookings', onClick: () => goTab('bookings') },
            { key: 'inventory', label: 'Inventário', icon: Package,      active: currentTab === 'inventory', onClick: () => goTab('inventory') },
          ].map(({ key, label, icon: Icon, active, onClick }) => {
            const on = active && !menuOpen;
            return (
              <button key={key} onClick={onClick} className={itemClass(on)} aria-label={label} aria-current={on ? 'page' : undefined}>
                <Icon className="w-5 h-5 shrink-0" />
                {on && <span className="text-sm font-semibold leading-none">{label}</span>}
              </button>
            );
          })}
          <button onClick={() => setMenuOpen(v => !v)} className={itemClass(isMenuActive)} aria-label="Menu" aria-expanded={menuOpen}>
            <Menu className="w-5 h-5 shrink-0" />
            {isMenuActive && <span className="text-sm font-semibold leading-none">Menu</span>}
            {cart.items.length > 0 && !menuOpen && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-zinc-950 text-[11px] font-bold flex items-center justify-center" aria-label={`${cart.items.length} no carrinho`}>
                {cart.items.length}
              </span>
            )}
          </button>
        </nav>
      </div>
    </>
  );
}


function MainLayout() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname.startsWith('/invite/') || location.pathname === '/reset-password';

  // overflow-x-clip (e não hidden): hidden cria um contêiner de rolagem e quebra o sticky do Navbar
  return (
    <div className="min-h-screen bg-background font-sans antialiased flex flex-col relative overflow-x-hidden supports-[overflow:clip]:overflow-x-clip">
      <ProfessionalBackground />
      {/* Pedidos, entregas e prorrogações em tempo real para quem está logado */}
      <RealtimeSync />
      <ConfirmHost />
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
  // Tema claro (padrão) ou escuro, escolhido pelo usuário — ver src/lib/theme.ts
  const { theme } = useTheme();
  useEffect(() => { applyTheme(theme); }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <ProjectProvider>
            <Router>
              <MainLayout />
            </Router>
            {/* No celular, acima da barra de navegação inferior */}
            <Toaster position="bottom-right" richColors theme={theme} mobileOffset={{ bottom: 'calc(env(safe-area-inset-bottom) + 96px)' }} />
          </ProjectProvider>
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
