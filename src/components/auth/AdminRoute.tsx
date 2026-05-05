import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * AdminRoute — Protege rotas exclusivas de administradores.
 * Verifica autenticação E se o perfil tem role === 'admin'.
 * Qualquer usuário logado sem role admin é redirecionado para /.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (profile?.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
