-- Extensoes
create extension if not exists pgcrypto;

-- Tabela de perfis (1:1 com auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text unique,
  role text not null default 'atendente',
  status text not null default 'ativo',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Compatibilidade com bases antigas (tabela já existente sem colunas novas)
alter table public.profiles
  add column if not exists status text not null default 'ativo';

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_profiles_role'
  ) then
    alter table public.profiles
      add constraint chk_profiles_role check (role in ('admin', 'atendente'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_profiles_status'
  ) then
    alter table public.profiles
      add constraint chk_profiles_status check (status in ('ativo', 'inativo'));
  end if;
end $$;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text not null unique,
  cnh text not null unique,
  telefone text,
  created_at timestamptz not null default now()
);

create table if not exists public.carros (
  id uuid primary key default gen_random_uuid(),
  marca text not null,
  modelo text not null,
  placa text not null unique,
  ano integer not null,
  cor text,
  km_atual numeric not null default 0 check (km_atual >= 0),
  valor_diaria numeric not null check (valor_diaria > 0),
  status text not null default 'disponivel' check (status in ('disponivel', 'alugado', 'manutencao')),
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists public.locacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id),
  carro_id uuid not null references public.carros(id),
  usuario_id uuid references public.profiles(id),
  data_retirada timestamptz not null,
  data_prevista_devolucao timestamptz not null,
  data_devolucao_real timestamptz,
  quantidade_diarias integer not null check (quantidade_diarias > 0),
  valor_diaria numeric not null check (valor_diaria > 0),
  valor_total numeric not null check (valor_total >= 0),
  km_saida numeric not null check (km_saida >= 0),
  km_entrada numeric,
  km_rodado numeric,
  status text not null default 'aberta' check (status in ('aberta', 'finalizada', 'cancelada')),
  observacoes_devolucao text,
  contrato_html text,
  created_at timestamptz not null default now(),
  constraint chk_locacao_datas check (data_prevista_devolucao >= data_retirada),
  constraint chk_locacao_km_devolucao check (km_entrada is null or km_entrada >= km_saida),
  constraint chk_locacao_finalizada_campos check (
    (status <> 'finalizada')
    or (status = 'finalizada' and data_devolucao_real is not null and km_entrada is not null)
  )
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null unique default 'main',
  general_settings jsonb not null default '{}'::jsonb,
  company_settings jsonb not null default '{}'::jsonb,
  contract_settings jsonb not null default '{}'::jsonb,
  rental_settings jsonb not null default '{}'::jsonb,
  security_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Indices para busca e filtros
create index if not exists idx_clientes_nome on public.clientes using gin (to_tsvector('portuguese', nome));
create index if not exists idx_clientes_cpf on public.clientes (cpf);
create index if not exists idx_clientes_cnh on public.clientes (cnh);
create index if not exists idx_carros_placa on public.carros (placa);
create index if not exists idx_carros_status on public.carros (status);
create index if not exists idx_carros_marca_modelo on public.carros (marca, modelo);
create index if not exists idx_locacoes_status on public.locacoes (status);
create index if not exists idx_locacoes_cliente on public.locacoes (cliente_id);
create index if not exists idx_locacoes_carro on public.locacoes (carro_id);
create index if not exists idx_locacoes_created_at on public.locacoes (created_at desc);
create unique index if not exists uq_locacao_aberta_por_carro on public.locacoes (carro_id) where status = 'aberta';
create unique index if not exists uq_app_settings_singleton on public.app_settings (singleton_key);

-- Trigger 1: criar profile automatico ao cadastrar no auth.users
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    'atendente'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

-- Trigger 2: validar disponibilidade ao criar locacao e ajustar carro
create or replace function public.handle_locacao_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_km numeric;
  v_valor_diaria numeric;
begin
  select status, km_atual, valor_diaria into v_status, v_km, v_valor_diaria
  from public.carros
  where id = new.carro_id
  for update;

  if not found then
    raise exception 'Veiculo nao encontrado';
  end if;

  if v_status <> 'disponivel' then
    raise exception 'Este veiculo nao esta disponivel para locacao';
  end if;

  new.km_saida := v_km;
  new.valor_diaria := v_valor_diaria;
  new.valor_total := new.quantidade_diarias * v_valor_diaria;

  if new.data_prevista_devolucao < new.data_retirada then
    raise exception 'Data prevista de devolucao nao pode ser menor que retirada';
  end if;

  update public.carros
  set status = 'alugado'
  where id = new.carro_id;

  return new;
