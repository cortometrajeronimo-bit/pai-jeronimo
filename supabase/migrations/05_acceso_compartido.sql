-- ============================================================
-- Migración 05 — Acceso compartido (leer sin ser dueño)
-- ============================================================
-- Problema anterior: políticas FOR ALL solo dejaban ver datos
-- al usuario que creó el proyecto. Cualquier otro usuario
-- veía el dashboard vacío.
--
-- Solución: separar READ (cualquier usuario autenticado) de
-- WRITE (solo el dueño del proyecto).
--
-- Resultado:
--   - Cualquier persona que se registre puede ver los datos de JERÓNIMO.
--   - Solo cortometrajeronimo@gmail.com puede crear/editar/borrar.
-- ============================================================

-- ===== PROJECTS =====
drop policy if exists "owner_all_projects" on public.projects;
drop policy if exists projects_select      on public.projects;
drop policy if exists projects_write       on public.projects;

create policy projects_select on public.projects
  for select using (auth.uid() is not null);

create policy projects_write on public.projects
  for all using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- ===== TABLAS HIJAS (fase 1) =====
-- crew_members
drop policy if exists "owner_all_crew_members" on public.crew_members;
drop policy if exists crew_select on public.crew_members;
drop policy if exists crew_write  on public.crew_members;

create policy crew_select on public.crew_members
  for select using (auth.uid() is not null);

create policy crew_write on public.crew_members
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- contacts
drop policy if exists "owner_all_contacts" on public.contacts;
drop policy if exists contacts_select on public.contacts;
drop policy if exists contacts_write  on public.contacts;

create policy contacts_select on public.contacts
  for select using (auth.uid() is not null);

create policy contacts_write on public.contacts
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- expenses
drop policy if exists "owner_all_expenses" on public.expenses;
drop policy if exists expenses_select on public.expenses;
drop policy if exists expenses_write  on public.expenses;

create policy expenses_select on public.expenses
  for select using (auth.uid() is not null);

create policy expenses_write on public.expenses
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- call_sheets
drop policy if exists "owner_all_call_sheets" on public.call_sheets;
drop policy if exists call_sheets_select on public.call_sheets;
drop policy if exists call_sheets_write  on public.call_sheets;

create policy call_sheets_select on public.call_sheets
  for select using (auth.uid() is not null);

create policy call_sheets_write on public.call_sheets
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- equipment
drop policy if exists "owner_all_equipment" on public.equipment;
drop policy if exists equipment_select on public.equipment;
drop policy if exists equipment_write  on public.equipment;

create policy equipment_select on public.equipment
  for select using (auth.uid() is not null);

create policy equipment_write on public.equipment
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- memories
drop policy if exists "owner_all_memories" on public.memories;
drop policy if exists memories_select on public.memories;
drop policy if exists memories_write  on public.memories;

create policy memories_select on public.memories
  for select using (auth.uid() is not null);

create policy memories_write on public.memories
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- conversations
drop policy if exists "owner_all_conversations" on public.conversations;
drop policy if exists conversations_select on public.conversations;
drop policy if exists conversations_write  on public.conversations;

create policy conversations_select on public.conversations
  for select using (auth.uid() is not null);

create policy conversations_write on public.conversations
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- ===== TABLAS FASE 2 — contacts con tags =====
-- (ya cubierta arriba)

-- ===== TABLAS FASE 3 =====
-- cash_flow
drop policy if exists cash_flow_owner  on public.cash_flow;
drop policy if exists cash_flow_select on public.cash_flow;
drop policy if exists cash_flow_write  on public.cash_flow;

create policy cash_flow_select on public.cash_flow
  for select using (auth.uid() is not null);

create policy cash_flow_write on public.cash_flow
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- drive_files
drop policy if exists drive_files_owner  on public.drive_files;
drop policy if exists drive_files_select on public.drive_files;
drop policy if exists drive_files_write  on public.drive_files;

create policy drive_files_select on public.drive_files
  for select using (auth.uid() is not null);

create policy drive_files_write on public.drive_files
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- ===== TABLAS FASE 4+5 =====
-- daily_reports
drop policy if exists daily_reports_owner  on public.daily_reports;
drop policy if exists daily_reports_select on public.daily_reports;
drop policy if exists daily_reports_write  on public.daily_reports;

create policy daily_reports_select on public.daily_reports
  for select using (auth.uid() is not null);

create policy daily_reports_write on public.daily_reports
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- producer_logs
drop policy if exists producer_logs_owner  on public.producer_logs;
drop policy if exists producer_logs_select on public.producer_logs;
drop policy if exists producer_logs_write  on public.producer_logs;

create policy producer_logs_select on public.producer_logs
  for select using (auth.uid() is not null);

create policy producer_logs_write on public.producer_logs
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- contracts
drop policy if exists contracts_owner  on public.contracts;
drop policy if exists contracts_select on public.contracts;
drop policy if exists contracts_write  on public.contracts;

create policy contracts_select on public.contracts
  for select using (auth.uid() is not null);

create policy contracts_write on public.contracts
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- crew_payments
drop policy if exists crew_payments_owner  on public.crew_payments;
drop policy if exists crew_payments_select on public.crew_payments;
drop policy if exists crew_payments_write  on public.crew_payments;

create policy crew_payments_select on public.crew_payments
  for select using (auth.uid() is not null);

create policy crew_payments_write on public.crew_payments
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- transport
drop policy if exists transport_owner  on public.transport;
drop policy if exists transport_select on public.transport;
drop policy if exists transport_write  on public.transport;

create policy transport_select on public.transport
  for select using (auth.uid() is not null);

create policy transport_write on public.transport
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- catering
drop policy if exists catering_owner  on public.catering;
drop policy if exists catering_select on public.catering;
drop policy if exists catering_write  on public.catering;

create policy catering_select on public.catering
  for select using (auth.uid() is not null);

create policy catering_write on public.catering
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- attendance
drop policy if exists attendance_owner  on public.attendance;
drop policy if exists attendance_select on public.attendance;
drop policy if exists attendance_write  on public.attendance;

create policy attendance_select on public.attendance
  for select using (auth.uid() is not null);

create policy attendance_write on public.attendance
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- incidents
drop policy if exists incidents_owner  on public.incidents;
drop policy if exists incidents_select on public.incidents;
drop policy if exists incidents_write  on public.incidents;

create policy incidents_select on public.incidents
  for select using (auth.uid() is not null);

create policy incidents_write on public.incidents
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.created_by = auth.uid())
  );
