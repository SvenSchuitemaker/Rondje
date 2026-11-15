-- Alleen nodig als je schema.sql al had uitgevoerd vóór deze wijziging.
-- Voegt pauzes per activiteit en segmenten per GPS-punt toe.

alter table public.activities
  add column if not exists pauses jsonb not null default '[]'::jsonb;

alter table public.activity_points
  add column if not exists segment smallint not null default 0;
