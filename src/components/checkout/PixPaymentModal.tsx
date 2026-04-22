import { useState, useEffect } from 'react';
import { CheckCircle2, Copy, Loader2, QrCode, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { PaymentService } from '@/services/PaymentService';
import { Payment } from '@/types/database';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  amount: number;
  onSuccess: () => void;
}

export function PixPaymentModal({ isOpen, onClose, bookingId, amount, onSuccess }: PixPaymentModalProps) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && bookingId) {
      PaymentService.generatePixPayment(bookingId, amount).then(data => {
        setPayment(data);
        setLoading(false);
      });
    }
  }, [isOpen, bookingId]);

  const copyToClipboard = () => {
    if (payment?.qr_code) {
      navigator.clipboard.writeText(payment.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Pagamento via PIX">
      <div className="text-center space-y-6">
        <h3 className="text-4xl font-black uppercase tracking-tighter text-zinc-100">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}
        </h3>
        <div className="bg-white rounded-3xl p-6 shadow-2xl flex items-center justify-center aspect-square">
          {loading ? <Loader2 className="h-10 w-10 animate-spin text-zinc-900" /> : <QrCode className="h-40 w-40 text-zinc-900" />}
        </div>
        <Button onClick={copyToClipboard} variant="outline" className="w-full h-12 uppercase text-[10px] font-black tracking-widest rounded-xl">
           {copied ? "PIX Copiado!" : "Copiar Código PIX"}
        </Button>
        <p className="text-[9px] uppercase font-black text-zinc-600 tracking-widest">Pagamento Seguro via HUB PAY</p>
      </div>
    </Dialog>
  );
}
