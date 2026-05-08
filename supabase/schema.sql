-- =====================================================
-- P.A.I. JERÓNIMO — Schema
-- Correr en Supabase SQL Editor
-- =====================================================

-- Extensiones
create extension if not exists "uuid-ossp";

-- ===== Tablas =====

create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text,
  budget_total numeric,
  start_date date,
  end_date date,
  status text default 'pre-produccion',
  location text,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.crew_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  role text not null,
  email text,
  phone text,
  id_number text,
  blood_type text,
  emergency_contact_name text,
  emergency_contact_phone text,
  eps text,
  dietary_restrictions text,
  notes text,
  daily_rate numeric,
  is_active boolean default true
);

create table if not exists public.contacts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  company text,
  type text,
  email text,
  phone text,
  address text,
  notes text,
  is_favorite boolean default false
);

create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  concept text not null,
  category text not null,
  amount numeric not null,
  date date,
  status text default 'planeado',
  receipt_url text,
  created_at timestamptz default now()
);

create table if not exists public.call_sheets (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  date date not null,
  location text,
  call_time time,
  crew_ids uuid[] default '{}',
  notes text,
  safety_notes text,
  weather_backup text,
  status text default 'borrador',
  created_at timestamptz default now()
);

create table if not exists public.equipment (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  category text not null,
  units int default 1,
  provider text,
  status text default 'solicitado',
  notes text
);

create table if not exists public.memories (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_message text not null,
  ai_response text,
  context_used jsonb,
  sources jsonb,
  created_at timestamptz default now()
);

-- ===== Índices =====
create index if not exists idx_crew_project on public.crew_members(project_id);
create index if not exists idx_contacts_project on public.contacts(project_id);
create index if not exists idx_expenses_project_date on public.expenses(project_id, date);
create index if not exists idx_call_sheets_project_date on public.call_sheets(project_id, date);
create index if not exists idx_equipment_project on public.equipment(project_id);
create index if not exists idx_memories_project on public.memories(project_id);
create index if not exists idx_conversations_project on public.conversations(project_id, created_at desc);

-- ===== RLS =====
alter table public.projects enable row level security;
alter table public.crew_members enable row level security;
alter table public.contacts enable row level security;
alter table public.expenses enable row level security;
alter table public.call_sheets enable row level security;
alter table public.equipment enable row level security;
alter table public.memories enable row level security;
alter table public.conversations enable row level security;

-- Policy helper: usuario solo ve sus proyectos
drop policy if exists "owner_all_projects" on public.projects;
create policy "owner_all_projects" on public.projects
  for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

-- Policies de tablas hijas: chequean ownership via JOIN al project
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'crew_members','contacts','expenses','call_sheets','equipment','memories','conversations'
  ]) loop
    execute format('drop policy if exists "owner_all_%s" on public.%s', t, t);
    execute format($f$
      create policy "owner_all_%s" on public.%s
        for all using (
          exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
        ) with check (
          exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
        )
    $f$, t, t);
  end loop;
end $$;
