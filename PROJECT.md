# CineHub (hublocadora)

## Project Overview
CineHub is a premium, multi-tenant marketplace and management platform for cinema and audiovisual equipment rental. It allows rental houses (tenants) to manage their inventory, bookings, and logistics while providing a centralized marketplace for users to find and rent equipment.

## Core Goals
- **Marketplace**: A seamless discovery experience for filmmakers.
- **Rental Management**: Comprehensive backend for rental houses (Dashboard).
- **Multi-tenancy**: Strict data isolation using Supabase Row Level Security (RLS).
- **Premium UX**: Dynamic animations (Motion), dark mode first, and glassmorphism design.

## Tech Stack
- **Frontend**: React (v19), Vite, Tailwind CSS 4
- **State Management**: React Query, Zustand
- **Backend & Auth**: Supabase
- **Icons**: Lucide React
- **Animations**: Motion
- **Database**: PostgreSQL (Supabase) with strict RLS policies

## Architecture Patterns
- **Atomic Components**: UI components built with Radix-like patterns (shadcn style).
- **Nuclear Security**: RLS policies enforced at the database level for all tenant interactions.
- **Context-driven Auth/Tenant**: Centralized providers for authentication and tenant context.
