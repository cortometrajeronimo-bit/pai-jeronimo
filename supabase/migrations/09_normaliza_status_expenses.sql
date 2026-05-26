-- 09_normaliza_status_expenses.sql
-- Asegura que toda fila de expenses tenga status válido y no permite NULL.
-- Cura el bug "presupuesto al 100% ejecutado" en /proyecto y /presupuesto:
-- el cálculo ahora filtra por status='ejecutado' y NULL rompía el filtro.

-- 1. Re-clasifica filas heredadas sin status (o vacío) como 'planeado'.
--    Realidad actual: casi nada se ha gastado todavía.
update public.expenses
   set status = 'planeado'
 where status is null or status = '';

-- 2. Endurecer la columna para que no vuelva a quedar nulo.
alter table public.expenses alter column status set default 'planeado';
alter table public.expenses alter column status set not null;

-- 3. Constraint de valores permitidos (sincronizado con UI).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'expenses_status_check'
  ) then
    alter table public.expenses
      add constraint expenses_status_check
      check (status in ('planeado','comprometido','ejecutado','cancelado'));
  end if;
end$$;

-- 4. Índice para acelerar agregaciones por status (los KPI lo usan).
create index if not exists idx_expenses_project_status
  on public.expenses(project_id, status);
