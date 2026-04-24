-- Limpeza operacional completa (carros, clientes e locacoes)
-- Execute no SQL Editor do Supabase.
-- ATENCAO: esta rotina apaga os dados dessas tabelas.

begin;

-- Trunca todas as tabelas relacionadas no mesmo comando.
truncate table public.locacoes, public.clientes, public.carros restart identity cascade;

commit;

-- Verificacao rapida apos limpeza
select 'locacoes' as tabela, count(*) as total from public.locacoes
union all
select 'clientes' as tabela, count(*) as total from public.clientes
union all
select 'carros' as tabela, count(*) as total from public.carros;
