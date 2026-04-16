import { Check, Clock, Package, Truck, CheckCircle2, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type DeliveryStatus = 'pending' | 'picking' | 'ready' | 'shipped' | 'delivered' | 'cancelled';

interface OrderStatusTrackerProps {
  status: DeliveryStatus;
  updatedAt?: string;
}

const STEPS = [
  { id: 'pending', label: 'Recebido', icon: ShoppingBag },
  { id: 'picking', label: 'Separação', icon: Package },
  { id: 'ready', label: 'Pronto', icon: Check },
  { id: 'shipped', label: 'Em Trânsito', icon: Truck },
  { id: 'delivered', label: 'Entregue', icon: CheckCircle2 },
];

export function OrderStatusTracker({ status, updatedAt }: OrderStatusTrackerProps) {
  const currentStepIndex = STEPS.findIndex(s => s.id === status);
  
  if (status === 'cancelled') {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 text-center">
        <p className="text-destructive font-black uppercase italic tracking-tighter">Pedido Cancelado</p>
      </div>
    );
  }

  return (
    <div className="w-full py-8">
      {/* Wave Keyframes Style */}
      <style>{`
        @keyframes liquid-wave {
          from { transform: translate(-50%, 0) rotate(0deg); }
          to { transform: translate(-50%, 0) rotate(360deg); }
        }
        .liquid-wave {
          position: absolute;
          width: 200%;
          height: 200%;
          background: rgba(var(--primary-rgb), 0.8);
          bottom: 0px;
          left: 50%;
          border-radius: 35%;
          animation: liquid-wave 5s linear infinite;
          z-index: 1;
        }
        .liquid-wave-top {
           background: rgba(var(--primary-rgb), 0.5);
           animation-duration: 3s;
           z-index: 2;
           bottom: 5px;
           border-radius: 40%;
        }
      `}</style>

      <div className="relative flex justify-between px-4 sm:px-8">
        {/* Main Progress Line (Gray Background) */}
        <div className="absolute top-1/2 left-0 w-full h-[3px] bg-zinc-800 -translate-y-1/2 z-0 rounded-full" />
        
        {/* Animated Progress Line (Filled) */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
          className="absolute top-1/2 left-0 h-[3px] bg-primary -translate-y-1/2 z-0 transition-all duration-1000 ease-in-out shadow-[0_0_20px_rgba(var(--primary-rgb),0.6)] rounded-full"
        />

        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;

          let fillPercentage = 0;
          if (isCompleted) fillPercentage = 100;
          if (isCurrent) fillPercentage = 65; // Enchendo...

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.4 : 1,
                  borderColor: isCompleted || isCurrent ? 'var(--primary)' : '#27272a',
                }}
                className={`group relative w-12 h-12 rounded-full border-2 bg-zinc-950 flex items-center justify-center transition-all duration-700 overflow-hidden ${
                  isCurrent ? 'ring-4 ring-primary/20 shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]' : ''
                }`}
              >
                {/* Liquid Background */}
                <AnimatePresence>
                  {(isCompleted || isCurrent) && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${fillPercentage}%` }}
                      transition={{ duration: 1.5, ease: "circOut" }}
                      className="absolute bottom-0 left-0 w-full bg-primary/20 z-0"
                    >
                      {/* Wave Animation */}
                      <div className="liquid-wave" />
                      {!isCompleted && <div className="liquid-wave liquid-wave-top" />}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Icon */}
                <Icon 
                  className={`h-5 w-5 relative z-10 transition-colors duration-500 ${
                    isCompleted || isCurrent ? 'text-white' : 'text-zinc-700'
                  }`} 
                />
              </motion.div>

              {/* Label */}
              <div className="absolute -bottom-10 whitespace-nowrap text-center">
                <p className={`text-[10px] font-black uppercase tracking-tighter italic transition-colors duration-500 ${
                  isCurrent ? 'text-primary' : isCompleted ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  {step.label}
                </p>
                {isCurrent && (
                   <motion.div 
                     animate={{ opacity: [0.3, 1, 0.3] }}
                     transition={{ repeat: Infinity, duration: 1.5 }}
                     className="h-1 w-full bg-primary/30 blur-sm rounded-full mt-1"
                   />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
