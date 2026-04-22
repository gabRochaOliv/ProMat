-- =============================================
-- ProMat — Estrutura de Banco de Dados (Supabase)
-- Executar no SQL Editor do painel do Supabase
-- =============================================

-- =============================================
-- 1. TABELA: profiles
-- Criada automaticamente ao cadastrar novo usuário
-- =============================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil público de cada usuário autenticado';
comment on column public.profiles.plan is 'Plano do usuário: free | premium';

-- Habilita RLS
alter table public.profiles enable row level security;

-- Policy: cada usuário vê/edita apenas seu próprio perfil
create policy "profiles: leitura própria"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: atualização própria"
  on public.profiles for update
  using (auth.uid() = id);

-- O service_role bypassa RLS automaticamente (insert feito pelo trigger)

-- =============================================
-- 2. TRIGGER: Criar profile automaticamente ao cadastrar
-- =============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Remove trigger antigo se existir
drop trigger if exists on_auth_user_created on auth.users;

-- Cria trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- =============================================
-- 3. TABELA: generations
-- Armazena cada conteúdo gerado pela IA
-- =============================================
create table if not exists public.generations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,                    -- Para guest mode futuro
  type text not null,                 -- exercicios | prova | atividade-extra | explicacao
  title text,                         -- Título/tema do conteúdo
  prompt_data jsonb,                  -- Dados usados para gerar (serie, tema, nivel, etc.)
  generated_content jsonb,            -- Conteúdo gerado pela IA (JSON completo)
  created_at timestamptz not null default now()
);

comment on table public.generations is 'Registro de cada conteúdo gerado pela IA';
comment on column public.generations.user_id is 'NULL se gerado por visitante (guest mode futuro)';
comment on column public.generations.session_id is 'ID de sessão anônima para guest mode';
comment on column public.generations.type is 'Tipo: exercicios | prova | atividade-extra | explicacao';
comment on column public.generations.prompt_data is 'Parâmetros usados: serie, tema, nivel, tipoQuestoes, etc.';
comment on column public.generations.generated_content is 'JSON completo retornado pela IA';

-- Habilita RLS
alter table public.generations enable row level security;

-- Policy: usuário autenticado vê apenas suas gerações
create policy "generations: leitura própria"
  on public.generations for select
  using (auth.uid() = user_id);

-- Policy: usuário pode deletar apenas suas próprias gerações
create policy "generations: exclusão própria"
  on public.generations for delete
  using (auth.uid() = user_id);

-- Policy: service_role pode inserir (backend usa service_role, bypassa RLS)
-- O service_role ignora RLS automaticamente, então não precisa de policy de insert

-- Índices para performance
create index if not exists generations_user_id_idx on public.generations(user_id);
create index if not exists generations_session_id_idx on public.generations(session_id);
create index if not exists generations_created_at_idx on public.generations(created_at desc);

-- =============================================
-- VERIFICAÇÃO (opcional — rode depois)
-- =============================================
-- select * from public.profiles;
-- select * from public.generations;
