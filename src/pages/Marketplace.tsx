import { useState } from 'react';
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


export default function Marketplace() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  
  const { data: equipments, isLoading } = useEquipments({
    searchQuery: search,
    category: selectedCategory
  });

  const isDefaultView = !search && !selectedCategory && !showAll;
  const displayedEquipments = isDefaultView ? equipments?.slice(0, 8) : equipments;

  const handleSearch = () => {
    if (equipments && equipments.length === 1) {
      setSelectedEquipment(equipments[0]);
      setIsModalOpen(true);
    } else {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const categories = [
    { name: 'Drones', color: 'bg-blue-500/10 hover:bg-blue-500/20', text: 'text-blue-400', value: 'drones' },
    { name: 'Áudio', color: 'bg-purple-500/10 hover:bg-purple-500/20', text: 'text-purple-400', value: 'audio' },
    { name: 'Estúdios', color: 'bg-orange-500/10 hover:bg-orange-500/20', text: 'text-orange-400', value: 'estudio' },
    { name: 'Veículos', color: 'bg-zinc-500/10 hover:bg-zinc-500/20', text: 'text-zinc-400', value: 'veiculos' },
    { name: 'Telões & LED', color: 'bg-yellow-500/10 hover:bg-yellow-500/20', text: 'text-yellow-400', value: 'led' },
    { name: 'Seguros', color: 'bg-emerald-500/10 hover:bg-emerald-500/20', text: 'text-emerald-400', value: 'seguros' },
    { name: 'Equipe', color: 'bg-pink-500/10 hover:bg-pink-500/20', text: 'text-pink-400', value: 'equipe' },
  ];

  return (
    <div className="flex flex-col items-center pt-12 md:pt-20 pb-10 px-4 w-full max-w-7xl mx-auto">
      <div className="text-center mb-10 md:mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-black mb-4 tracking-tighter uppercase italic leading-[0.9]">
          O HUB da sua <span className="text-primary italic">produção</span>
        </h1>
        <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
          Encontre câmeras, iluminação, áudio e agora <strong>telões de LED</strong> de alta definição para o seu set.
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row w-full max-w-3xl items-stretch sm:items-center gap-3 mb-12 md:mb-16 px-0 md:px-4">
        <div className="relative flex-1 group">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-primary h-5 w-5 group-focus-within:scale-110 transition-transform" />
          <Input 
            className="h-12 md:h-14 pl-12 text-base md:text-lg rounded-xl bg-zinc-950/50 border-zinc-800 focus:border-primary/50 transition-all font-medium" 
            placeholder="O que você está procurando hoje?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button 
          className="h-12 md:h-14 px-8 text-base md:text-lg rounded-xl bg-primary hover:bg-primary/90 font-bold sm:px-10"
          onClick={handleSearch}
        >
          Buscar Agora
        </Button>
      </div>

      <div className="w-full mb-16 md:mb-20">
        <BrandMarquee />
      </div>

      {/* Categories Grid */}
      <div className="w-full mb-16 overflow-x-auto pb-4 hide-scrollbar">
        <div className="flex flex-nowrap md:grid md:grid-cols-4 lg:grid-cols-7 gap-4 min-w-max md:min-w-0">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(selectedCategory === cat.value ? undefined : cat.value)}
              className={`flex flex-col items-center justify-center p-6 rounded-2xl transition-all border-2 w-40 md:w-auto
                ${selectedCategory === cat.value 
                  ? `${cat.color} border-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]` 
                  : `${cat.color} border-transparent hover:border-zinc-800 opacity-60 hover:opacity-100`}`}
            >
              <span className={`font-bold tracking-tight uppercase text-xs md:text-sm ${cat.text}`}>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div id="results-section" className="w-full mb-12 scroll-mt-24">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold tracking-tight">
            {selectedCategory ? `Resultados em ${categories.find(c => c.value === selectedCategory)?.name}` : 'Equipamentos em Destaque'}
          </h3>
          {selectedCategory && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(undefined)} className="text-zinc-500">
              Limpar Filtros
            </Button>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-zinc-500 animate-pulse font-medium">Sincronizando com o Hub...</p>
          </div>
        ) : equipments?.length === 0 ? (
          <div className="text-center py-20 bg-zinc-950/50 rounded-3xl border-2 border-dashed border-zinc-800">
            <Package className="h-16 w-16 mx-auto text-zinc-800 mb-4" />
            <h4 className="text-xl font-bold">Início de Produção</h4>
            <p className="text-muted-foreground mt-2">Nenhum item encontrado nesta categoria ainda.</p>
            <Button variant="link" onClick={() => { setSearch(''); setSelectedCategory(undefined); }} className="mt-4 text-primary">
              Ver todos os equipamentos
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 w-full">
              {displayedEquipments?.map((item) => (
                <Card 
                  key={item.id} 
                  className="group overflow-hidden border-zinc-800 bg-zinc-950/30 hover:bg-zinc-950/80 hover:border-primary/50 transition-all duration-300 cursor-pointer shadow-xl flex flex-col"
                  onClick={() => {
                     setSelectedEquipment(item);
                     setIsModalOpen(true);
                  }}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-zinc-900 relative">
                    {item.images?.[0] ? (
                      <img 
                        src={item.images[0]} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700">
                        <Camera className="h-12 w-12" />
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-4">
                      <div className="min-w-0 pr-4">
                        <h4 className="text-lg font-black leading-tight italic uppercase tracking-tighter group-hover:text-primary transition-colors line-clamp-2">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          {(() => {
                            const isAvailable = (item.stock_quantity || 0) > 0;
                            return (
                              <Badge className={`${isAvailable ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20' : 'bg-red-500/20 text-red-500 border-red-500/20'} mb-2 uppercase font-black tracking-widest text-[10px]`}>
                                {isAvailable ? `${item.stock_quantity || 0} Unidades Disponíveis no HUB` : 'Limite de Estoque do HUB Atingido'}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50 mt-auto">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Diária</span>
                        <div className="text-lg font-black text-zinc-100 tracking-tighter">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.daily_rate)}
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] uppercase text-zinc-600 font-black tracking-widest">Estoque</span>
                        <div className="text-sm font-bold text-emerald-500">{item.stock_quantity || 0} Disponíveis</div>
                      </div>
                      <Button size="icon" className="h-10 w-10 rounded-lg bg-zinc-800 group-hover:bg-primary transition-all shadow-lg text-white">
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {isDefaultView && equipments && equipments.length > 8 && (
              <div className="mt-12 w-full flex justify-center">
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => setShowAll(true)} 
                  className="rounded-xl border-zinc-800 bg-zinc-950/50 text-zinc-300 hover:text-white hover:bg-zinc-900 border-2 px-8 h-14 font-bold tracking-tight uppercase"
                >
                  Ver Catálogo Completo
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Featured Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-20 items-stretch">
        <div className="relative overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 p-10 min-h-[320px] flex flex-col justify-between group cursor-pointer hover:border-primary/30 transition-all">
          <div className="z-10 max-w-[200px]">
            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-4 leading-[0.9]">Câmeras & Lentes</h2>
            <p className="text-zinc-500 mb-6 font-medium">O melhor do cinema mundial no seu set.</p>
            <Button className="w-fit bg-primary hover:bg-primary/80 text-white border-none rounded-xl font-bold h-12 px-6">
              Explorar <ChevronRight className="ml-2 h-4 w-4"/>
            </Button>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=600&auto=format&fit=crop" 
            alt="Câmera"
            className="absolute right-[-10%] bottom-[-10%] w-[70%] object-contain group-hover:scale-110 transition-transform duration-700 opacity-40 mix-blend-screen" 
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="relative overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 p-10 min-h-[320px] flex flex-col justify-between group cursor-pointer hover:border-emerald-500/30 transition-all">
          <div className="z-10 max-w-[200px]">
            <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-4 leading-[0.9]">Iluminação & Grip</h2>
            <p className="text-zinc-500 mb-6 font-medium">Controle total da luz com acessórios profissionais.</p>
            <Button className="w-fit bg-emerald-600 hover:bg-emerald-500 text-white border-none rounded-xl font-bold h-12 px-6">
              Buscar <ChevronRight className="ml-2 h-4 w-4"/>
            </Button>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1527011045974-436f32dba597?q=80&w=600&auto=format&fit=crop" 
            alt="Iluminação"
            className="absolute right-[-10%] bottom-[-10%] w-[70%] object-contain group-hover:scale-110 transition-transform duration-700 opacity-40 mix-blend-screen" 
            referrerPolicy="no-referrer"
          />
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
