import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEquipments } from '@/hooks/useEquipments';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MapPin, 
  ChevronRight, 
  Video, 
  Loader2, 
  Package, 
  Search, 
  Sparkles, 
  Aperture, 
  Zap, 
  Mic2, 
  Navigation, 
  Layers,
  BoxSelect
} from 'lucide-react';
import { BrandMarquee } from '@/components/home/BrandMarquee';
import { QuickBookingModal } from '@/components/marketplace/QuickBookingModal';
import { Equipment } from '@/types/database';
import { motion, AnimatePresence } from 'motion/react';
import { EquipmentCard } from '@/components/marketplace/EquipmentCard';


export default function Marketplace() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>();
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | undefined>();
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  
  const { data: rawEquipments, isLoading } = useEquipments({
    searchQuery: search,
    category: selectedCategory,
    brand: selectedBrand,
    subCategory: selectedSubCategory
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
    { 
      name: 'Câmeras', 
      value: 'cameras', 
      icon: <Video className="w-3.5 h-3.5" />,
      types: ['Cinema', 'Mirrorless', 'Action', 'Broadcasting'],
      brands: ['ARRI', 'RED', 'Sony', 'Canon', 'Blackmagic']
    },
    { 
      name: 'Lentes', 
      value: 'lentes', 
      icon: <Aperture className="w-3.5 h-3.5" />,
      types: ['Prime', 'Zoom', 'Anamórfica', 'Macro'],
      brands: ['Zeiss', 'Cooke', 'Angénieux', 'Leica', 'Fujinon']
    },
    { 
      name: 'Modificadores', 
      value: 'modificadores', 
      icon: <BoxSelect className="w-3.5 h-3.5" />,
      types: ['Softbox', 'Octabank', 'Lantern', 'Grid', 'Flag'],
      brands: ['Chimera', 'DoPchoice', 'Aputure', 'Nanlite']
    },
    { 
      name: 'Iluminação', 
      value: 'iluminacao', 
      icon: <Zap className="w-3.5 h-3.5" />,
      types: ['LED Panel', 'COB', 'Fresnel', 'Tubo LED'],
      brands: ['Arri', 'Aputure', 'Nanlite', 'Astera']
    },
    { 
      name: 'Drones', 
      value: 'drones', 
      icon: <Navigation className="w-3.5 h-3.5" />,
      types: ['Cinematic', 'FPV', 'Enterprise'],
      brands: ['DJI', 'Freefly', 'Autel']
    },
    { 
      name: 'Áudio', 
      value: 'audio', 
      icon: <Mic2 className="w-3.5 h-3.5" />,
      types: ['Gravadores', 'Microfones', 'Wireless', 'Monitoração'],
      brands: ['Sennheiser', 'Sound Devices', 'Zaxcom', 'Rode']
    },
    { 
      name: 'Grip', 
      value: 'grip', 
      icon: <Layers className="w-3.5 h-3.5" />,
      types: ['Tripés', 'Sliders', 'Dollies', 'Gruas'],
      brands: ['Matthews', 'Kupo', 'Avenger', 'Sachtler']
    },
  ];

  const activeCategory = categories.find(c => c.value === selectedCategory);

  return (
    <div className="flex flex-col items-center pb-8 w-full">

      {/* ── Hero Search Section ─────────────────────────────────────────────── */}
      <div className="relative w-full flex flex-col items-center overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/8 rounded-full blur-[120px] opacity-60" />
          <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-red-900/10 rounded-full blur-[80px]" />
          <div className="absolute top-10 right-1/4 w-[200px] h-[200px] bg-rose-800/8 rounded-full blur-[60px]" />
        </div>

        {/* ── Central Search Block ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="w-full max-w-7xl mx-auto px-6 pt-8 pb-6 flex flex-col items-center text-center relative z-10"
        >
          {/* Tagline badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md mb-6"
          >
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary">O Hub da sua produção</span>
          </motion.div>
          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tighter text-white mb-3 leading-[0.9]">
            Encontre o equipamento<br />
            <span className="text-primary">perfeito</span> para o seu set.
          </h1>
          <p className="text-zinc-500 text-sm md:text-base font-medium mb-10 max-w-xl">
            A maior infraestrutura cinematográfica do Brasil — tecnologia high-end e logística inteligente.
          </p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="flex flex-col sm:flex-row w-full max-w-3xl items-stretch sm:items-center gap-3 relative group"
          >
            <div className="absolute -inset-6 bg-primary/5 blur-3xl rounded-full opacity-40 group-focus-within:opacity-80 transition-opacity pointer-events-none" />

            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none z-20">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <Input
                className="h-14 md:h-[60px] pl-14 pr-4 text-sm md:text-base rounded-2xl bg-zinc-900/60 border-white/10 focus:border-primary/60 focus:ring-4 focus:ring-primary/10 transition-all font-medium placeholder:text-zinc-600 relative z-10 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] border-2"
                placeholder="Qual equipamento você precisa para seu set hoje?"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <Button
              className="h-14 md:h-[60px] px-10 sm:px-12 text-sm md:text-base clay-button-primary font-black uppercase tracking-[0.2em] relative z-10 overflow-hidden group/btn shrink-0"
              onClick={handleSearch}
            >
              <span className="relative z-10 flex items-center gap-2">
                Buscar Agora <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
            </Button>
          </motion.div>

          {/* ── Category pill buttons ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-6 flex flex-wrap justify-center gap-2.5"
          >
            {categories.map((cat, idx) => (
              <motion.button
                key={cat.name}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + idx * 0.05 }}
                onClick={() => {
                  if (selectedCategory === cat.value) {
                    setSelectedCategory(undefined);
                    setSelectedBrand(undefined);
                    setSelectedSubCategory(undefined);
                  } else {
                    setSelectedCategory(cat.value);
                    setSelectedBrand(undefined);
                    setSelectedSubCategory(undefined);
                  }
                }}
                className={`relative flex items-center gap-2.5 px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.18em] transition-all duration-300 border backdrop-blur-md overflow-hidden group
                  ${selectedCategory === cat.value
                    ? `bg-primary/20 border-primary/40 text-primary scale-105 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]`
                    : `bg-zinc-900/40 border-white/8 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-zinc-800/60 hover:scale-105`
                  }`}
              >
                {selectedCategory === cat.value && (
                  <span className={`absolute inset-0 opacity-10 bg-primary animate-pulse`} />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {cat.icon}
                  {cat.name}
                </span>
              </motion.button>
            ))}
          </motion.div>

          {/* ── Interactive Sub-filters (Brands & Types) ── */}
          <AnimatePresence>
            {activeCategory && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="w-full max-w-4xl mt-8 pt-6 border-t border-white/5 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                  {/* Sub-categories / Types */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">Filtrar por Tipo</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedSubCategory(undefined)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!selectedSubCategory ? 'bg-white/10 text-white border border-white/20' : 'bg-transparent text-zinc-600 border border-transparent hover:text-zinc-400'}`}
                      >
                        Todos
                      </button>
                      {activeCategory.types.map(type => (
                        <button
                          key={type}
                          onClick={() => setSelectedSubCategory(selectedSubCategory === type ? undefined : type)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${selectedSubCategory === type ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-zinc-400 border border-white/5 hover:border-white/10 hover:text-white'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Brands */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">Filtrar por Marca</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedBrand(undefined)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!selectedBrand ? 'bg-white/10 text-white border border-white/20' : 'bg-transparent text-zinc-600 border border-transparent hover:text-zinc-400'}`}
                      >
                        Todas
                      </button>
                      {activeCategory.brands.map(brand => (
                        <button
                          key={brand}
                          onClick={() => setSelectedBrand(selectedBrand === brand ? undefined : brand)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${selectedBrand === brand ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-white/5 text-zinc-400 border border-white/5 hover:border-white/10 hover:text-white'}`}
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Divider glow line */}
        <div className="w-full max-w-7xl mx-auto px-6 pb-8">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        </div>
      </div>

      {/* Results section wrapper */}
      <div className="w-full max-w-7xl mx-auto px-6">

      <div id="results-section" className="w-full mb-20 scroll-mt-24">
        <div className="flex items-center justify-between mb-10">
          <div className="flex flex-col gap-1">
            <h3 className="text-2xl md:text-3xl font-display font-black tracking-tighter uppercase">
              {selectedCategory ? `Resultados em ${categories.find(c => c.value === selectedCategory)?.name}` : 'Equipamentos em Destaque'}
            </h3>
            <div className="h-1 w-12 bg-primary rounded-full" />
          </div>
          {selectedCategory && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSelectedCategory(undefined);
                setSelectedBrand(undefined);
                setSelectedSubCategory(undefined);
              }} 
              className="text-zinc-500 hover:text-white uppercase font-black tracking-widest text-[10px]"
            >
              Limpar Filtros
            </Button>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
        <div id="results-section" className="w-full max-w-7xl mt-12 mb-20">
          <div className="flex items-center justify-between mb-10">
            <div className="flex flex-col gap-1">
              <h3 className="text-2xl md:text-3xl font-display font-black tracking-tighter uppercase">
                {selectedCategory ? `Resultados em ${categories.find(c => c.value === selectedCategory)?.name}` : 'Equipamentos em Destaque'}
              </h3>
              <div className="h-1 w-12 bg-primary rounded-full" />
            </div>
            {selectedCategory && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSelectedCategory(undefined);
                  setSelectedBrand(undefined);
                  setSelectedSubCategory(undefined);
                }} 
                className="text-zinc-500 hover:text-white uppercase font-black tracking-widest text-[10px]"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-[380px] rounded-[2.5rem] bg-zinc-900/40 border border-white/5 animate-pulse overflow-hidden relative">
                   <div className="h-48 bg-zinc-800/50" />
                   <div className="p-6 space-y-4">
                      <div className="h-4 w-3/4 bg-zinc-800/50 rounded-full" />
                      <div className="h-3 w-1/2 bg-zinc-800/30 rounded-full" />
                      <div className="mt-8 h-12 w-full bg-zinc-800/20 rounded-2xl" />
                   </div>
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {displayedEquipments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="h-20 w-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
                    <Package className="h-8 w-8 text-zinc-700" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Nenhum item encontrado</h3>
                  <p className="text-zinc-500 max-w-xs mb-8">Tente ajustar seus filtros ou busca para encontrar o que precisa.</p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearch('');
                      setSelectedCategory(undefined);
                      setSelectedBrand(undefined);
                      setSelectedSubCategory(undefined);
                    }}
                    className="rounded-xl h-10 px-6 border-zinc-800 text-zinc-400"
                  >
                    Limpar Tudo
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {displayedEquipments.map((item) => (
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
              )}

              {isDefaultView && equipments && equipments.length > 8 && !showAll && (
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
            </>
          )}
        </div>
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
      </div>{/* end results wrapper */}

      <QuickBookingModal 
        equipment={selectedEquipment} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
