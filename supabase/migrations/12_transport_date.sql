-- Agrega columna date al transporte para programar por día de rodaje
ALTER TABLE public.transport
  ADD COLUMN IF NOT EXISTS date date;
