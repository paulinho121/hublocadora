import { useState } from 'react';
import { Building2, Plus, Copy, Check, Mail, MapPin, Globe, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useBranches } from '@/hooks/useBranches';
import { motion, AnimatePresence } from 'motion/react';

export function BranchesTab() {
    const { branches, isLoading, createBranch } = useBranches();
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [city, setCity] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createBranch.mutateAsync({
                name,
                manager_email: email,
                city,
                status: 'active'
            });
            setIsCreating(false);
            setName('');
            setEmail('');
            setCity('');
            alert('Sub-Locadora cadastrada com sucesso!');
        } catch (error) {
            alert('Erro ao cadastrar sub-locadora');
        }
    };

    const copyInviteLink = (token: string, id: string) => {
        const link = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(link);
        setCopiedId(id);
        alert('Link de convite copiado para a área de transferência!');
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (isLoading) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-1">Minha Rede</h2>
                    <p className="text-zinc-500 font-medium text-sm">Gerencie suas sub-locadoras e estoque pelo Brasil.</p>
                </div>
                <Button 
                    onClick={() => setIsCreating(true)}
                    className="bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest rounded-xl"
                >
                    <Plus className="h-4 w-4 mr-2 stroke-[3]" />
                    Nova Unidade
                </Button>
            </header>

            <AnimatePresence>
                {isCreating && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 sm:p-8"
                    >
                        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nome</label>
                                <Input 
                                    placeholder="Ex: CineHub SP"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-zinc-950/50 border-zinc-800 rounded-xl"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Email do Gestor</label>
                                <Input 
                                    type="email"
                                    placeholder="gestor@unidade.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-zinc-950/50 border-zinc-800 rounded-xl"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Cidade</label>
                                <Input 
                                    placeholder="São Paulo - SP"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="bg-zinc-950/50 border-zinc-800 rounded-xl"
                                    required
                                />
                            </div>
                            <div className="md:col-span-3 flex justify-end gap-3 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)} className="text-zinc-500">Cancelar</Button>
                                <Button type="submit" className="bg-zinc-100 text-black font-black uppercase tracking-widest px-8">Salvar</Button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches?.map((branch) => (
                    <Card key={branch.id} className="bg-zinc-950/50 border-zinc-800 rounded-3xl overflow-hidden hover:border-zinc-700 transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                    <Building2 className="h-5 w-5 text-primary" />
                                </div>
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px]">{branch.status}</Badge>
                            </div>
                            <h3 className="text-xl font-black italic uppercase tracking-tighter">{branch.name}</h3>
                            <div className="flex items-center gap-2 text-zinc-500 text-[10px] mt-1">
                                <MapPin className="h-3 w-3" />
                                <span>{branch.city}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <Button variant="outline" onClick={() => copyInviteLink(branch.invite_token, branch.id)} className="h-9 text-[9px] uppercase font-black">
                                    {copiedId === branch.id ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                                    Convite
                                </Button>
                                <Button variant="outline" className="h-9 text-[9px] uppercase font-black">
                                    <Globe className="h-3 w-3 mr-1" /> Estoque
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
