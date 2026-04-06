import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Loader2, Sparkles } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const from = location.state?.from?.pathname || '/dashboard';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            navigate(from, { replace: true });
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            setError("Digite seu e-mail acima para recuperar a senha");
            return;
        }
        setLoading(true);
        setError(null);
        setMessage(null);
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password',
        });
        
        if (error) {
            setError(error.message);
        } else {
            setMessage("As instruções foram enviadas para seu e-mail!");
        }
        setLoading(false);
    };

    const handleMagicLink = async () => {
        if (!email) {
            setError("Digite seu e-mail acima para receber o Link Mágico");
            return;
        }
        setLoading(true);
        setError(null);
        setMessage(null);
        
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: window.location.origin + '/dashboard',
            }
        });
        
        if (error) {
            setError(error.message);
        } else {
            setMessage("Link Mágico enviado! Verifique sua caixa de entrada.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />

            <Card className="w-full max-w-md glass-dark border-zinc-800/50 relative z-10 shadow-2xl">
                <CardHeader className="space-y-1 flex flex-col items-center text-center pb-8 border-b border-zinc-800/30 mb-6">
                    <div className="flex items-center space-x-2 text-primary mb-2">
                        <Camera className="h-8 w-8" />
                        <span className="font-bold text-3xl tracking-tighter lowercase">
                            cinehub
                        </span>
                    </div>
                    <CardTitle className="text-xl md:text-2xl font-black uppercase italic tracking-tight">Login de Acesso</CardTitle>
                    <CardDescription className="text-xs md:text-sm font-medium">
                        O maior HUB da sua produção começa aqui.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <Input
                                type="email"
                                placeholder="Seu email profissional"
                                className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-primary/50 transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1.5 flex flex-col">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest pl-1">Senha</span>
                                <Button 
                                  variant="link" 
                                  type="button" 
                                  className="h-auto p-0 text-xs text-primary/70 hover:text-primary transition-colors"
                                  onClick={handleResetPassword}
                                >
                                    Esqueci a senha
                                </Button>
                            </div>
                            <Input
                                type="password"
                                placeholder="Sua senha secreta"
                                className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-primary/50 transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {message && <p className="text-xs text-green-400 font-bold uppercase tracking-widest text-center mt-2">{message}</p>}
                        {error && <p className="text-xs text-red-400 font-bold uppercase tracking-widest text-center mt-2">{error}</p>}
                        
                        <div className="flex flex-col gap-2 mt-6">
                            <Button className="w-full h-12 bg-primary hover:bg-primary/90 font-black uppercase italic tracking-tighter text-lg shadow-lg shadow-primary/20" type="submit" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                                {loading ? 'Sincronizando...' : 'Entrar no Hub'}
                            </Button>

                            <div className="relative flex items-center py-2 shrink-0">
                                <div className="flex-grow border-t border-zinc-800"></div>
                                <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs uppercase font-bold tracking-widest">ou</span>
                                <div className="flex-grow border-t border-zinc-800"></div>
                            </div>

                            <Button 
                                type="button" 
                                variant="outline" 
                                className="w-full h-12 border-primary/20 bg-primary/5 hover:bg-primary/20 text-primary font-bold uppercase tracking-wider transition-colors" 
                                onClick={handleMagicLink} 
                                disabled={loading}
                            >
                                <Sparkles className="mr-2 h-4 w-4" />
                                Receber Link Mágico
                            </Button>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4 text-center pb-8">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
                        Novo na produção?{' '}
                        <Button variant="link" className="p-0 h-auto text-primary font-black ml-1 uppercase underline underline-offset-4" onClick={() => navigate('/register')}>
                            Criar Conta
                        </Button>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );

}
