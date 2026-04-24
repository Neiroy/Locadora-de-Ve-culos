# Go-live checklist (produção)

## Status atual do projeto

- Build de produção: OK (`npm run build`)
- Lint geral: PENDENTE (`npm run lint` com erros existentes em arquivos antigos)
- Responsividade das telas principais: OK (Dashboard, Locações, Históricos, Configurações, Contrato)
- Segurança de frontend e SQL: reforçada nas etapas anteriores

## Bloqueadores antes de uso real

1. Corrigir erros de lint existentes:
   - `src/hooks/useAuth.tsx`
   - `src/pages/CarsPage.tsx`
   - `src/pages/ClientsPage.tsx`
   - `src/pages/DashboardPage.tsx` (função usada antes de declaração)
   - `src/pages/RentalsPage.tsx`
   - `src/pages/ReportsPage.tsx`
   - `src/pages/SettingsPage.tsx`
2. Rodar novamente:
   - `npm run lint`
   - `npm run build`

## Segurança operacional (obrigatório)

- [ ] Garantir que `.env` nao esta versionado e somente `.env.example` esteja no repositório.
- [ ] Rotacionar credenciais do Supabase se alguma chave sensível já foi exposta.
- [ ] Confirmar usuário admin principal ativo e usuários inativos sem acesso.
- [ ] Revisar políticas RLS em produção (profiles/clientes/carros/locacoes/app_settings).
- [ ] Habilitar backup automático do banco Supabase.
- [ ] Definir rotina de export diário/semanal dos dados críticos.

## Deploy e infraestrutura

- [ ] Confirmar variáveis de ambiente no Netlify:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] Confirmar arquivo de SPA redirect em produção: `public/_redirects`.
- [ ] Fazer deploy pela branch principal estável.
- [ ] Validar navegação com refresh direto nas rotas internas (sem erro 404).

## QA funcional mínimo (produção)

- [ ] Login/logout.
- [ ] Cadastro e edição de clientes.
- [ ] Cadastro e edição de veículos.
- [ ] Criação de locação.
- [ ] Finalização de devolução (incluindo dias extras e valor adicional).
- [ ] Geração e impressão de contrato.
- [ ] Exportação CSV em históricos.

## Critério para liberar o sistema

Liberar para uso real somente quando:

1. `npm run lint` estiver sem erros.
2. `npm run build` estiver OK.
3. Checklist de segurança operacional estiver 100% concluído.
4. QA funcional mínimo estiver validado.
