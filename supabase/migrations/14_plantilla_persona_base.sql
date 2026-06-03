-- =====================================================
-- 14_plantilla_persona_base.sql
-- Permite que una plantilla DOCX subida sea un contrato ya hecho de UNA persona
-- (p.ej. el contrato firmado de Ana Rangel) y reutilizarla para otra persona:
-- al generar, los datos de la "persona base" se reemplazan por los de cada
-- crew seleccionado (nombre, cédula, email, teléfono, tarifa, EPS, RH).
-- =====================================================

alter table public.contract_templates
  add column if not exists base_crew_member_id uuid
    references public.crew_members(id) on delete set null;

create index if not exists idx_contract_templates_base_crew
  on public.contract_templates(base_crew_member_id)
  where base_crew_member_id is not null;
