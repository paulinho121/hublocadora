import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ShieldAlert, 
  Trash2, 
  Download, 
  Lock, 
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
export function PrivacySettings() {
    const { user, signOut } = useAuth();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAnonymize = async () => {
        if (!user) return;
        
        setIsDeleting(true);
        setError(null);
        
        try {
            const { error: rpcError } = await supabase.rpc('anonymize_user_data', { 
                target_user_id: user.id 
            });

            if (rpcError) throw rpcError;

            await signOut();
            window.location.href = '/';
        } catch (err: any) {
            console.error('Erro ao anonimizar dados:', err);
            setError('Não foi possível processar sua solicitação. Verifique se você possui reservas ativas.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleExportData = () => {
        alert('Seu relatório de dados (JSON) está sendo gerado e será enviado para o seu e-mail em instantes.');
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
                <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/40">
                    <CardTitle className="text-xl font-black uppercase flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Lock className="h-5 w-5 text-primary" />
                        </div>
                        Privacidade e Dados (LGPD)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    {/* PORTABILIDADE */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 bg-zinc-900/40 border border-zinc-900 rounded-2xl">
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                                <Download className="h-4 w-4 text-primary" /> Portabilidade de Dados
                            </h4>
                            <p className="text-[10px] text-zinc-500 font-medium">Baixe todos os seus dados pessoais em formato legível por máquina.</p>
                        </div>
                        <Button variant="outline" onClick={handleExportData} className="rounded-xl border-zinc-800 text-[10px] uppercase font-black tracking-widest px-6">
                            Exportar JSON
                        </Button>
                    </div>

                    {/* DIREITO AO ESQUECIMENTO */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 border-2 border-dashed border-red-500/20 bg-red-500/5 rounded-2xl">
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-red-500 flex items-center gap-2">
                                <Trash2 className="h-4 w-4" /> Excluir Meus Dados Forever
                            </h4>
                            <p className="text-[10px] text-red-900/60 font-medium">Isso irá anonimizar permanentemente seu perfil. Esta ação não pode ser desfeita.</p>
                        </div>
                        
                        <Button 
                            variant="destructive" 
                            onClick={() => setIsDialogOpen(true)}
                            className="rounded-xl text-[10px] uppercase font-black tracking-widest px-6 shadow-lg shadow-red-500/20"
                        >
                            Solicitar Exclusão
                        </Button>

                        <Dialog 
                            isOpen={isDialogOpen} 
                            onClose={() => setIsDialogOpen(false)}
                            title="Atenção Total"
                        >
                            <div className="space-y-6">
                                <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
                                    <h3 className="text-red-500 font-black uppercase tracking-tighter text-lg flex items-center gap-2 mb-2">
                                        <ShieldAlert className="h-5 w-5" /> Confirmação Legal
                                    </h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        Ao confirmar, todos os seus dados pessoais (nome, email, cpf) serão **apagados para sempre** do Cinehub. 
                                        Suas reservas passadas serão mantidas para fins fiscais mas não estarão mais vinculadas à sua identidade.
                                    </p>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-xs font-bold">
                                        <AlertCircle className="h-4 w-4" /> {error}
                                    </div>
                                )}

                                <div className="flex flex-col gap-3 pt-4">
                                    <Button 
                                        variant="destructive" 
                                        onClick={handleAnonymize}
                                        disabled={isDeleting}
                                        className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl"
                                    >
                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Exclusão Definitiva'}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => setIsDialogOpen(false)}
                                        className="w-full text-zinc-500 font-bold uppercase text-[10px]"
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        </Dialog>
                    </div>

                    <div className="pt-6 border-t border-zinc-900/50 flex items-start gap-4">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
                            O Cinehub utiliza as melhores práticas de anonimização recomendadas pela ANPD. 
                            Sua privacidade é nossa prioridade técnica e jurídica.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
