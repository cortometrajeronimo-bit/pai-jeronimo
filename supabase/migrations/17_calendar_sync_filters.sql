ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS sync_transports boolean not null default true,
ADD COLUMN IF NOT EXISTS sync_call_sheets boolean not null default true;
