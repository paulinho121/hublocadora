-- 1. Habilita a extensão pg_net (necessária para fazer requisições HTTP do Supabase)
create extension if not exists pg_net;

-- 2. Criação da função genérica para enviar e-mails pelo Resend
-- Pode ser chamada por qualquer Trigger ou diretamente via banco de dados
create or replace function public.send_resend_email(
    p_to text,
    p_subject text,
    p_html text
) returns void
language plpgsql
security definer -- Garante que a função tem permissões de administrador
as $$
declare
    -- ⚠️ Sua chave do Resend aqui (Cole a sua chave abaixo)
    resend_api_key text := 're_9vaQXx6K_5ysJ7FnHW7UvbLjxBvp4hhC8'; 
    request_id bigint;
begin
    -- Faz o disparo da requisição HTTP POST direto para a API do Resend
    select net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || resend_api_key
        ),
        body := jsonb_build_object(
            'from', 'CineHub <onboarding@resend.dev>', -- 🛠️ Quando tiver domínio próprio, mude aqui (ex: 'CineHub <contato@cinehub.app>')
            'to', jsonb_build_array(p_to),
            'subject', p_subject,
            'html', p_html
        )
    ) into request_id;

end;
$$;


-- ==========================================
-- 🛠️ EXEMPLOS DE TRIGGERS
-- ==========================================

-- Exemplo 1: Enviar um e-mail de Boas-Vindas quando um novo usuário for criado
create or replace function public.trigger_send_welcome_email()
returns trigger
language plpgsql
security definer
as $$
begin
    -- Chama a nossa função local enviando os dados via pg_net
    perform public.send_resend_email(
        new.email, -- Pega o e-mail do próprio novo usuário listado na auth.users
        'Bem-vindo ao CineHub! 🎬',
        '<h1>Olá!</h1><p>Sua conta foi criada sucesso no CineHub. Bem-vindo à nossa plataforma.</p>'
    );
    return new;
end;
$$;

-- Ativar o Trigger de Boas-Vindas usando a tabela nativa de usuários do Supabase
create or replace trigger on_auth_user_created
after insert on auth.users 
for each row execute function public.trigger_send_welcome_email();


-- Exemplo 2: Enviar e-mail de Confirmação quando uma RESERVA for gerada (Tabela bookings)
create or replace function public.trigger_send_booking_confirmation()
returns trigger
language plpgsql
security definer
as $$
declare
    user_email text;
begin
    -- Resgata o e-mail do dono da reserva usando o renter_id que está na bookings (CORRIGIDO: era user_id)
    select email into user_email from auth.users where id = new.renter_id;

    if user_email is not null then
        perform public.send_resend_email(
            user_email,
            'Reserva Confirmada — CineHub',
            '<h1>Reserva Realizada</h1><p>Sua reserva foi processada! Vá até a tela "Minhas Locações" e veja mais detalhes sobre esta reserva que tem a ID: ' || new.id || '</p>'
        );
    end if;

    return new;
end;
$$;

-- Supomos que no seu banco existe uma tabela de reservas chamada 'bookings'
create or replace trigger on_booking_created
after insert on public.bookings
for each row execute function public.trigger_send_booking_confirmation();

-- ==========================================
-- 3. SEGURANÇA: POLÍTICAS DE NOTIFICAÇÕES
-- ==========================================
-- Garante que o usuário só veja suas próprias notificações

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications" 
on public.notifications for select 
using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" 
on public.notifications for update 
using (auth.uid() = user_id);
