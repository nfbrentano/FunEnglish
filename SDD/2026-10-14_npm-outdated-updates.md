# [CHORE] Atualização de Dependências Desatualizadas (npm outdated)

> **Status:** Em andamento
> **Autor:** Antigravity · **Revisor:** Natanael Brentano · **Criada em:** 2026-10-14 · **Atualizada em:** 2026-10-14

## Detalhes da Atividade

- **O que precisa ser feito:** Atualizar as dependências e devDependencies do projeto que possuem versões patch e minor mais recentes sem quebras de compatibilidade, unificar o ESLint de `functions/` com o do frontend na v10, e manter o TypeScript travado em `^5.9.3` para garantir estabilidade com Next.js 16.4 e Turbopack.
- **Problema e evidência:** O comando `npm outdated` indicou pacotes desatualizados no root (`@playwright/test`, `@testing-library/user-event`, `@types/node`, `konva`, `lucide-react`, `marked`, `prettier`, `vitest`, `zod`) e em `functions/` (`@types/node`, `vitest`, `zod`, `eslint`). Manter dependências atualizadas evita acúmulo de débito técnico, previne bugs corrigidos a montante e garante tooling atualizado.
- **Impacto de não fazer:** Dependências desatualizadas podem acumular vulnerabilidades, incompatibilidades futuras e divergir entre pacotes compartilhados (ex.: zod e vitest em versões diferentes entre root e functions).
- **Para quem é destinado:** Desenvolvedores e mantenedores do projeto Fun English.
- **História de usuário:** Como mantenedor do projeto, quero atualizar os pacotes desatualizados de forma controlada e segura, para manter o ambiente estável, moderno e com 100% dos testes e builds passando.
- **Como saberemos que deu certo:** `npm outdated` não apontará mais pendências para as dependências do escopo seguro, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:functions`, `npm run build` e `npm run build:functions` executarão sem falhas.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Atualizar pacotes de testes e tooling do root (`@playwright/test`, `@testing-library/user-event`, `@types/node`, `prettier`, `vitest`). | P0 | CA01 |
| RF02 | Atualizar pacotes de aplicação do root (`konva`, `lucide-react`, `marked`, `zod`). | P0 | CA01 |
| RF03 | Atualizar pacotes em `functions/` (`@types/node`, `vitest`, `zod` e unificar `eslint` para `^10.12.0`). | P0 | CA01 |
| RF04 | Manter `typescript` em `^5.9.3` tanto no root quanto em `functions/`. | P0 | CA02 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | 100% dos testes unitários (root e functions) devem passar sem regressões. | P0 | CA02 |
| RNF02 | O build de produção do Next.js e o build do TypeScript de functions devem compilar com sucesso. | P0 | CA02 |

### Dependências técnicas

- `package.json`
- `package-lock.json`
- `functions/package.json`
- `functions/package-lock.json`

### Recursos necessários

- N/A

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que as versões foram atualizadas em `package.json` e `functions/package.json`, quando executado `npm update` e `npm --prefix functions update`, então os lockfiles são sincronizados e refletem as versões mais recentes do range planejado.
- [ ] **CA02:** Dado que as dependências foram atualizadas, quando executados os comandos `npm run lint`, `npm run lint:functions`, `npm run typecheck`, `npm test`, `npm run test:functions`, `npm run build` e `npm run build:functions`, então todos os comandos terminam com código 0 (sucesso).

## O que a atividade não inclui

- Atualização de TypeScript para a v7: motivo: grande salto de versão com potenciais incompatibilidades no ecossistema Next.js 16.4 e Turbopack; postergado para ciclo dedicado.
- `npm audit fix --force`: motivo: tentaria forçar downgrade de dependências críticas (como `firebase-tools`), introduzindo quebras no projeto.

### Considerado para o futuro (P2)

- Planejar a migração para TypeScript 7 quando o suporte estiver maduro e validado nas ferramentas periféricas.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | TypeScript 7 deve ser incluído? | PO/Dev | Sim | Não, manter em `^5.9.3`. |
| D02 | Unificar ESLint de functions na v10? | PO/Dev | Sim | Sim, atualizar para `^10.12.0`. |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Validação de tipos | unit | CA02 | Rodar `npm run typecheck` | 0 erros de tipo |
| CT02 | Validação de testes unitários | unit | CA02 | Rodar `npm test` e `npm run test:functions` | Todos os testes passando |
| CT03 | Validação de build | unit | CA02 | Rodar `npm run build` e `npm run build:functions` | Build gerado com sucesso |

## URL Complementar

- Documentação técnica: https://docs.npmjs.com/cli/v10/commands/npm-outdated
- Protótipo / mockup: N/A
- Discussões relacionadas: N/A
- Referências de design: N/A
- Requisitos originais: /plan npm outdated
- Issue / PR relacionado: N/A
