import { useParams, useNavigate } from 'react-router-dom';
import { useEquipment } from '@/hooks/useEquipments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ChevronLeft, 
  Star, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  MessageSquare,
  Package,
  ArrowRight,
  Info,
  Loader2,
  Camera,
  Truck,
  Hash
} from 'lucide-react';
import { useState } from 'react';
import { useEquipmentAvailability } from '@/hooks/useAvailability';
import { PixPaymentModal } from '@/components/checkout/PixPaymentModal';
import { BookingService } from '@/services/BookingService';
import { useAuth } from '@/contexts/AuthContext';
import { ReviewService } from '@/services/ReviewService';
import { useQuery } from '@tanstack/react-query';

export default function EquipmentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: equipment, isLoading } = useEquipment(id || '');
  const [activeImage, setActiveImage] = useState(0);
  
  // Controle de datas para checagem de disponibilidade
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeek);
  
  const { data: availability, isLoading: isLoadingAvail } = useEquipmentAvailability(id || '', startDate, endDate);
  const { user } = useAuth();
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: reviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => ReviewService.getByEquipment(id || ''),
    enabled: !!id
  });

  const handleStartBooking = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      setIsSubmitting(true);
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const totalAmount = equipment.daily_rate * days;

      const booking = await BookingService.createBooking({
        equipment_id: equipment.id,
        renter_id: user.id,
        company_id: equipment.company_id,
        start_date: startDate,
        end_date: endDate,
        total_amount: totalAmount,
        status: 'pending',
        quantity: 1,
        delivery_method: 'pickup',
        delivery_address: null,
        notes: null
      });

      setCreatedBookingId(booking.id);
      setIsPixModalOpen(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-zinc-500 font-medium animate-pulse">Carregando especificações técnicas...</p>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h2 className="text-2xl font-bold">Equipamento não encontrado</h2>
        <Button onClick={() => navigate('/')} className="mt-4">Voltar para o Marketplace</Button>
      </div>
    );
  }

  const conditionLabels = {
    excellent: 'Impecável',
    good: 'Bom Estado',
    fair: 'Marcas de Uso',
    maintenance: 'Em Manutenção'
  };

  const conditionColors = {
    excellent: 'text-emerald-400 bg-emerald-500/10',
    good: 'text-blue-400 bg-blue-500/10',
    fair: 'text-amber-400 bg-amber-500/10',
    maintenance: 'text-red-400 bg-red-500/10'
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-20">
      {/* Header Fixo Mobile / Header MD */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-tighter">Voltar</span>
          </button>
          <div className="flex items-center gap-4">
             <Badge variant="outline" className="border-zinc-800 text-zinc-500 hidden sm:flex">ID: {id?.slice(0, 8)}</Badge>
             <Button size="sm" variant="ghost" className="text-zinc-400">
               <ShieldCheck className="w-4 h-4 mr-2" />
               <span className="text-xs font-bold uppercase italic">Seguro Ativo</span>
             </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          
          {/* Galeria de Imagens */}
          <div className="space-y-4">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 relative group">
              {equipment.images?.[activeImage] ? (
                <img 
                  src={equipment.images[activeImage]} 
                  alt={equipment.name} 
                  className="w-full h-full object-contain p-4 animate-in fade-in duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                  <Camera className="w-20 h-20" />
                </div>
              )}
              <div className="absolute top-4 left-4">
                <Badge className="bg-primary/90 backdrop-blur-md text-white border-none font-black italic uppercase tracking-tighter px-3 py-1">
                  {equipment.category}
                </Badge>
              </div>
            </div>
            
            {equipment.images && equipment.images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                {equipment.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`relative w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all shrink-0
                      ${activeImage === idx ? 'border-primary' : 'border-zinc-800 opacity-60 hover:opacity-100'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Selos de Confiança */}
            <div className="grid grid-cols-3 gap-4 pt-4">
               <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-center">
                  <ShieldCheck className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                  <p className="text-[10px] font-black uppercase tracking-tighter">Proteção HUB</p>
               </div>
               <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-center">
                  <Star className="w-6 h-6 mx-auto mb-2 text-yellow-500 fill-yellow-500" />
                  <p className="text-[10px] font-black uppercase tracking-tighter">Top Rated</p>
               </div>
               <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-center">
                  <Package className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <p className="text-[10px] font-black uppercase tracking-tighter">Original</p>
               </div>
            </div>
          </div>

          {/* Informações e Booking */}
          <div className="flex flex-col">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic ${conditionColors[equipment.condition]}`}>
                  {conditionLabels[equipment.condition]}
                </span>
                <span className="text-zinc-500">•</span>
                <div className="flex items-center gap-1 text-zinc-400 text-xs">
                  <MapPin className="w-3 h-3" />
                  <span>{equipment.company?.address_city || 'Fortaleza'} - {equipment.company?.address_state || 'CE'}</span>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none mb-4">
                {equipment.name}
              </h1>
              <p className="text-zinc-400 text-lg leading-relaxed font-medium">
                {equipment.description}
              </p>
            </div>

            {/* Sidebar de Preço / Card Mobile */}
            <Card className="border-zinc-800 bg-zinc-950/50 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl">
              <CardContent className="p-8">
                <div className="flex items-end justify-between mb-8 pb-8 border-b border-zinc-900">
                  <div>
                    <p className="text-zinc-500 uppercase font-black italic tracking-widest text-xs mb-1">Preço da Diária</p>
                    <div className="flex items-baseline gap-2">
                       <span className="text-4xl font-black text-zinc-100 tracking-tighter leading-none">
                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(equipment.daily_rate)}
                       </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-zinc-500 mb-1">Avaliação</p>
                    <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-lg">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-black italic">4.9</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between text-sm font-medium">
                      <span className="text-zinc-500">Taxa de Serviço HUB (15%)</span>
                      <span className="text-zinc-300">Incluso</span>
                   </div>
                   <div className="flex items-center justify-between text-sm font-medium">
                      <span className="text-zinc-500">Garantia Reembolsável</span>
                      <span className="text-emerald-500">CINE Care Ativo</span>
                   </div>
                </div>

                <div className="mt-8 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 space-y-4">
                   <p className="text-[10px] uppercase font-black italic text-zinc-500 tracking-widest text-center">Consultar Calendário</p>
                   <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                         <label className="text-[9px] uppercase font-bold text-zinc-500 ml-1">Retirada</label>
                         <input 
                           type="date" 
                           value={startDate} 
                           onChange={(e) => setStartDate(e.target.value)}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs font-bold text-zinc-100 focus:outline-none focus:ring-1 focus:ring-primary"
                         />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[9px] uppercase font-bold text-zinc-500 ml-1">Devolução</label>
                         <input 
                           type="date" 
                           value={endDate} 
                           onChange={(e) => setEndDate(e.target.value)}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs font-bold text-zinc-100 focus:outline-none focus:ring-1 focus:ring-primary"
                         />
                      </div>
                   </div>

                   {isLoadingAvail ? (
                     <div className="flex justify-center p-2"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                   ) : availability && (
                     <div className="flex items-center justify-between px-2 pt-2 border-t border-zinc-800/50">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${availability.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                           <span className={`text-[11px] font-black uppercase italic ${availability.isAvailable ? 'text-emerald-500' : 'text-red-500'}`}>
                              {availability.isAvailable ? 'Equipamento Disponível' : 'Indisponível no Período'}
                           </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-500">
                           <Hash className="w-3 h-3" />
                           Estoque: <span className="text-zinc-200">{availability.available} / {availability.total}</span>
                        </div>
                     </div>
                   )}
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <Button 
                     onClick={handleStartBooking}
                     disabled={!availability?.isAvailable || isSubmitting}
                     className={`h-14 rounded-2xl font-black italic uppercase tracking-tighter text-lg group shadow-2xl transition-all
                       ${availability?.isAvailable 
                         ? 'bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_rgba(234,88,12,0.3)]' 
                         : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                   >
                      {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : availability?.isAvailable ? 'Alugar Agora' : 'Indisponível'}
                      {!isSubmitting && <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                   </Button>
                   <Button variant="outline" className="h-14 rounded-2xl border-zinc-800 bg-transparent text-zinc-200 font-bold uppercase tracking-tighter hover:bg-zinc-900/50">
                      <MessageSquare className="mr-2 w-5 h-5" /> Falar com Locadora
                   </Button>
                </div>
              </CardContent>
            </Card>

            {/* Especificações Adicionais */}
            <div className="mt-12 space-y-6">
               <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" /> Detalhes Técnicos
               </h3>
               <div className="grid grid-cols-2 gap-4">
                  {equipment.features && Object.entries(equipment.features).map(([key, value]) => (
                    <div key={key} className="bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
                       <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1 italic">{key}</p>
                       <p className="font-bold text-zinc-300">{String(value)}</p>
                    </div>
                  ))}
                  {!equipment.features || Object.keys(equipment.features).length === 0 && (
                     <p className="text-zinc-500 italic text-sm col-span-2">Consulte a locadora para especificações completas de montagem e acessórios.</p>
                  )}
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
