-- Migration: V28_ADD_DELIVERY_CONTACT_TO_BOOKINGS
-- Adiciona coluna delivery_contact para armazenar o nome do responsável
-- pelo recebimento do equipamento no endereço de entrega.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS delivery_contact TEXT;

COMMENT ON COLUMN public.bookings.delivery_contact IS
  'Nome e telefone do responsável pelo recebimento do equipamento';
