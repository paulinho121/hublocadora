import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Camera, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

// Context & Auth
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { queryClient } from '@/lib/react-query';

// Pages
import Marketplace from '@/pages/Marketplace';
import Dashboard from '@/pages/Dashboard';
import Admin from '@/pages/Admin';
import Docs from '@/pages/Docs';
import Login from '@/pages/Login';
import Register from '@/pages/Register';

function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b border-border/40">
      <div className="container flex h-20 items-center justify-between mx-auto px-4 max-w-6xl">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center space-x-2 text-primary">
            <Camera className="h-8 w-8" />
            <span className="font-bold text-2xl tracking-tighter lowercase">
              cinehub
            </span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-base font-medium text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground transition-colors">Locadora</Link>
            <Link to="/admin" className="hover:text-foreground transition-colors">Produtora e Estúdio</Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline-block">
                {user.email}
              </span>
              <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                className="text-base font-medium text-primary hover:text-primary/80 hover:bg-transparent hidden sm:flex"
                onClick={() => navigate('/register')}
              >
                criar conta
              </Button>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 rounded-lg text-base h-11"
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

function MainLayout() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="min-h-screen bg-background font-sans antialiased flex flex-col">
      {!isAuthPage && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Marketplace />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
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
        <Router>
          <MainLayout />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
