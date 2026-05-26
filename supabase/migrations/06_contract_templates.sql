-- Plantillas de contratos para generación automática por crew member
-- Variables soportadas: {{nombre}}, {{rol}}, {{cedula}}, {{email}}, {{telefono}},
--   {{tarifa_diaria}}, {{fecha_inicio}}, {{fecha_fin}}, {{fecha_hoy}}, {{proyecto}}

create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  type text not null default 'talento'
    check (type in ('locacion', 'talento', 'equipo', 'seguro', 'otro')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_contract_templates_project
  on public.contract_templates(project_id, created_at desc);

-- RLS: mismo patrón que el resto de tablas
alter table public.contract_templates enable row level security;

create policy "templates_select" on public.contract_templates
  for select using (auth.uid() is not null);

create policy "templates_write" on public.contract_templates
  for all using (
    auth.uid() = (
      select created_by from public.projects
      where id = project_id
    )
  );
