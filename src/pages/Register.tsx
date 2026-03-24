import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Loader2 } from 'lucide-react';

export default function Register() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            // In a real app we might redirect to a 'verify email' page. For now, go to login.
            navigate('/login', { replace: true });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />

            <Card className="w-full max-w-md glass-dark border-zinc-800/50 relative z-10 shadow-2xl">
                <CardHeader className="space-y-1 flex flex-col items-center text-center pb-8 border-b border-zinc-800/30 mb-6">
                    <div className="flex items-center space-x-2 text-primary mb-2">
                        <Camera className="h-8 w-8" />
                        <span className="font-bold text-3xl tracking-tighter lowercase">
                            cinehub
                        </span>
                    </div>
                    <CardTitle className="text-xl md:text-2xl font-black uppercase italic tracking-tight">Novo no Hub</CardTitle>
                    <CardDescription className="text-xs md:text-sm font-medium">
                        Junte-se ao maior ecossistema audiovisual.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-1.5">
                            <Input
                                type="email"
                                placeholder="Seu melhor email"
                                className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-primary/50 transition-all font-medium"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Input
                                type="password"
                                placeholder="Crie uma senha de acesso"
                                className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-primary/50 transition-all font-medium"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-xs text-red-400 font-bold uppercase tracking-widest text-center mt-2">{error}</p>}
                        <Button className="w-full h-12 bg-primary hover:bg-primary/90 font-black uppercase italic tracking-tighter text-lg mt-4 shadow-lg shadow-primary/20" type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                            {loading ? 'Preparando Setup...' : 'Cadastrar agora'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4 text-center pb-8">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
                        Já faz parte da cena?{' '}
                        <Button variant="link" className="p-0 h-auto text-primary font-black ml-1 uppercase underline underline-offset-4" onClick={() => navigate('/login')}>
                            Entrar
                        </Button>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );

}
