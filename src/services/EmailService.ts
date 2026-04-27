import { supabase } from '@/lib/supabase';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export class EmailService {
  /**
   * Envia um e-mail via Supabase Edge Function (proxy seguro para o Resend).
   * A chave RESEND_API_KEY fica armazenada como secret no Supabase — nunca no frontend.
   */
  static async send(options: EmailOptions): Promise<void> {
    const { error } = await supabase.functions.invoke('send-email', {
      body: options,
    });

    if (error) {
      console.error('[EmailService] Erro ao enviar e-mail:', error);
      throw new Error(error.message ?? 'Falha ao enviar e-mail');
    }
  }

  // ─── Templates prontos ──────────────────────────────────────────────────────

  static async sendWelcome(params: { to: string; name: string; company: string }) {
    return this.send({
      to: params.to,
      subject: `Bem-vindo ao MOVING, ${params.name}!`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f0f0f;color:#f5f5f5;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#6c3de6,#a855f7);padding:32px;text-align:center;">
            <h1 style="margin:0;font-size:28px;color:#fff;">MOVING</h1>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#a855f7;">Olá, ${params.name}!</h2>
            <p style="color:#ccc;line-height:1.6;">
              Sua locadora <strong style="color:#fff;">${params.company}</strong> foi cadastrada com sucesso na plataforma MOVING.
            </p>
            <p style="color:#ccc;line-height:1.6;">
              Agora você pode gerenciar seu catálogo de equipamentos, aceitar reservas e muito mais.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${import.meta.env.VITE_APP_URL ?? 'https://moving.pro'}/dashboard"
                 style="background:#6c3de6;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Acessar Dashboard →
              </a>
            </div>
          </div>
          <div style="border-top:1px solid #222;padding:16px 32px;text-align:center;color:#666;font-size:12px;">
            MOVING · O Hub da sua produção
          </div>
        </div>
      `,
    });
  }

  static async sendBookingConfirmation(params: {
    to: string;
    customerName: string;
    equipmentName: string;
    startDate: string;
    endDate: string;
    totalPrice: string;
  }) {
    return this.send({
      to: params.to,
      subject: `✅ Reserva confirmada — ${params.equipmentName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f0f0f;color:#f5f5f5;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#6c3de6,#a855f7);padding:32px;text-align:center;">
            <h1 style="margin:0;font-size:28px;color:#fff;">MOVING</h1>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#a855f7;">Reserva Confirmada!</h2>
            <p style="color:#ccc;">Olá, <strong style="color:#fff;">${params.customerName}</strong>!</p>
            <div style="background:#1a1a1a;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #333;">
              <table style="width:100%;color:#ccc;font-size:14px;">
                <tr><td style="padding:6px 0;color:#888;">Equipamento</td><td style="color:#fff;font-weight:bold;">${params.equipmentName}</td></tr>
                <tr><td style="padding:6px 0;color:#888;">Retirada</td><td style="color:#fff;">${params.startDate}</td></tr>
                <tr><td style="padding:6px 0;color:#888;">Devolução</td><td style="color:#fff;">${params.endDate}</td></tr>
                <tr><td style="padding:6px 0;color:#888;">Total</td><td style="color:#a855f7;font-weight:bold;font-size:18px;">${params.totalPrice}</td></tr>
              </table>
            </div>
            <p style="color:#888;font-size:13px;">Em caso de dúvidas, entre em contato com a locadora.</p>
          </div>
          <div style="border-top:1px solid #222;padding:16px 32px;text-align:center;color:#666;font-size:12px;">
            MOVING · O Hub da sua produção
          </div>
        </div>
      `,
    });
  }

  static async sendPasswordReset(params: { to: string; name: string; resetLink: string }) {
    return this.send({
      to: params.to,
      subject: '🔑 Redefinição de senha — MOVING',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f0f0f;color:#f5f5f5;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#6c3de6,#a855f7);padding:32px;text-align:center;">
            <h1 style="margin:0;font-size:28px;color:#fff;">MOVING</h1>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#a855f7;">Redefinição de senha</h2>
            <p style="color:#ccc;">Olá, <strong style="color:#fff;">${params.name}</strong>! Recebemos uma solicitação para redefinir sua senha.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${params.resetLink}"
                 style="background:#6c3de6;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Redefinir Senha →
              </a>
            </div>
            <p style="color:#666;font-size:13px;">Este link expira em 1 hora. Se você não solicitou a redefinir, ignore este e-mail.</p>
          </div>
          <div style="border-top:1px solid #222;padding:16px 32px;text-align:center;color:#666;font-size:12px;">
            MOVING · O Hub da sua produção
          </div>
        </div>
      `,
    });
  }
}
