# [CHORE] Atualização de Dependências Desatualizadas (npm outdated)

> **Status:** Concluída
> **Autor:** Antigravity · **Revisor:** Natanael Brentano · **Criada em:** 2026-11-03 · **Atualizada em:** 2026-11-03

## Detalhes da Atividade

- **O que precisa ser feito:** Atualizar as dependências e devDependencies do projeto (root e `functions/`) que possuem versões patch e minor mais recentes sem quebras de compatibilidade, incluindo a atualização do Next.js para `16.4.4`, React para `19.3.1`, Firebase para `13.2.0` e ESLint para `10.14.0`, mantendo o TypeScript em `^5.9.3` para garantir estabilidade com Next.js 16.4 e Turbopack e `@types/node` em `^24.19.2` em `functions/` (conforme `engines.node: 22`).
- **Problema e evidência:** O comando `npm outdated` indicou pacotes desatualizados no root (`@axe-core/playwright`, `@next/env`, `@tailwindcss/postcss`, `@types/node`, `@vitejs/plugin-react`, `eslint`, `eslint-config-next`, `firebase`, `firebase-tools`, `jsdom`, `konva`, `lucide-react`, `marked`, `next`, `react`, `react-dom`, `react-konva`, `tailwindcss`, `vitest`) e em `functions/` (`eslint`, `vitest`).
- **Impacto de não fazer:** Acúmulo de débito técnico, perda de correções de bugs e melhorias de segurança a montante (inclusive alertas do Dependabot como `next`), e divergência de versões de ferramentas compartilhadas (`eslint`, `vitest`) entre root e `functions/`.
- **Para quem é destinado:** Desenvolvedores e mantenedores do projeto Fun English.
- **História de usuário:** Como mantenedor do projeto, quero atualizar os pacotes desatualizados de forma controlada e segura, para manter o ambiente estável, seguro e com 100% dos testes, lint e builds passando.
- **Como saberemos que deu certo:** `npm outdated` não apontará mais pendências para as dependências do escopo seguro (exceto major intencionalmente travada como TypeScript 7 e `@types/node` 24 em `functions/`), e `npm run lint`, `npm run lint:functions`, `npm run typecheck`, `npm test`, `npm run test:functions`, `npm run build` e `npm run build:functions` executarão com código de saída 0.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Atualizar pacotes de aplicação do root (`@next/env`, `firebase`, `konva`, `lucide-react`, `marked`, `next`, `react`, `react-dom`, `react-konva`). | P0 | CA01 |
| RF02 | Atualizar pacotes de testes e tooling do root (`@axe-core/playwright`, `@tailwindcss/postcss`, `@types/node`, `@vitejs/plugin-react`, `eslint`, `eslint-config-next`, `firebase-tools`, `jsdom`, `tailwindcss`, `vitest`). | P0 | CA01 |
| RF03 | Atualizar pacotes de tooling em `functions/` (`eslint`, `vitest`). | P0 | CA01 |
| RF04 | Manter `typescript` em `^5.9.3` (root e `functions/`) e `@types/node` em `^24.x` em `functions/`. | P0 | CA02, CA03 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | 100% dos testes unitários (root e `functions/`) e checagens de lint/tipos devem passar em 0 erros. | P0 | CA02 |
| RNF02 | O build de produção do Next.js e o build do TypeScript de `functions/` devem compilar com sucesso. | P0 | CA02 |

### Dependências técnicas

- `package.json`
- `package-lock.json`
- `functions/package.json`
- `functions/package-lock.json`

### Recursos necessários

- N/A (apenas registro público do npm).

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que existem pacotes patch e minor desatualizados em `package.json` e `functions/package.json`, quando as versões são atualizadas e `npm update` é executado, então `package-lock.json` e `functions/package-lock.json` passam a refletir as versões mais recentes do escopo.
- [x] **CA02:** Dado que as dependências foram atualizadas, quando executados os comandos `npm run lint`, `npm run lint:functions`, `npm run typecheck`, `npm test`, `npm run test:functions`, `npm run build` e `npm run build:functions`, então todos os comandos terminam com código 0 (sucesso).
- [x] **CA03:** Dado que `typescript` possui versão major 7.x disponível, quando executado `npm outdated`, então `typescript` permanece na série `5.9.x` sem quebrar a integração com Next.js 16.4 e ESLint.

## O que a atividade não inclui

- Atualização de TypeScript para a v7 (`7.0.2`): motivo: salto major com potenciais incompatibilidades no ecossistema Next.js 16.4 / `eslint-config-next`.
- Atualização de `@types/node` para v26 em `functions/`: motivo: o runtime do Cloud Functions está configurado em `engines.node: "22"`, portanto manter `@types/node` alinhado à série LTS compatível evita uso acidental de APIs exclusivas do Node 26.

### Considerado para o futuro (P2)

- Avaliar migração para TypeScript 7 em tarefa dedicada quando toda a cadeia de plugins do Next.js e ESLint suportar oficialmente a v7.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Atualizar todas as dependências compatíveis mantendo estabilidade? | PO/Dev | Não | Sim, autorizado pelo usuário. |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Validação de lint e tipos | unit | CA02, CA03 | Executar `npm run lint`, `npm run lint:functions` e `npm run typecheck` | 0 erros reportados |
| CT02 | Validação de testes unitários | unit | CA02 | Executar `npm test` e `npm run test:functions` | 100% dos testes passando |
| CT03 | Validação de build de produção | integração | CA01, CA02 | Executar `npm run build` e `npm run build:functions` | Builds do Next.js e do Cloud Functions concluídos com sucesso |

## URL Complementar

- Documentação técnica: https://docs.npmjs.com/cli/v10/commands/npm-outdated
- Protótipo / mockup: N/A (tarefa de manutenção de dependências sem alteração visual)
- Discussões relacionadas: N/A
- Referências de design: N/A
- Requisitos originais: `npm outdated`
- Issue / PR relacionado: N/A
