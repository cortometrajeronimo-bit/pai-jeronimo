-- =====================================================
-- P.A.I. JERÓNIMO — Migración FASE 5 (Actualización)
-- Agregar columnas hora llegada, dinero asignado y enlace a flujo de caja
-- =====================================================

ALTER TABLE public.transport
  ADD COLUMN IF NOT EXISTS arrival_time text,
  ADD COLUMN IF NOT EXISTS allocated_money numeric(14,2) default 0.00,
  ADD COLUMN IF NOT EXISTS cash_flow_id uuid references public.cash_flow(id) on delete set null;
