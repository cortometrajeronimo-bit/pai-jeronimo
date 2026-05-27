-- =====================================================
-- 13_contratos_upload.sql
-- Permite subir plantillas .docx propias (con placeholders {{nombre}}, {{cedula}}, …)
-- y contratos ya terminados/firmados en cualquier formato.
-- Extiende `contract_templates` y `contracts` con metadatos de origen/storage.
-- =====================================================

-- Plantillas DOCX (además de las tipo texto que ya existen)
alter table public.contract_templates
  add column if not exists source_type text not null default 'text'
    check (source_type in ('text','docx')),
  add column if not exists storage_path text;

-- Contratos: distinguir origen, estado de firma y campos faltantes detectados
alter table public.contracts
  add column if not exists origin text not null default 'auto'
    check (origin in ('auto','template_docx','uploaded')),
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists signed_at timestamptz,
  add column if not exists missing_fields text[] not null default '{}',
  add column if not exists crew_member_id uuid references public.crew_members(id) on delete set null;

create index if not exists idx_contracts_crew_member
  on public.contracts(crew_member_id);

-- Buckets de Storage (privados — RLS controla acceso)
insert into storage.buckets (id, name, public) values
  ('contract-templates','contract-templates', false),
  ('contracts','contracts', false)
on conflict (id) do nothing;

-- Policies de Storage: solo usuarios autenticados pueden leer/escribir
-- (el modelo de proyecto único justifica esta simplificación; refinable después)
drop policy if exists "contract_templates_read" on storage.objects;
create policy "contract_templates_read" on storage.objects
  for select using (bucket_id = 'contract-templates' and auth.uid() is not null);

drop policy if exists "contract_templates_write" on storage.objects;
create policy "contract_templates_write" on storage.objects
  for insert with check (bucket_id = 'contract-templates' and auth.uid() is not null);

drop policy if exists "contract_templates_delete" on storage.objects;
create policy "contract_templates_delete" on storage.objects
  for delete using (bucket_id = 'contract-templates' and auth.uid() is not null);

drop policy if exists "contracts_read" on storage.objects;
create policy "contracts_read" on storage.objects
  for select using (bucket_id = 'contracts' and auth.uid() is not null);

drop policy if exists "contracts_write" on storage.objects;
create policy "contracts_write" on storage.objects
  for insert with check (bucket_id = 'contracts' and auth.uid() is not null);

drop policy if exists "contracts_delete" on storage.objects;
create policy "contracts_delete" on storage.objects
  for delete using (bucket_id = 'contracts' and auth.uid() is not null);
