-- =====================================================
-- P.A.I. JERÓNIMO — Migración FASE 5 (Google Calendar)
-- Agregar columnas para ID y enlace de Google Calendar en la tabla proyectos
-- =====================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS google_calendar_id text,
  ADD COLUMN IF NOT EXISTS google_calendar_link text;
