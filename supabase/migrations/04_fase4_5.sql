-- =====================================================
-- P.A.I. JERÓNIMO — Migración FASE 4 + 5 (FUSIONADA)
-- Control de Producción + Logística & Set
-- Correr en Supabase SQL Editor sobre el schema base + 02 + 03
-- =====================================================

-- =====================================================
-- T21 — Daily Reports
-- =====================================================
create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  date date not null,
  crew_present uuid[] default '{}',
  scenes_completed text,
  incidents text,
  expenses_total numeric(14,2) default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique(project_id, date)
);
create index if not exists idx_daily_reports_project_date
  on public.daily_reports(project_id, date desc);

alter table public.daily_reports enable row level security;
drop policy if exists daily_reports_owner on public.daily_reports;
create policy daily_reports_owner on public.daily_reports for all
  using (exists(select 1 from public.projects p where p.id = daily_reports.project_id and p.created_by = auth.uid()))
  with check (exists(select 1 from public.projects p where p.id = daily_reports.project_id and p.created_by = auth.uid()));

-- =====================================================
-- T22 — Producer Logs (Bitácora del Productor)
-- =====================================================
create table if not exists public.producer_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  date date not null default current_date,
  category text not null check (category in ('general','urgente','proveedor','elenco','UAO')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_producer_logs_project_date
  on public.producer_logs(project_id, date desc);
create index if not exists idx_producer_logs_search
  on public.producer_logs using gin(to_tsvector('spanish', content));

alter table public.producer_logs enable row level security;
drop policy if exists producer_logs_owner on public.producer_logs;
create policy producer_logs_owner on public.producer_logs for all
  using (exists(select 1 from public.projects p where p.id = producer_logs.project_id and p.created_by = auth.uid()))
  with check (exists(select 1 from public.projects p where p.id = producer_logs.project_id and p.created_by = auth.uid()));

-- =====================================================
-- T23 — Contracts & Permits
-- =====================================================
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  type text not null check (type in ('locacion','talento','equipo','seguro','otro')),
  sign_date date,
  expiry_date date,
  status text not null default 'por_firmar' check (status in ('vigente','por_firmar','vencido')),
  file_url text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_contracts_project_expiry
  on public.contracts(project_id, expiry_date);

alter table public.contracts enable row level security;
drop policy if exists contracts_owner on public.contracts;
create policy contracts_owner on public.contracts for all
  using (exists(select 1 from public.projects p where p.id = contracts.project_id and p.created_by = auth.uid()))
  with check (exists(select 1 from public.projects p where p.id = contracts.project_id and p.created_by = auth.uid()));

-- =====================================================
-- T24 — Crew Payments
-- =====================================================
create table if not exists public.crew_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  crew_member_id uuid not null references public.crew_members(id) on delete cascade,
  amount numeric(14,2) not null,
  agreed_date date,
  paid_date date,
  status text not null default 'pendiente' check (status in ('pendiente','pagado','atrasado')),
  method text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_crew_payments_project
  on public.crew_payments(project_id, status);

alter table public.crew_payments enable row level security;
drop policy if exists crew_payments_owner on public.crew_payments;
create policy crew_payments_owner on public.crew_payments for all
  using (exists(select 1 from public.projects p where p.id = crew_payments.project_id and p.created_by = auth.uid()))
  with check (exists(select 1 from public.projects p where p.id = crew_payments.project_id and p.created_by = auth.uid()));

-- =====================================================
-- T25 — Transport
-- =====================================================
create table if not exists public.transport (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  vehicle_name text not null,
  driver text,
  capacity int default 0,
  departure_time text,
  route text,
  crew_assigned uuid[] default '{}',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_transport_project on public.transport(project_id);

alter table public.transport enable row level security;
drop policy if exists transport_owner on public.transport;
create policy transport_owner on public.transport for all
  using (exists(select 1 from public.projects p where p.id = transport.project_id and p.created_by = auth.uid()))
  with check (exists(select 1 from public.projects p where p.id = transport.project_id and p.created_by = auth.uid()));

-- =====================================================
-- T26 — Catering
-- =====================================================
create table if not exists public.catering (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('desayuno','almuerzo','cena')),
  menu text,
  provider text,
  portions_count int default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_catering_project_date
  on public.catering(project_id, date desc);

alter table public.catering enable row level security;
drop policy if exists catering_owner on public.catering;
create policy catering_owner on public.catering for all
  using (exists(select 1 from public.projects p where p.id = catering.project_id and p.created_by = auth.uid()))
  with check (exists(select 1 from public.projects p where p.id = catering.project_id and p.created_by = auth.uid()));

-- =====================================================
-- T27 — Attendance (Check-in Crew)
-- =====================================================
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  crew_member_id uuid not null references public.crew_members(id) on delete cascade,
  date date not null default current_date,
  check_in_time timestamptz,
  check_out_time timestamptz,
  status text not null default 'presente' check (status in ('presente','ausente','retardo')),
  notes text,
  created_at timestamptz not null default now(),
  unique(project_id, crew_member_id, date)
);
create index if not exists idx_attendance_project_date
  on public.attendance(project_id, date desc);

alter table public.attendance enable row level security;
drop policy if exists attendance_owner on public.attendance;
create policy attendance_owner on public.attendance for all
  using (exists(select 1 from public.projects p where p.id = attendance.project_id and p.created_by = auth.uid()))
  with check (exists(select 1 from public.projects p where p.id = attendance.project_id and p.created_by = auth.uid()));

-- =====================================================
-- T28 — Incidents (Botiquín / Reportes)
-- =====================================================
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  date date not null default current_date,
  type text not null default 'menor' check (type in ('menor','medio','grave')),
  description text not null,
  affected_person text,
  action_taken text,
  reporter text,
  created_at timestamptz not null default now()
);
create index if not exists idx_incidents_project_date
  on public.incidents(project_id, date desc);

alter table public.incidents enable row level security;
drop policy if exists incidents_owner on public.incidents;
create policy incidents_owner on public.incidents for all
  using (exists(select 1 from public.projects p where p.id = incidents.project_id and p.created_by = auth.uid()))
  with check (exists(select 1 from public.projects p where p.id = incidents.project_id and p.created_by = auth.uid()));
