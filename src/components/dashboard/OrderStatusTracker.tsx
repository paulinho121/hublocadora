import { Check, Package, Truck, CheckCircle2, ShoppingBag } from 'lucide-react';
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

export function OrderStatusTracker({ status }: OrderStatusTrackerProps) {
  const currentStepIndex = STEPS.findIndex(s => s.id === status);
  
  if (status === 'cancelled') {
    return (
      <div className="bg-destructive/5 border border-destructive/10 rounded-3xl p-8 text-center backdrop-blur-xl">
        <p className="text-destructive font-black uppercase tracking-[0.2em] text-[10px]">Operação Abortada</p>
      </div>
    );
  }

  return (
    <div className="w-full py-12">
      {/* Premium Wave Animations */}
      <style>{`
        @keyframes liquid-wave {
          from { transform: translate(-50%, 0) rotate(0deg); }
          to { transform: translate(-50%, 0) rotate(360deg); }
        }
        .liquid-wave {
          position: absolute;
          width: 250%;
          height: 250%;
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.4) 0%, rgba(5, 150, 105, 0.8) 100%);
          bottom: -20px;
          left: 50%;
          border-radius: 38%;
          animation: liquid-wave 8s linear infinite;
          z-index: 1;
          filter: blur(2px);
        }
        .liquid-wave-top {
           background: rgba(16, 185, 129, 0.3);
           animation-duration: 4s;
           z-index: 2;
           bottom: -15px;
           border-radius: 42%;
        }
      `}</style>

      <div className="relative flex justify-between px-4 sm:px-12">
        {/* Progress Line - Stealth Base */}
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 -translate-y-1/2 z-0" />
        
        {/* Progress Line - Active Glow */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
          className="absolute top-1/2 left-0 h-[1px] bg-gradient-to-r from-emerald-500 to-teal-400 -translate-y-1/2 z-0 transition-all duration-1000 ease-in-out shadow-[0_0_15px_rgba(16,185,129,0.5)]"
        />

        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          let fillPercentage = 0;
          if (isCompleted) fillPercentage = 100;
          if (isCurrent) fillPercentage = 70;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.25 : 1,
                  borderColor: isCompleted || isCurrent ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.05)',
                }}
                className={`group relative w-10 h-10 sm:w-14 sm:h-14 rounded-full border bg-zinc-950 flex items-center justify-center transition-all duration-700 overflow-hidden ${
                  isCurrent ? 'ring-8 ring-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.15)]' : ''
                }`}
              >
                {/* Liquid Level Visualizer */}
                <AnimatePresence>
                  {(isCompleted || isCurrent) && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${fillPercentage}%` }}
                      transition={{ duration: 2, ease: "circOut" }}
                      className="absolute bottom-0 left-0 w-full bg-emerald-500/5 z-0"
                    >
                      <div className="liquid-wave" />
                      {!isCompleted && <div className="liquid-wave liquid-wave-top" />}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Icon with Dynamic Glow */}
                <Icon 
                  className={`h-4 w-4 sm:h-6 sm:w-6 relative z-10 transition-all duration-500 ${
                    isCompleted || isCurrent 
                      ? 'text-white drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' 
                      : 'text-zinc-800'
                  }`} 
                />
              </motion.div>

              {/* High-End Labeling */}
              <div className="absolute -bottom-10 sm:-bottom-12 whitespace-nowrap text-center">
                <p className={`text-[7px] sm:text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${
                  isCurrent ? 'text-emerald-400' : isCompleted ? 'text-zinc-400' : 'text-zinc-800'
                }`}>
                  {step.label}
                </p>
                {isCurrent && (
                   <motion.div 
                     layoutId="current-indicator"
                     className="h-[2px] w-full bg-emerald-500/40 blur-[1px] rounded-full mt-2 mx-auto"
                     animate={{ opacity: [0.2, 0.6, 0.2] }}
                     transition={{ repeat: Infinity, duration: 2 }}
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

