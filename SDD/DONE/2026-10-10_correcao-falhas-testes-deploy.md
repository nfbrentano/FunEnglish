# [FIX] Correção de Falhas de Testes Unitários e Avisos de Lint no Deploy CI

> **Status:** Concluída
> **Autor:** Antigravity · **Revisor:** Natanael Brentano · **Criada em:** 2026-10-10 · **Atualizada em:** 2026-10-10

## Detalhes da Atividade

- **O que precisa ser feito:** Corrigir os testes unitários quebrados após a introdução de `useRouter()` indevido em `SendHomeworkButton`, sanar avisos de variáveis não utilizadas em componentes (`live-room-modal.tsx`, `interactive-whiteboard.tsx`, `send-homework-modal.tsx`), e garantir que arquivos do sistema operacional (como `.DS_Store`) não causem falhas nos testes de validação de imagens (`images.test.ts`).
- **Problema e evidência:** A execução agendada do workflow de Deploy (#122) no GitHub Actions falhou com 10 erros de testes unitários e 10 warnings de lint/deploy:
  - `SendHomeworkButton` chamava `useRouter()` no corpo do componente, disparando `Error: invariant expected app router to be mounted` e `Error: [vitest] No "useRouter" export is defined on the "next/navigation" mock` ao ser renderizado dentro dos cards em `dashboard.test.tsx`, `results-grid.test.tsx`, `category-view.test.tsx`, `catalog-view.test.tsx`, `activity-player.test.tsx` e `live-activity-player.test.tsx`.
  - Avisos de ESLint por imports/variáveis não utilizadas em `src/components/live/live-room-modal.tsx` (`Badge`, `UserCheck`, `QrCode`), `src/components/live/interactive-whiteboard.tsx` (`unsubscribe` não chamada, `off`), e `src/components/homework/send-homework-modal.tsx` (`Check`, `Clock`, `ExternalLink`).
  - Falha potencial em ambiente de desenvolvimento macOS onde `.DS_Store` em `public/images` quebra a asserção de que todos os arquivos são WebP válidos em `tests/unit/activities/images.test.ts`.
- **Impacto de não fazer:** O pipeline de Deploy do GitHub Actions (`deploy.yml`) fica permanentemente bloqueado no step de `npm test`, impedindo novos deploys automatizados na branch `main`.
- **Para quem é destinado:** Desenvolvedores e esteira de CI/CD do projeto Fun English.
- **História de usuário:** Como mantenedor do projeto, quero que toda a suíte de testes unitários e linters passe com sucesso tanto localmente quanto no CI, para que o deploy contínuo em produção ocorra sem bloqueios.
- **Como saberemos que deu certo:** 100% dos testes unitários passando (`npm test` com 97 arquivos e 1076 testes aprovados), `npm run build` gerando todas as páginas estáticas sem erros e build/test das Cloud Functions executando limpo.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Restaurar `window.location.assign` e remover dependência de `useRouter` em `SendHomeworkButton` para evitar quebra de testes onde o contexto de navegação do App Router não está montado. | P0 | CA01 |
| RF02 | Limpar imports e variáveis não utilizadas em `live-room-modal.tsx`, `interactive-whiteboard.tsx` e `send-homework-modal.tsx`. | P1 | CA02 |
| RF03 | Adequar o filtro de imagens em `tests/unit/activities/images.test.ts` para desconsiderar arquivos ocultos do sistema operacional (prefixados por ponto). | P1 | CA03 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | O comando `npm test` deve passar com 0 falhas e 0 erros não tratados. | P0 | CA01, CA03 |
| RNF02 | O comando `npm run build` deve compilar com sucesso todas as 99 páginas estáticas. | P0 | CA01, CA02 |
| RNF03 | O comando `npm run test:functions` e `npm run build:functions` devem executar sem falhas. | P0 | CA01 |

### Dependências técnicas

- Vitest, Next.js 16.4.0 e ESLint.

### Recursos necessários

- Nenhum além do repositório local e Git/GitHub CLI.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que um usuário não autenticado clica no botão de enviar lição de casa, quando o clique é acionado, então o redirecionamento ocorre via `window.location.assign` sem exigir o contexto do App Router durante a renderização do componente, e todos os testes que renderizam `SendHomeworkButton` passam com sucesso.
- [x] **CA02:** Dado os componentes `live-room-modal.tsx`, `interactive-whiteboard.tsx` e `send-homework-modal.tsx`, quando analisados pelo linter, então não deve haver variáveis ou imports não utilizados neles.
- [x] **CA03:** Dado um diretório de assets com arquivos de sistema (como `.DS_Store`), quando executado `tests/unit/activities/images.test.ts`, então esses arquivos ocultos são ignorados e apenas imagens válidas são validadas.

## O que a atividade não inclui

- Refatorações de regras legadas de ESLint (como `no-explicit-any` geral do projeto): motivo: escopo delimitado à resolução das falhas que travaram o deploy CI.

### Considerado para o futuro (P2)

- Mock global padronizado de `next/navigation` no setup de testes: motivo: já contornado com componentes resilientes.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | N/A | Dev | Não | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Testes unitários do dashboard e catálogo | unit | CA01 | Executar `npx vitest run tests/unit/dashboard/ tests/unit/catalog/` | 100% dos testes aprovados sem unhandled errors |
| CT02 | Validação de imagens do repositório | unit | CA03 | Executar `npx vitest run tests/unit/activities/images.test.ts` | 2 testes aprovados |
| CT03 | Suíte completa e build de produção | unit / build | CA01, CA02, CA03 | Executar `npm test && npm run build` | Todos os testes e build estático concluídos com sucesso |

## URL Complementar

- Documentação técnica: N/A
- Protótipo / mockup: N/A
- Discussões relacionadas: N/A
- Referências de design: N/A
- Requisitos originais: N/A
- Issue / PR relacionado: Deploy Run #122 (commit 97859288508ae99926d92f5c0eab840c4ceb1b4a)
