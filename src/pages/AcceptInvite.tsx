import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Loader2, Building2 } from 'lucide-react';

export default function AcceptInvite() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [branchData, setBranchData] = useState<any>(null);
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        async function fetchInvite() {
            if (!token) {
                setError('Token inválido.');
                setLoading(false);
                return;
            }

            const { data, error } = await supabase.rpc('get_branch_by_token', { p_token: token });

            if (error || !data) {
                setError('Convite não encontrado, inválido ou já utilizado.');
            } else {
                setBranchData(data);
            }
            setLoading(false);
        }

        fetchInvite();
    }, [token]);

    const handleAccept = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            setSubmitting(false);
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            setSubmitting(false);
            return;
        }

        // 1. Criar o usuário
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: branchData.manager_email,
            password,
        });

        if (authError) {
            if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
                setError('Este e-mail já possui cadastro. Faça login normalmente e peça para o master te adicionar manualmente ou use outro e-mail.');
            } else {
                setError(authError.message);
            }
            setSubmitting(false);
            return;
        }

        // 2. Aguardar um pouco para garantir que a trigger criou o profile
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 3. Chamar a RPC para vincular a branch
        const { error: rpcError } = await supabase.rpc('accept_branch_invite', { p_token: token });

        if (rpcError) {
            setError('Erro ao vincular conta à unidade: ' + rpcError.message);
            setSubmitting(false);
            return;
        }

        alert('Conta ativada com sucesso! Você já pode acessar a gestão.');
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error && !branchData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
                <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 p-8 text-center">
                    <Building2 className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
                    <h2 className="text-xl font-black uppercase text-zinc-100 mb-2">Convite Indisponível</h2>
                    <p className="text-zinc-500 text-sm">{error}</p>
                    <Button onClick={() => navigate('/')} className="mt-6 w-full font-black uppercase tracking-widest bg-zinc-800 text-white hover:bg-zinc-700">
                        Voltar ao Início
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
            
            <Card className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border-zinc-800/50 relative z-10 shadow-2xl">
                <CardHeader className="space-y-1 flex flex-col items-center text-center pb-6 border-b border-zinc-800/30 mb-6">
                    <div className="flex items-center space-x-2 text-primary mb-2">
                        <Camera className="h-8 w-8" />
                        <span className="font-bold text-3xl tracking-tighter lowercase">
                            cinehub
                        </span>
                    </div>
                    <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-tight text-white mt-4">Ativar Unidade</CardTitle>
                    <CardDescription className="text-xs md:text-sm font-medium text-zinc-400 mt-2">
                        Você foi convidado para gerenciar a unidade <strong className="text-white">{branchData?.name}</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAccept} className="space-y-4">
                        <div className="space-y-2 mb-6">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">E-mail de Acesso (Fixo)</label>
                            <Input
                                type="email"
                                value={branchData?.manager_email}
                                disabled
                                className="h-12 bg-zinc-950 border-zinc-800 text-zinc-500 opacity-70 font-medium"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Input
                                type="password"
                                placeholder="Crie uma senha de acesso"
                                className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-primary/50 text-white transition-all font-medium"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Input
                                type="password"
                                placeholder="Confirme sua senha"
                                className="h-12 bg-zinc-900/50 border-zinc-800 focus:border-primary/50 text-white transition-all font-medium"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center mt-4">
                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">{error}</p>
                            </div>
                        )}
                        
                        <Button 
                            className="w-full h-14 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest text-lg mt-6 shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]" 
                            type="submit" 
                            disabled={submitting}
                        >
                            {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                            {submitting ? 'Ativando Conta...' : 'Aceitar e Entrar'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
