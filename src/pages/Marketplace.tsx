import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEquipments } from '@/hooks/useEquipments';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MapPin, ChevronRight, Camera, Loader2, Package } from 'lucide-react';
import { BrandMarquee } from '@/components/home/BrandMarquee';
import { QuickBookingModal } from '@/components/marketplace/QuickBookingModal';
import { Equipment } from '@/types/database';

// ─── Equipment Card with auto-rotating image carousel ───────────────────────
function EquipmentCard({ item, onClick }: { item: Equipment; onClick: () => void }) {
  const images = item.images ?? [];
  const hasMultiple = images.length > 1;
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!hasMultiple) return;
    timerRef.current = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % images.length);
    }, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [hasMultiple, images.length]);

  const isAvailable = (item.stock_quantity || 0) > 0;

  return (
    <Card
      onClick={onClick}
      className="group overflow-hidden border-white/5 bg-zinc-950/40 hover:bg-zinc-950/80 hover:border-primary/30 transition-all duration-500 cursor-pointer shadow-2xl flex flex-col rounded-2xl"
    >
      {/* ── Image area ── */}
      <div className="relative w-full h-48 overflow-hidden bg-zinc-900/50 shrink-0">
        {images.length > 0 ? (
          images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={item.name}
              className={`absolute inset-0 w-full h-full object-contain p-4 transition-all duration-1000 ease-in-out
                ${i === activeIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-110 blur-sm'}`}
            />
          ))
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-800">
            <Camera className="h-16 w-16" />
          </div>
        )}

        {/* Dot indicators */}
        {hasMultiple && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, i) => (
              <span
                key={i}
                className={`block h-1 rounded-full transition-all duration-500 ${i === activeIdx ? 'w-4 bg-primary' : 'w-1 bg-white/20'}`}
              />
            ))}
          </div>
        )}

        {/* Availability badge overlay */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <Badge className={`${isAvailable ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'} uppercase font-black tracking-widest text-[9px] backdrop-blur-md px-2 py-1 rounded-md border`}>
            {isAvailable ? `${item.stock_quantity} No Hub` : 'Esgotado'}
          </Badge>
        </div>
        
        {/* Location badge overlay */}
        {item.state_uf && (
          <div className="absolute top-4 right-4 z-10">
            <Badge className="bg-zinc-950/60 text-zinc-400 border-white/5 uppercase font-black tracking-widest text-[9px] backdrop-blur-md px-2 py-1 rounded-md border">
              <MapPin className="w-2.5 h-2.5 mr-1" />
              {item.state_uf}
            </Badge>
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-col flex-1 p-5 gap-4">
        <h4 className="text-xs font-black leading-relaxed uppercase tracking-widest group-hover:text-primary transition-colors line-clamp-2 min-h-[2.5rem]">
          {item.name}
        </h4>

        <div className="mt-auto flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:bg-primary/5 transition-colors">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-zinc-500 font-black tracking-[0.2em] mb-1">Diária</span>
            <div className="text-lg font-display font-black text-white tracking-tighter">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.daily_rate)}
            </div>
          </div>
          <Button size="icon" className="h-10 w-10 rounded-xl bg-zinc-900 group-hover:bg-primary transition-all shadow-xl text-white group-hover:-translate-y-0.5 border border-white/5">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}


