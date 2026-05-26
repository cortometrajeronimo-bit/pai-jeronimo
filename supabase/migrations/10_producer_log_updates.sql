-- 10_producer_log_updates.sql
-- Convierte cada entrada de bitácora en un "hilo": una situación
-- (urgencia, gestión con proveedor, etc.) puede recibir notas de
-- seguimiento con timestamp automático mientras no se cierre.

-- 1. Tabla de actualizaciones (notas de seguimiento)
create table if not exists public.producer_log_updates (
  id uuid primary key default uuid_generate_v4(),
  log_id uuid not null references public.producer_logs(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_log_updates_log_created
  on public.producer_log_updates(log_id, created_at);

alter table public.producer_log_updates enable row level security;

drop policy if exists log_updates_select on public.producer_log_updates;
drop policy if exists log_updates_write on public.producer_log_updates;

-- Select: cualquier usuario autenticado (mismo patrón que producer_logs)
create policy log_updates_select on public.producer_log_updates
  for select using (auth.uid() is not null);

-- Write: dueño del proyecto al que pertenece el log
create policy log_updates_write on public.producer_log_updates
  for all using (
    exists (
      select 1
        from public.producer_logs pl
        join public.projects p on p.id = pl.project_id
       where pl.id = log_id
         and p.created_by = auth.uid()
    )
  ) with check (
    exists (
      select 1
        from public.producer_logs pl
        join public.projects p on p.id = pl.project_id
       where pl.id = log_id
         and p.created_by = auth.uid()
    )
  );

-- 2. Marca de completitud sobre la entrada original.
--    Una entrada "completada" se atenúa en UI y no dispara notificaciones.
alter table public.producer_logs
  add column if not exists completed_at timestamptz;

-- 3. Marca de último envío de notificación (evita spammear el mismo día).
alter table public.producer_logs
  add column if not exists last_notified_at timestamptz;

create index if not exists idx_producer_logs_pendientes
  on public.producer_logs(category, completed_at)
  where category = 'urgente' and completed_at is null;
