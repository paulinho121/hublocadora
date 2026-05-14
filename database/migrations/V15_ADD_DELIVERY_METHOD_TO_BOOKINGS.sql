-- =============================================================================
-- V15: Add delivery_method and delivery_address to bookings
-- Run this in the Supabase SQL Editor
-- =============================================================================

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS delivery_method text CHECK (delivery_method IN ('pickup', 'delivery')) DEFAULT 'pickup',
    ADD COLUMN IF NOT EXISTS delivery_address text;
