import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        // O Supabase extrai o token da URL e cria a sessão em background.
        // Se a URL não tiver o token (hash) e não houver sessão após 1 segundo, avisamos.
        const timer = setTimeout(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session && !window.location.hash.includes('access_token')) {
                setError("Sessão não encontrada. Se o link expirou, solicite novamente.");
            }
        }, 1000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                setError(null); // Remove o erro se o Supabase confirmar a sessão
            }
        });

        return () => {
            clearTimeout(timer);
            subscription.unsubscribe();
        };
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            setError(error.message);
        } else {
            setSuccess(true);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />

            <Card className="w-full max-w-md glass-dark border-zinc-800/50 relative z-10 shadow-2xl">
                <CardHeader className="space-y-1 flex flex-col items-center text-center pb-8 border-b border-zinc-800/30 mb-6">
                    <div className="flex items-center space-x-2 text-primary mb-2 bg-primary/10 p-4 rounded-full">
                        <KeyRound className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-tight">Criar Nova Senha</CardTitle>
                    <CardDescription className="text-xs md:text-sm font-medium">
                        Sua identidade foi confirmada. Digite abaixo a sua nova senha de acesso.
                    </CardDescription>
                </CardHeader>
                
                <CardContent>
                    {success ? (
                        <div className="space-y-6 text-center">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl">
                                <h3 className="text-emerald-400 font-black uppercase tracking-widest text-lg mb-2">Senha Atualizada!</h3>
                                <p className="text-emerald-500/80 text-xs font-bold leading-relaxed">
                                    A sua nova senha foi salva com sucesso no sistema. Você já pode acessar a plataforma.
                                </p>
                            </div>
                            <Button 
                                onClick={() => navigate('/login')}
                                className="w-full h-12 bg-primary hover:bg-primary/90 font-black uppercase tracking-tighter text-lg shadow-lg"
                            >
                                Ir para Login
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div className="space-y-1.5 relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Nova senha secreta"
                                    className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-primary/50 transition-all font-medium pr-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-[50%] -translate-y-[50%] text-zinc-500 hover:text-zinc-300 focus:outline-none"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            
                            <div className="space-y-1.5 relative">
                                <Input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirme a nova senha"
                                    className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-primary/50 transition-all font-medium pr-10"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-[50%] -translate-y-[50%] text-zinc-500 hover:text-zinc-300 focus:outline-none"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>

                            {error && (
                                <p className="text-xs text-red-400 font-bold uppercase tracking-widest text-center mt-4">
                                    {error}
                                </p>
                            )}

                            <Button
                                className="w-full h-12 bg-primary hover:bg-primary/90 font-black uppercase tracking-tighter text-lg mt-6 shadow-lg shadow-primary/20"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                                {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
