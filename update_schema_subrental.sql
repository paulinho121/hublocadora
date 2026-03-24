-- Adicionando campos para Suporte a Sub-locação / Request do HUB
ALTER TABLE public.bookings 
ADD COLUMN quantity integer DEFAULT 1,
ADD COLUMN delivery_method text CHECK (delivery_method IN ('pickup', 'delivery')) DEFAULT 'pickup',
ADD COLUMN delivery_address text;

-- Comentários para documentação
COMMENT ON COLUMN public.bookings.quantity IS 'Quantidade de itens solicitados';
COMMENT ON COLUMN public.bookings.delivery_method IS 'Método de entrega: retirada no HUB ou entrega no local';
COMMENT ON COLUMN public.bookings.delivery_address IS 'Endereço de entrega caso o método seja delivery';
