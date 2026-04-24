import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBranches } from '@/hooks/useBranches';
import { motion, AnimatePresence } from 'motion/react';
import { BranchStockModal } from './BranchStockModal';
import { BranchCard } from './BranchCard';
import { Branch } from '@/types/database';

export function BranchesTab() {
    const { branches, isLoading, createBranch } = useBranches();
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
                    <h2 className="text-3xl font-black tracking-tighter uppercase mb-1">Minha Rede</h2>
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
                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nome da Unidade</label>
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
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Documento (CNPJ/CPF)</label>
                                    <Input 
                                        placeholder="00.000.000/0000-00"
                                        value={document}
                                        onChange={(e) => setDocument(e.target.value)}
                                        className="bg-zinc-950/50 border-zinc-800 rounded-xl"
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
                                        className="bg-zinc-950/50 border-zinc-800 rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Cidade</label>
                                    <Input 
                                        placeholder="São Paulo"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        className="bg-zinc-950/50 border-zinc-800 rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Estado (UF)</label>
                                    <Input 
                                        placeholder="SP"
                                        value={state}
                                        onChange={(e) => setState(e.target.value)}
                                        className="bg-zinc-950/50 border-zinc-800 rounded-xl"
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
                                        className="bg-zinc-950/50 border-zinc-800 rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)} className="text-zinc-500">Cancelar</Button>
                                <Button type="submit" className="bg-zinc-100 text-black font-black uppercase tracking-widest px-8">Salvar Unidade</Button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

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
