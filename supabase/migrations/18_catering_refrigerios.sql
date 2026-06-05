-- Añadir refrigerios al tipo de comida en catering

DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.catering'::regclass
      AND contype = 'c'
      AND pg_get_expr(conbin, conrelid) ILIKE '%meal_type%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.catering DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE public.catering ADD CONSTRAINT catering_meal_type_check 
  CHECK (meal_type in ('desayuno','almuerzo','cena','refrigerio_1','refrigerio_2'));
