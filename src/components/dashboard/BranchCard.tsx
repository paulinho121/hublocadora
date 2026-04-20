import { useState } from 'react';
import { Building2, MapPin, Globe, ChevronDown, ChevronUp, Package, Check, Copy, Box, MapPinned } from 'lucide-react';
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

    const totalItems = stock?.reduce((acc, item) => acc + item.quantity, 0) || 0;
    const uniqueEquipments = stock?.filter(item => item.quantity > 0).length || 0;

    return (
        <Card 
            className={cn(
                "group relative overflow-hidden transition-all duration-500 cursor-pointer",
                "bg-zinc-950/40 border-zinc-800/50 hover:border-primary/40",
                "rounded-[2.5rem] backdrop-blur-xl",
                isExpanded ? "ring-1 ring-primary/20 bg-zinc-950/60" : ""
            )}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            {/* Efeito de Gradiente de Fundo no Hover */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <CardContent className="p-8 relative z-10">
                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500">
                            <Building2 className="h-7 w-7 text-primary animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white group-hover:text-primary transition-colors">
                                    {branch.name}
                                </h3>
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[8px] px-2 py-0 uppercase font-black tracking-widest h-4">
                                    {branch.status}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-bold uppercase tracking-wider">
                                <MapPinned className="h-3 w-3 text-primary/70" />
                                <span>{branch.city} {branch.state ? `- ${branch.state}` : ''}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-10 w-10 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                </div>

                {/* Resumo Rápido quando fechado */}
                {!isExpanded && (
                    <div className="flex gap-4 mb-8">
                        <div className="flex items-center gap-2 bg-zinc-900/40 px-3 py-1.5 rounded-full border border-zinc-800/50">
                            <Box className="h-3 w-3 text-primary" />
                            <span className="text-[10px] font-black uppercase text-zinc-400">{totalItems} Itens Totais</span>
                        </div>
                        <div className="flex items-center gap-2 bg-zinc-900/40 px-3 py-1.5 rounded-full border border-zinc-800/50">
                            <Package className="h-3 w-3 text-primary" />
                            <span className="text-[10px] font-black uppercase text-zinc-400">{uniqueEquipments} Tipos</span>
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                            className="overflow-hidden"
                        >
                            <div className="pt-6 border-t border-zinc-900 mt-2 space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Estoque Localizado</h4>
                                    <Badge variant="outline" className="text-[9px] border-zinc-800 text-zinc-400 font-bold">
                                        Sincronizado Agora
                                    </Badge>
                                </div>
                                
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Carregando Inventário...</span>
                                    </div>
                                ) : stock && stock.filter(i => i.quantity > 0).length > 0 ? (
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {stock.filter(i => i.quantity > 0).map((item) => (
                                            <div 
                                                key={item.id} 
                                                className="group/item flex items-center justify-between p-4 bg-zinc-900/20 rounded-2xl border border-zinc-800/30 hover:bg-zinc-900/40 hover:border-zinc-700/50 transition-all"
                                            >
                                                <div className="flex items-center gap-4">
                                                    {item.equipment?.images?.[0] ? (
                                                        <img 
                                                            src={item.equipment.images[0]} 
                                                            className="h-12 w-12 rounded-xl object-cover border border-zinc-800 group-hover/item:scale-105 transition-transform" 
                                                            alt="" 
                                                        />
                                                    ) : (
                                                        <div className="h-12 w-12 rounded-xl bg-zinc-800/50 flex items-center justify-center border border-zinc-800">
                                                            <Package className="h-5 w-5 text-zinc-600" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase text-zinc-200 tracking-tight leading-tight mb-1 group-hover/item:text-white">
                                                            {item.equipment?.name}
                                                        </p>
                                                        <Badge variant="outline" className="text-[8px] uppercase font-black py-0 px-1.5 border-zinc-800 text-zinc-500">
                                                            {item.equipment?.category}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[14px] font-black italic text-primary">{item.quantity}</span>
                                                    <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">UNIDADES</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
                                        <Package className="h-8 w-8 text-zinc-800 mb-3" />
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                                            Nenhum equipamento foi<br/>atribuído a esta unidade ainda.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-2 gap-4 mt-8" onClick={(e) => e.stopPropagation()}>
                    <Button 
                        variant="outline" 
                        onClick={() => onCopyInvite(branch.invite_token, branch.id)} 
                        className="h-12 text-[10px] uppercase font-black tracking-widest rounded-2xl border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white transition-all"
                    >
                        {isCopied ? <Check className="h-4 w-4 mr-2 text-emerald-500" /> : <Copy className="h-4 w-4 mr-2" />}
                        Link de Convite
                    </Button>
                    <Button 
                        onClick={onManageStock}
                        className="h-12 bg-zinc-100 text-black text-[10px] uppercase font-black tracking-widest rounded-2xl hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/20"
                    >
                        <Globe className="h-4 w-4 mr-2" /> Gerenciar Unidade
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
