# Sistema de Locadora de Carros (React + Supabase)

Sistema web profissional, moderno e enxuto para locadora com:

- Login com Supabase Auth
- Dashboard com indicadores
- CRUD de carros
- CRUD de clientes
- Fluxo de locação com contrato automático
- Fluxo de devolução com atualização de KM/status
- Página de contrato com impressão
- Banco e segurança com RLS no Supabase

## Stack

- Frontend: React + Vite + TypeScript
- Estilo: Tailwind CSS
- Banco/Auth: Supabase (PostgreSQL + Auth)
- Validação/utilitários: Zod, React Hook Form, date-fns (estrutura preparada)

## Rodar localmente

1. Instale dependências:

```bash
npm install
```

2. Crie o arquivo `.env` com base no `.env.example`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
```

3. Inicie:

```bash
npm run dev
```

## Configurar Supabase (passo a passo)

1. Crie um projeto no [Supabase](https://supabase.com).
2. No painel, abra `SQL Editor`.
3. Execute o conteúdo de `supabase/schema.sql`.
4. (Opcional) Execute `supabase/seed.sql` para dados fictícios.
5. Copie `Project URL` e `anon public key` para seu `.env`.

## Criar primeiro usuário

- No Supabase: `Authentication > Users > Add user`
- Preencha email e senha
- O trigger criará automaticamente o registro em `profiles`.

## Fluxo de teste rápido

1. Login com usuário criado no Supabase Auth.
2. Cadastre veículos em `Carros`.
3. Cadastre clientes em `Clientes`.
4. Em `Locações`, crie uma nova locação.
5. Abra o contrato em `Contratos` e teste impressão.
6. Finalize devolução e confira:
   - locação muda para `finalizada`
   - KM rodado é calculado
   - `km_atual` do carro é atualizado
   - status do carro volta para `disponivel`

## Boas práticas de segurança aplicadas

- RLS habilitado em todas as tabelas de domínio.
- Policies para usuários autenticados (base pronta para evoluir para multiempresa).
- Trigger seguro para criação de perfil com `security definer`.
- Triggers transacionais para consistência de locação/devolução.
