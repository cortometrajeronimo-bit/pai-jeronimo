-- =====================================================
-- P.A.I. JERÓNIMO — Migración FASE 2
-- Correr en Supabase SQL Editor sobre el schema base
-- =====================================================

-- Contactos: agregar tags[] (TEXT array)
alter table public.contacts
  add column if not exists tags text[] default '{}';

-- Crew: agregar campo de confirmación explícito (default true para datos existentes)
alter table public.crew_members
  add column if not exists is_confirmed boolean default true;

-- Equipos: campo "brand" y "model" para inventario detallado (opcional)
alter table public.equipment
  add column if not exists brand text;

alter table public.equipment
  add column if not exists model text;

-- Call sheets: campos limpios para el generador (algunos ya existen, idempotente)
alter table public.call_sheets
  add column if not exists weather_plan_b text;

-- Índice para búsqueda por tags (GIN sobre array)
create index if not exists idx_contacts_tags on public.contacts using gin(tags);

-- Conversaciones: agregar role para chat (user / assistant)
alter table public.conversations
  add column if not exists role text;