export default function Marketplace() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  
  const { data: rawEquipments, isLoading } = useEquipments({
    searchQuery: search,
    category: selectedCategory
  });

  // ─── Consolidação "Pote Principal" ────────────────────────────────────────
  // Agrupa itens pelo nome e soma a quantidade real disponível no Hub
  const equipments = (() => {
    if (!rawEquipments) return [];
    
    const consolidated = new Map<string, Equipment>();
    
    rawEquipments.forEach(item => {
      const key = item.name.trim().toUpperCase();
      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!;
        existing.stock_quantity = (existing.stock_quantity || 0) + (item.stock_quantity || 0);
      } else {
        // Clona para não mutar o cache do react-query
        consolidated.set(key, { ...item });
      }
    });
    
    return Array.from(consolidated.values());
  })();

  const isDefaultView = !search && !selectedCategory && !showAll;
  const displayedEquipments = isDefaultView ? equipments.slice(0, 8) : equipments;

  const handleSearch = () => {
    if (equipments && equipments.length === 1) {
      setSelectedEquipment(equipments[0]);
      setIsModalOpen(true);
    } else {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const categories = [
    { name: 'Drones', color: 'bg-blue-500/5 hover:bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', value: 'drones' },
    { name: 'Áudio', color: 'bg-purple-500/5 hover:bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', value: 'audio' },
    { name: 'Estúdios', color: 'bg-orange-500/5 hover:bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', value: 'estudio' },
    { name: 'Veículos', color: 'bg-zinc-500/5 hover:bg-zinc-500/10', border: 'border-zinc-500/20', text: 'text-zinc-400', value: 'veiculos' },
    { name: 'Telões & LED', color: 'bg-yellow-500/5 hover:bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', value: 'led' },
    { name: 'Seguros', color: 'bg-emerald-500/5 hover:bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', value: 'seguros' },
    { name: 'Equipe', color: 'bg-pink-500/5 hover:bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400', value: 'equipe' },
  ];

  return (
    <div className="flex flex-col items-center pt-2 md:pt-4 pb-8 px-6 w-full max-w-7xl mx-auto">
      <div className="text-center mb-4 md:mb-6 animate-in fade-in slide-in-from-top-8 duration-1000 ease-out">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2 md:mb-4">
          <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary">Sua produção no próximo nível</span>
        </div>
        
        <div className="flex flex-col items-center gap-2 mb-2 md:mb-4">
          <img 
            src="/logo.png" 
            alt="Moving Logo" 
            className="w-full max-w-[200px] sm:max-w-[280px] md:max-w-[380px] h-auto object-contain drop-shadow-[0_0_30px_rgba(var(--primary),0.2)] animate-in zoom-in-95 duration-1000 ease-out" 
          />
        </div>

        <p className="text-[10px] md:text-[12px] text-muted-foreground max-w-lg mx-auto px-6 font-medium leading-relaxed opacity-80">
          Encontre câmeras, iluminação, áudio e agora <strong className="text-white font-black">telões de LED</strong> de alta definição para o seu set com as melhores locadoras do Brasil.
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row w-full max-w-4xl items-stretch sm:items-center gap-4 mb-6 md:mb-8 px-0 group">
        <div className="relative flex-1 group">
          <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-primary h-5 w-5 group-focus-within:scale-110 transition-transform z-10" />
          <Input 
            className="h-14 md:h-16 pl-14 text-base md:text-lg rounded-2xl bg-zinc-950/40 border-white/5 focus:border-primary/50 focus:ring-primary/20 transition-all font-medium placeholder:text-zinc-600 relative z-10 backdrop-blur-sm shadow-2xl" 
            placeholder="O que você está procurando hoje?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button 
          className="h-14 md:h-16 px-10 text-base md:text-lg rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest sm:px-12 shadow-xl shadow-primary/20 transition-all hover:-translate-y-1 active:translate-y-0 relative z-10"
          onClick={handleSearch}
        >
          Buscar Agora
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="w-full mb-12 overflow-x-auto pb-4 hide-scrollbar">
        <div className="flex flex-nowrap md:grid md:grid-cols-4 lg:grid-cols-7 gap-4 min-w-max md:min-w-0">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(selectedCategory === cat.value ? undefined : cat.value)}
              className={`flex flex-col items-center justify-center p-6 rounded-3xl transition-all border-2 w-40 md:w-auto group
                ${selectedCategory === cat.value 
                  ? `${cat.color} border-primary shadow-[0_0_30px_rgba(var(--primary),0.15)] scale-105` 
                  : `${cat.color} border-white/5 hover:border-zinc-800 opacity-60 hover:opacity-100 hover:scale-105`}`}
            >
              <span className={`font-black tracking-[0.15em] uppercase text-[9px] md:text-[10px] ${cat.text} group-hover:scale-110 transition-transform text-center`}>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div id="results-section" className="w-full mb-20 scroll-mt-24">
        <div className="flex items-center justify-between mb-10">
          <div className="flex flex-col gap-1">
            <h3 className="text-2xl md:text-3xl font-display font-black tracking-tighter uppercase">
              {selectedCategory ? `Resultados em ${categories.find(c => c.value === selectedCategory)?.name}` : 'Equipamentos em Destaque'}
            </h3>
            <div className="h-1 w-12 bg-primary rounded-full" />
          </div>
          {selectedCategory && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(undefined)} className="text-zinc-500 hover:text-white uppercase font-black tracking-widest text-[10px]">
              Limpar Filtros
            </Button>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
              <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
            </div>
            <p className="text-zinc-500 animate-pulse font-black uppercase tracking-[0.2em] text-[10px]">Sincronizando com o Hub...</p>
          </div>
        ) : equipments?.length === 0 ? (
          <div className="text-center py-24 bg-zinc-950/20 rounded-[40px] border-2 border-dashed border-white/5 backdrop-blur-sm">
            <Package className="h-16 w-16 mx-auto text-zinc-800 mb-6" />
            <h4 className="text-xl font-black uppercase tracking-tighter">Início de Produção</h4>
            <p className="text-muted-foreground mt-2 max-w-xs mx-auto">Nenhum item encontrado nesta categoria ainda.</p>
            <Button variant="link" onClick={() => { setSearch(''); setSelectedCategory(undefined); }} className="mt-6 text-primary font-black uppercase tracking-widest text-[10px]">
              Ver todos os equipamentos
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 w-full">
              {displayedEquipments?.map((item) => (
                <EquipmentCard
                  key={item.id}
                  item={item}
                  onClick={() => {
                    setSelectedEquipment(item);
                    setIsModalOpen(true);
                  }}
                />
              ))}
            </div>

            {isDefaultView && equipments && equipments.length > 8 && (
              <div className="mt-20 w-full flex justify-center">
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => setShowAll(true)} 
                  className="rounded-2xl border-white/5 bg-zinc-950/50 text-zinc-400 hover:text-white hover:bg-zinc-900 border-2 px-12 h-16 font-black tracking-widest uppercase text-xs transition-all hover:scale-105 active:scale-95 shadow-2xl"
                >
                  Ver Catálogo Completo
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Featured Banners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 w-full mb-24 items-stretch">
        <div className="relative overflow-hidden rounded-[40px] bg-zinc-950/40 border border-white/5 p-12 min-h-[380px] flex flex-col justify-between group cursor-pointer hover:border-primary/20 transition-all duration-500 shadow-2xl">
          <div className="z-10 max-w-[240px]">
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest mb-6">Cinema Ready</div>
            <h2 className="text-5xl font-display font-black text-white tracking-tighter uppercase mb-6 leading-[0.85]">Câmeras & Lentes</h2>
            <p className="text-zinc-500 mb-8 font-medium leading-relaxed">O melhor do cinema mundial no seu set com suporte técnico especializado.</p>
            <Button className="w-fit bg-primary hover:bg-primary/80 text-white border-none rounded-2xl font-black uppercase tracking-widest text-[10px] h-14 px-10 shadow-xl shadow-primary/20 transition-all hover:-translate-y-1">
              Explorar <ChevronRight className="ml-2 h-4 w-4"/>
            </Button>
          </div>
          <div className="absolute right-[-5%] bottom-[-5%] w-[60%] h-full pointer-events-none opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-1000">
             <img 
              src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop" 
              alt="Câmera"
              className="w-full h-full object-contain mix-blend-screen" 
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
        
        <div className="relative overflow-hidden rounded-[40px] bg-zinc-950/40 border border-white/5 p-12 min-h-[380px] flex flex-col justify-between group cursor-pointer hover:border-emerald-500/20 transition-all duration-500 shadow-2xl">
          <div className="z-10 max-w-[240px]">
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase tracking-widest mb-6">Pro Lighting</div>
            <h2 className="text-5xl font-display font-black text-white tracking-tighter uppercase mb-6 leading-[0.85]">Iluminação & Grip</h2>
            <p className="text-zinc-500 mb-8 font-medium leading-relaxed">Controle total da luz com acessórios profissionais e telões de LED de alta definição.</p>
            <Button className="w-fit bg-emerald-600 hover:bg-emerald-500 text-white border-none rounded-2xl font-black uppercase tracking-widest text-[10px] h-14 px-10 shadow-xl shadow-emerald-500/20 transition-all hover:-translate-y-1">
              Buscar <ChevronRight className="ml-2 h-4 w-4"/>
            </Button>
          </div>
          <div className="absolute right-[-5%] bottom-[-5%] w-[60%] h-full pointer-events-none opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-1000">
            <img 
              src="https://images.unsplash.com/photo-1527011045974-436f32dba597?q=80&w=800&auto=format&fit=crop" 
              alt="Iluminação"
              className="w-full h-full object-contain mix-blend-screen" 
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      <QuickBookingModal 
        equipment={selectedEquipment} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
