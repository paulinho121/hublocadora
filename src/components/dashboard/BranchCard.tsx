import { useState } from 'react';
import { Building2, MapPin, Globe, ChevronDown, ChevronUp, Package, Check, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Branch } from '@/types/database';
import { useBranchStock } from '@/hooks/useBranchStock';
import { motion, AnimatePresence } from 'motion/react';

interface BranchCardProps {
    branch: Branch;
    onManageStock: () => void;
    onCopyInvite: (token: string, id: string) => void;
    isCopied: boolean;
}

export function BranchCard({ branch, onManageStock, onCopyInvite, isCopied }: BranchCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { stock, isLoading } = useBranchStock(branch.id);

    return (
        <Card className="bg-zinc-950/50 border-zinc-800 rounded-3xl overflow-hidden hover:border-zinc-700 transition-all cursor-pointer group" onClick={() => setIsExpanded(!isExpanded)}>
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                    <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                        <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px]">{branch.status}</Badge>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                    </div>
                </div>

                <h3 className="text-xl font-black italic uppercase tracking-tighter group-hover:text-primary transition-colors">{branch.name}</h3>
                <div className="flex items-center gap-2 text-zinc-500 text-[10px] mt-1 mb-6">
                    <MapPin className="h-3 w-3" />
                    <span>{branch.city}</span>
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-4 border-t border-zinc-900 mt-4 space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Estoque Atribuído</h4>
                                {isLoading ? (
                                    <div className="flex justify-center py-4">
                                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : stock && stock.length > 0 ? (
                                    <div className="space-y-2">
                                        {stock.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                                        <Package className="h-4 w-4 text-zinc-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase truncate max-w-[120px]">{item.equipment?.name}</p>
                                                        <p className="text-[8px] text-zinc-500 uppercase">{item.equipment?.category}</p>
                                                    </div>
                                                </div>
                                                <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[9px] font-black">
                                                    {item.quantity} QTD
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-zinc-600 italic py-2">Nenhum equipamento atribuído a esta unidade.</p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-2 gap-3 mt-6" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" onClick={() => onCopyInvite(branch.invite_token, branch.id)} className="h-9 text-[9px] uppercase font-black">
                        {isCopied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                        Convite
                    </Button>
                    <Button 
                        variant="outline" 
                        className="h-9 text-[9px] uppercase font-black"
                        onClick={onManageStock}
                    >
                        <Globe className="h-3 w-3 mr-1" /> Gerenciar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
