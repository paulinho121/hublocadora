import { useState } from 'react';
import { Plus, LayoutGrid, List, MapPin, Package, Phone, Building2, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBranches } from '@/hooks/useBranches';
import { motion, AnimatePresence } from 'motion/react';
import { BranchStockModal } from './BranchStockModal';
import { BranchCard } from './BranchCard';
import { Branch } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function BranchesTab() {
    const { branches, isLoading, createBranch } = useBranches();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    const [state, setState] = useState('');
    const [phone, setPhone] = useState('');
    const [document, setDocument] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createBranch.mutateAsync({
                name,
                manager_email: email,
                city,
                address,
                state,
                phone,
                document,
                status: 'invited'
            });
            setIsCreating(false);
            setName('');
            setEmail('');
            setCity('');
            setAddress('');
            setState('');
            setPhone('');
            setDocument('');
        } catch (error) {
            console.error('Erro ao cadastrar sub-locadora');
        }
    };

    const copyInviteLink = (token: string, id: string) => {
        const link = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(link);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (isLoading) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter uppercase mb-2 text-white">Minha Rede</h2>
                    <p className="text-zinc-500 font-medium italic">Gerencie suas sub-locadoras e estoque pelo Brasil.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* VIEW TOGGLE */}
                    <div className="bg-zinc-950 p-1 rounded-2xl border border-zinc-900 flex items-center shadow-inner">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                viewMode === 'grid' ? "bg-zinc-900 text-primary shadow-lg" : "text-zinc-600 hover:text-zinc-400"
                            )}
                        >
                            <LayoutGrid className="w-4 h-4" /> Cards
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                viewMode === 'list' ? "bg-zinc-900 text-primary shadow-lg" : "text-zinc-600 hover:text-zinc-400"
                            )}
                        >
                            <List className="w-4 h-4" /> Lista
                        </button>
                    </div>

                    <Button 
                        onClick={() => setIsCreating(true)}
                        className="bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest rounded-xl h-12 px-6 shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                    >
                        <Plus className="h-4 w-4 mr-2 stroke-[3]" />
                        Nova Unidade
                    </Button>
                </div>
            </header>

            <AnimatePresence>
                {/* Form logic remains the same (truncated for readability in the instruction, but preserved in implementation) */}
                {isCreating && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                    >
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-emerald-500" />
                         <form onSubmit={handleCreate} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nome da Unidade</label>
                                    <Input 
                                        placeholder="Ex: CineHub SP"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="bg-zinc-900/50 border-zinc-800 rounded-xl h-12 focus:ring-primary/20"
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
                                        className="bg-zinc-900/50 border-zinc-800 rounded-xl h-12 focus:ring-primary/20"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Documento (CNPJ/CPF)</label>
                                    <Input 
                                        placeholder="00.000.000/0000-00"
                                        value={document}
                                        onChange={(e) => setDocument(e.target.value)}
                                        className="bg-zinc-900/50 border-zinc-800 rounded-xl h-12 focus:ring-primary/20"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Endereço Completo</label>
                                    <Input 
                                        placeholder="Rua, Número, Bairro"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="bg-zinc-900/50 border-zinc-800 rounded-xl h-12 focus:ring-primary/20"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Cidade</label>
                                    <Input 
                                        placeholder="São Paulo"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        className="bg-zinc-900/50 border-zinc-800 rounded-xl h-12 focus:ring-primary/20"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Estado (UF)</label>
                                    <Input 
                                        placeholder="SP"
                                        value={state}
                                        onChange={(e) => setState(e.target.value)}
                                        className="bg-zinc-900/50 border-zinc-800 rounded-xl h-12 focus:ring-primary/20"
                                        required
                                        maxLength={2}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Telefone/WhatsApp</label>
                                    <Input 
                                        placeholder="(11) 99999-9999"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="bg-zinc-900/50 border-zinc-800 rounded-xl h-12 focus:ring-primary/20"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)} className="text-zinc-500 hover:text-white">Cancelar</Button>
                                <Button type="submit" className="bg-zinc-100 text-black font-black uppercase tracking-widest px-8 h-12 rounded-xl">Salvar Unidade</Button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {branches?.map((branch) => (
                        <BranchCard 
                            key={branch.id}
                            branch={branch}
                            isCopied={copiedId === branch.id}
                            onCopyInvite={copyInviteLink}
                            onManageStock={() => {
                                setSelectedBranch(branch);
                                setIsStockModalOpen(true);
                            }}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden shadow-2xl overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="border-b border-zinc-900 bg-zinc-900/30">
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Unidade</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Localização</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Itens</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/50">
                            {branches?.map((branch) => (
                                <tr key={branch.id} className="hover:bg-zinc-900/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
                                                <Building2 className="h-5 w-5 text-zinc-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white uppercase tracking-tighter">{branch.name}</p>
                                                <p className="text-[10px] text-zinc-500 font-medium">{branch.manager_email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-zinc-400">
                                            <MapPin className="h-3 w-3" />
                                            <span className="text-xs font-medium">{branch.city}, {branch.state}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-3 w-3 text-primary" />
                                            <span className="text-xs font-black text-white">{(branch as any).items_count || 0} Itens</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge className={cn(
                                            "uppercase text-[9px] font-black tracking-widest",
                                            branch.status === 'active' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                        )}>
                                            {branch.status === 'active' ? 'Ativo' : 'Convite Pendente'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => copyInviteLink(branch.invite_token, branch.id)}
                                                className="h-9 w-9 rounded-xl border border-zinc-900 hover:bg-zinc-900"
                                            >
                                                {copiedId === branch.id ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-zinc-500" />}
                                            </Button>
                                            <Button 
                                                onClick={() => {
                                                    setSelectedBranch(branch);
                                                    setIsStockModalOpen(true);
                                                }}
                                                className="bg-zinc-100 text-black font-black uppercase text-[10px] tracking-widest rounded-xl px-4 h-9 shadow-lg"
                                            >
                                                <Package className="w-3 h-3 mr-2" /> Gerenciar
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedBranch && (
                <BranchStockModal 
                    branchId={selectedBranch.id}
                    branchName={selectedBranch.name}
                    isOpen={isStockModalOpen}
                    onClose={() => {
                        setIsStockModalOpen(false);
                        setSelectedBranch(null);
                    }}
                />
            )}
        </div>
    );
}
