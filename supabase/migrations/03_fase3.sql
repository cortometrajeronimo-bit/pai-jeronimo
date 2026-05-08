-- =====================================================
-- P.A.I. JERÓNIMO — Migración FASE 3
-- Cash Flow + Google Drive
-- Correr en Supabase SQL Editor sobre el schema base
-- =====================================================

-- =====================================================
-- T17 — Cash Flow
-- Movimientos de caja (entradas/salidas) reales o proyectados
-- =====================================================
create table if not exists public.cash_flow (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  date date not null,
  concept text not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null,
  category text,
  is_projected boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_cash_flow_project_date
  on public.cash_flow(project_id, date desc);

create index if not exists idx_cash_flow_projected
  on public.cash_flow(project_id, is_projected);

alter table public.cash_flow enable row level security;

-- Política RLS: usuarios solo ven el flujo de proyectos que crearon
drop policy if exists cash_flow_owner on public.cash_flow;
create policy cash_flow_owner on public.cash_flow
  for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = cash_flow.project_id and p.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = cash_flow.project_id and p.created_by = auth.uid()
    )
  );

-- =====================================================
-- T18 — Google Drive
-- Cache de archivos sincronizados con su contenido extraído
-- =====================================================
create table if not exists public.drive_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  drive_file_id text not null,
  name text not null,
  mime_type text,
  web_view_link text,
  last_synced_at timestamptz not null default now(),
  content_text text,
  created_at timestamptz not null default now(),
  unique (project_id, drive_file_id)
);

create index if not exists idx_drive_files_project
  on public.drive_files(project_id, last_synced_at desc);

-- Búsqueda básica por contenido (para el RAG simple del chat)
create index if not exists idx_drive_files_content_search
  on public.drive_files using gin(to_tsvector('spanish', coalesce(content_text, '')));

alter table public.drive_files enable row level security;

drop policy if exists drive_files_owner on public.drive_files;
create policy drive_files_owner on public.drive_files
  for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = drive_files.project_id and p.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = drive_files.project_id and p.created_by = auth.uid()
    )
  );

-- =====================================================
-- Seed: ingreso inicial seed (presupuesto otorgado)
-- Solo si no existe nada todavía
-- =====================================================
insert into public.cash_flow (project_id, date, concept, type, amount, category, is_projected, notes)
select p.id, '2026-04-01', 'Aporte UAO — beca producción', 'income', 9540500, 'financiacion', false,
       'Desembolso inicial del presupuesto del corto'
from public.projects p
where p.name = 'JERÓNIMO'
  and not exists (select 1 from public.cash_flow cf where cf.project_id = p.id);
