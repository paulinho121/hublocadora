import { useState } from 'react';
import { Building2, MapPin, Globe, ChevronDown, ChevronUp, Package, Check, Copy, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Branch } from '@/types/database';
import { useBranchStock } from '@/hooks/useBranchStock';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface BranchCardProps {
    branch: Branch;
    onManageStock: () => void;
    onCopyInvite: (token: string, id: string) => void;
    isCopied: boolean;
}

export function BranchCard({ branch, onManageStock, onCopyInvite, isCopied }: BranchCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { stock, isLoading } = useBranchStock(branch.id);

    const totalItems = stock?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;
    const activeItems = stock?.filter(item => (item.quantity || 0) > 0) || [];

    return (
        <Card 
            className={cn(
                "group relative overflow-hidden transition-all duration-300 cursor-pointer",
                "bg-zinc-950/40 border-zinc-800 hover:border-primary/40",
                "rounded-[2rem]",
                isExpanded ? "bg-zinc-950/60" : ""
            )}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="text-xl font-black uppercase tracking-tighter text-white">
                                    {branch.name}
                                </h3>
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[8px] px-1.5 h-4 uppercase font-black">
                                    {branch.status}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                <MapPin className="h-3 w-3" />
                                <span>{branch.city}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                </div>

                {!isExpanded && (
                    <div className="flex gap-3 mb-6">
                        <div className="flex items-center gap-2 bg-zinc-900/40 px-3 py-1 rounded-full border border-zinc-800/50">
                            <Package className="h-3 w-3 text-primary" />
                            <span className="text-[9px] font-black uppercase text-zinc-400">{totalItems} ITENS</span>
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-4 border-t border-zinc-900 mt-2 space-y-3">
                                {isLoading ? (
                                    <div className="flex justify-center py-6">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary opacity-50" />
                                    </div>
                                ) : activeItems.length > 0 ? (
                                    <div className="space-y-2">
                                        {activeItems.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-900/20 rounded-xl border border-zinc-800/50">
                                                <div className="flex items-center gap-3">
                                                    {item.equipment?.images?.[0] ? (
                                                        <img src={item.equipment.images[0]} className="h-10 w-10 rounded-lg object-cover border border-zinc-800" alt="" />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                                                            <Package className="h-4 w-4 text-zinc-600" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-zinc-200 leading-tight">{item.equipment?.name}</p>
                                                        <p className="text-[8px] text-zinc-500 uppercase font-bold">{item.equipment?.category}</p>
                                                    </div>
                                                </div>
                                                <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] font-black">
                                                    {item.quantity}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[9px] text-zinc-600 uppercase font-black text-center py-4">Sem estoque atribuído</p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-2 gap-3 mt-6" onClick={(e) => e.stopPropagation()}>
                    <Button 
                        variant="outline" 
                        onClick={() => onCopyInvite(branch.invite_token, branch.id)} 
                        className="h-10 text-[9px] uppercase font-black tracking-widest rounded-xl border-zinc-800 bg-zinc-900/50"
                    >
                        {isCopied ? <Check className="h-3 w-3 mr-2 text-emerald-500" /> : <Copy className="h-3 w-3 mr-2" />}
                        Convite
                    </Button>
                    <Button 
                        onClick={onManageStock}
                        className="h-10 bg-zinc-100 text-black text-[9px] uppercase font-black tracking-widest rounded-xl"
                    >
                        <Globe className="h-3 w-3 mr-2" /> Gerenciar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
