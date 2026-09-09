-- ProspectFlow initial schema
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.icps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  niche text,
  subniche text,
  country text default 'Brasil',
  state text,
  city text,
  regions text,
  revenue_min numeric,
  revenue_max numeric,
  employees_min int,
  employees_max int,
  keywords text[] not null default '{}',
  requires_website boolean not null default false,
  requires_instagram boolean not null default false,
  other_criteria text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.icp_criteria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null,
  label text not null,
  weight int not null default 10,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  color text not null default 'brand',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  color text not null default 'brand',
  created_at timestamptz not null default now()
);

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  company text not null,
  niche text,
  city text,
  state text,
  country text default 'Brasil',
  website text,
  instagram text,
  phone text,
  whatsapp text,
  email text,
  contact_name text,
  contact_role text,
  employees int,
  revenue numeric,
  icp_id uuid references public.icps on delete set null,
  icp_score int not null default 0,
  status text not null default 'novo' check (status in ('novo','contatar','contatado','respondeu','qualificado','reuniao','proposta','negociacao','ganho','perdido')),
  stage_id uuid references public.pipeline_stages on delete set null,
  potential text,
  notes text,
  source text not null default 'mock',
  last_contact_at timestamptz,
  next_action text,
  next_action_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prospects_user_idx on public.prospects (user_id);
create index prospects_stage_idx on public.prospects (stage_id);

create table public.prospect_tags (
  prospect_id uuid not null references public.prospects on delete cascade,
  tag_id uuid not null references public.tags on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  primary key (prospect_id, tag_id)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  prospect_id uuid not null references public.prospects on delete cascade,
  type text not null,
  description text,
  created_at timestamptz not null default now()
);
create index activities_prospect_idx on public.activities (prospect_id);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  status text not null default 'ativa' check (status in ('ativa','pausada','finalizada')),
  stop_on_reply boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sequence_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  sequence_id uuid not null references public.sequences on delete cascade,
  position int not null default 0,
  delay_days int not null default 0,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  prospect_id uuid not null references public.prospects on delete cascade,
  sequence_id uuid references public.sequences on delete cascade,
  step_id uuid references public.sequence_steps on delete cascade,
  scheduled_at timestamptz not null default now(),
  status text not null default 'agendada' check (status in ('agendada','enviada','cancelada')),
  body text,
  created_at timestamptz not null default now()
);

create table public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  prospect_id uuid not null references public.prospects on delete cascade,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  unread_count int not null default 0,
  created_at timestamptz not null default now()
);

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  conversation_id uuid not null references public.whatsapp_conversations on delete cascade,
  direction text not null check (direction in ('out','in')),
  body text not null,
  status text not null default 'enviada',
  created_at timestamptz not null default now()
);
create index whatsapp_messages_conv_idx on public.whatsapp_messages (conversation_id);

create table public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  field_type text not null default 'text' check (field_type in ('text','number','date','select')),
  options text[] not null default '{}',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.custom_field_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  field_id uuid not null references public.custom_fields on delete cascade,
  prospect_id uuid not null references public.prospects on delete cascade,
  value text,
  created_at timestamptz not null default now(),
  unique (field_id, prospect_id)
);

-- Grants + RLS
do $$
declare t text;
begin
  foreach t in array array['profiles','icps','icp_criteria','pipeline_stages','tags','prospects','prospect_tags','activities','message_templates','sequences','sequence_steps','scheduled_messages','whatsapp_conversations','whatsapp_messages','custom_fields','custom_field_values']
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "own profile" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['icps','icp_criteria','pipeline_stages','tags','prospects','prospect_tags','activities','message_templates','sequences','sequence_steps','scheduled_messages','whatsapp_conversations','whatsapp_messages','custom_fields','custom_field_values']
  loop
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create trigger t_profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger t_icps_touch before update on public.icps for each row execute function public.touch_updated_at();
create trigger t_prospects_touch before update on public.prospects for each row execute function public.touch_updated_at();
create trigger t_templates_touch before update on public.message_templates for each row execute function public.touch_updated_at();
create trigger t_sequences_touch before update on public.sequences for each row execute function public.touch_updated_at();