# [FIX] Resolução de Falhas de Lint e Bloqueios no Deploy CI

> **Status:** Em andamento
> **Autor:** Antigravity · **Revisor:** Natanael Brentano · **Criada em:** 2026-10-09 · **Atualizada em:** 2026-10-09

## Detalhes da Atividade

- **O que precisa ser feito:** Remover o arquivo residual `get_missing.js` que causa erro fatal no ESLint (`@typescript-eslint/no-require-imports`) durante a pipeline de deploy no GitHub Actions, além de sanar os avisos de linting restantes (`LedgerEntryType` não utilizado, dependência ausente em `useEffect`, importações mortas e uso indevido de `window.location.assign`).
- **Problema e evidência:** O workflow de deploy do GitHub Actions na branch `main` falhou com exit code 1 devido a:
  ```
  /home/runner/work/FunEnglish/FunEnglish/get_missing.js
  Error: 1:12 error A `require()` style import is forbidden @typescript-eslint/no-require-imports
  Error: 2:14 error A `require()` style import is forbidden @typescript-eslint/no-require-imports
  ```
  O script `get_missing.js` é legado e já foi substituído por `get_missing.mjs` com sintaxe ESM. No entanto, o arquivo original permaneceu versionado na branch `main`.
- **Impacto de não fazer:** A esteira de integração contínua e deploy automatizado para produção fica bloqueada com falha no step de `npm run lint`.
- **Para quem é destinado:** Desenvolvedores e sistema de CI/CD.
- **História de usuário:** Como desenvolvedor, quero que as validações de linter passem com sucesso no CI, para que os deploys ocorram de forma contínua e sem falhas.
- **Como saberemos que deu certo:** `npm run lint` executa sem erros e a pipeline do GitHub Actions conclui o step de lint com sucesso.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Remover `get_missing.js` do repositório, mantendo apenas `get_missing.mjs`. | P0 | CA01 |
| RF02 | Corrigir avisos destacados em componentes (`student-billing-section.tsx`, `question-analysis-view.tsx`, `send-homework-button.tsx`). | P1 | CA02 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | O comando `npx eslint . --quiet` deve retornar exit code 0. | P0 | CA01 |
| RNF02 | O build de produção e a verificação de tipos (`npm run typecheck` e `npm run build`) não devem quebrar. | P0 | CA02 |

### Dependências técnicas

- ESLint v9 e Next.js ESLint config.

### Recursos necessários

- Nenhum além do ambiente de desenvolvimento.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado o repositório atualizado, quando executado `npx eslint . --quiet`, então não deve haver nenhum erro bloqueante retornado (exit code 0).
- [ ] **CA02:** Dado que `get_missing.js` foi excluído e os imports limpos, quando executado `npm run build`, então o build de produção deve finalizar com sucesso.

## O que a atividade não inclui

- Refatorações de arquitetura ou resolução de todos os 200 warnings de regras de linting cosméticas antigas: motivo: fora do escopo desta correção de desbloqueio de deploy.

### Considerado para o futuro (P2)

- N/A

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | N/A | Dev | Não | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Verificação de ESLint | CI / automatizado | CA01 | Rodar `npx eslint . --quiet` | Execução limpa sem erros |
| CT02 | Build do Next.js | automatizado | CA02 | Rodar `npm run build` | Compilação concluída sem falhas |

## URL Complementar

- Documentação técnica: N/A
- Issue / PR relacionado: Deploy run #120