end;
$$;

drop trigger if exists trg_locacao_insert on public.locacoes;
create trigger trg_locacao_insert
before insert on public.locacoes
for each row execute function public.handle_locacao_insert();

-- Trigger 3: finalizar devolucao e atualizar veiculo
create or replace function public.handle_locacao_devolucao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'finalizada' and old.status <> 'finalizada' then
    if new.km_entrada is null then
      raise exception 'Informe o KM de devolucao';
    end if;

    if new.km_entrada < old.km_saida then
      raise exception 'KM de devolucao nao pode ser menor que o KM de saida';
    end if;

    new.km_rodado := new.km_entrada - old.km_saida;

    update public.carros
    set
      km_atual = new.km_entrada,
      status = 'disponivel'
    where id = old.carro_id;
  end if;

  if new.status = 'cancelada' and old.status = 'aberta' then
    update public.carros
    set status = 'disponivel'
    where id = old.carro_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_locacao_devolucao on public.locacoes;
create trigger trg_locacao_devolucao
before update on public.locacoes
for each row execute function public.handle_locacao_devolucao();

-- RLS
alter table public.profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.carros enable row level security;
alter table public.locacoes enable row level security;
alter table public.app_settings enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.status = 'ativo'
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'ativo'
  );
$$;

create or replace function public.enforce_profile_update_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if auth.uid() <> old.id and not public.is_admin() then
    raise exception 'Sem permissao para atualizar outro usuario';
  end if;

  if auth.uid() = old.id and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Somente administradores podem alterar o perfil de acesso';
    end if;
    if new.status is distinct from old.status then
      raise exception 'Somente administradores podem alterar o status de usuarios';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_permission_guard on public.profiles;
create trigger trg_profiles_permission_guard
before update on public.profiles
for each row execute function public.enforce_profile_update_permissions();

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select
to authenticated
using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update
to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

drop policy if exists "clientes_authenticated" on public.clientes;
drop policy if exists "clientes_select_authenticated" on public.clientes;
drop policy if exists "clientes_insert_authenticated" on public.clientes;
drop policy if exists "clientes_update_authenticated" on public.clientes;
drop policy if exists "clientes_delete_admin" on public.clientes;
create policy "clientes_select_authenticated" on public.clientes
for select
to authenticated
using (public.is_active_user());
create policy "clientes_insert_authenticated" on public.clientes
for insert
to authenticated
with check (public.is_active_user());
create policy "clientes_update_authenticated" on public.clientes
for update
to authenticated
using (public.is_active_user())
with check (public.is_active_user());
create policy "clientes_delete_admin" on public.clientes
for delete
to authenticated
using (public.is_admin());

drop policy if exists "carros_authenticated" on public.carros;
drop policy if exists "carros_select_authenticated" on public.carros;
drop policy if exists "carros_insert_authenticated" on public.carros;
drop policy if exists "carros_update_authenticated" on public.carros;
drop policy if exists "carros_delete_admin" on public.carros;
create policy "carros_select_authenticated" on public.carros
for select
to authenticated
using (public.is_active_user());
create policy "carros_insert_authenticated" on public.carros
for insert
to authenticated
with check (public.is_active_user());
create policy "carros_update_authenticated" on public.carros
for update
to authenticated
using (public.is_active_user())
with check (public.is_active_user());
create policy "carros_delete_admin" on public.carros
for delete
to authenticated
using (public.is_admin());

drop policy if exists "locacoes_authenticated" on public.locacoes;
drop policy if exists "locacoes_select_authenticated" on public.locacoes;
drop policy if exists "locacoes_insert_authenticated" on public.locacoes;
drop policy if exists "locacoes_update_authenticated" on public.locacoes;
drop policy if exists "locacoes_delete_admin" on public.locacoes;
create policy "locacoes_select_authenticated" on public.locacoes
for select
to authenticated
using (public.is_active_user());
create policy "locacoes_insert_authenticated" on public.locacoes
for insert
to authenticated
with check (public.is_active_user());
create policy "locacoes_update_authenticated" on public.locacoes
for update
to authenticated
using (public.is_active_user())
with check (public.is_active_user());
create policy "locacoes_delete_admin" on public.locacoes
for delete
to authenticated
using (public.is_admin());

drop policy if exists "app_settings_authenticated" on public.app_settings;
drop policy if exists "app_settings_admin_only" on public.app_settings;
create policy "app_settings_admin_only" on public.app_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
