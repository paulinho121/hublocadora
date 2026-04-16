import { Check, Clock, Package, Truck, CheckCircle2, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';

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
      <div className="relative flex justify-between">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-zinc-800 -translate-y-1/2 z-0" />
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
          className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-1000 ease-in-out shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
        />

        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.2 : 1,
                  backgroundColor: isCompleted || isCurrent ? 'var(--primary)' : '#18181b',
                  borderColor: isCompleted || isCurrent ? 'var(--primary)' : '#27272a',
                }}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors duration-500 ${
                  isCurrent ? 'ring-4 ring-primary/20' : ''
                }`}
              >
                <Icon 
                  className={`h-5 w-5 ${
                    isCompleted || isCurrent ? 'text-black' : 'text-zinc-600'
                  }`} 
                />
              </motion.div>
              <div className="absolute -bottom-8 whitespace-nowrap text-center">
                <p className={`text-[10px] font-black uppercase tracking-widest italic ${
                  isCurrent ? 'text-primary' : isCompleted ? 'text-zinc-300' : 'text-zinc-600'
                }`}>
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
