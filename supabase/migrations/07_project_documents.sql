-- Documentos del proyecto que se muestran inline en /proyecto.
-- Categorías típicas: guion, guion técnico, cronograma, plan de rodaje.
-- drive_file_id apunta a un archivo ya importado en drive_files.

create table if not exists project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  category text not null check (
    category in ('guion', 'guion_tecnico', 'cronograma', 'plan_rodaje', 'otro')
  ),
  title text not null,
  drive_file_id text not null,
  pinned_in_proyecto boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_documents_project_idx
  on project_documents (project_id, pinned_in_proyecto, display_order);

alter table project_documents enable row level security;

drop policy if exists "project_documents_owner_all" on project_documents;
create policy "project_documents_owner_all" on project_documents
  for all
  using (
    project_id in (select id from projects where created_by = auth.uid())
  )
  with check (
    project_id in (select id from projects where created_by = auth.uid())
  );
