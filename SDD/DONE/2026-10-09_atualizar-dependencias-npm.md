# [CHORE] Atualizar Dependências NPM (npm outdated)

> **Status:** Aprovada
> **Autor:** Antigravity · **Criada em:** 2026-10-09 · **Atualizada em:** 2026-10-09

## Detalhes da Atividade

- **O que precisa ser feito:** Executar a atualização das dependências do projeto que constam como desatualizadas após o comando `npm outdated`.
- **Problema e evidência:** Ao rodar `npm outdated`, verificou-se que vários pacotes estão em versões antigas:
  - `@firebase/rules-unit-testing` (5.0.2 -> 6.0.0)
  - `@next/env` (16.3.8 -> 16.4.0)
  - `@playwright/test` (1.63.0 -> 1.64.0)
  - `eslint` (9.39.5 -> 10.12.0)
  - `eslint-config-next` (16.3.8 -> 16.4.0)
  - `firebase` (12.19.0 -> 13.0.0)
  - `lucide-react` (1.52.0 -> 1.54.0)
  - `next` (16.3.8 -> 16.4.0)
  - `typescript` (5.9.3 -> 7.0.2)
- **Impacto de não fazer:** O projeto pode sofrer com brechas de segurança no futuro, perder melhorias de performance (ex. novas versões do Next.js) ou ficar estagnado dificultando a adoção de novas bibliotecas.
- **Para quem é destinado:** Desenvolvedores (manutenção técnica).
- **História de usuário:** Como mantenedor do projeto, quero manter os pacotes atualizados, para aproveitar melhorias de performance, correções de segurança e novas features do ecossistema.
- **Como saberemos que deu certo:** Rodar `npm run build` deve compilar com sucesso. `npm outdated` deve estar vazio (ou conter apenas pacotes que não podemos atualizar por razões de compatibilidade).

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Atualizar pacotes menores (Next.js, Playwright, lucide-react) | P0 | CA01 |
| RF02 | Avaliar e atualizar pacotes maiores (Firebase 13, ESLint 10, TypeScript 7) e testar build | P0 | CA02 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | O build de produção deve rodar sem erros | P0 | CA03 |

### Dependências técnicas

- Arquivo `package.json` e `package-lock.json`.

### Recursos necessários

- Acesso ao terminal do repositório para rodar `npm install`.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que as dependências menores foram atualizadas, quando rodarmos a aplicação, então ela deve funcionar sem problemas de compatibilidade.
- [ ] **CA02:** Dado que atualizamos `firebase`, `eslint` e `typescript` para versões maiores (major version), quando executarmos linting ou build, então possíveis erros de breaking changes devem ser corrigidos no código.
- [ ] **CA03:** Dado que a atualização terminou, quando o comando `npm run build` for executado, então ele deve terminar com sucesso, sem erros fatais.

## O que a atividade não inclui

- Refatorações de UI ou lógica de negócios: motivo: a tarefa é puramente de configuração e infraestrutura.

### Considerado para o futuro (P2)

- Configuração de Renovate ou Dependabot para checar e abrir PRs automaticamente.

## Dúvidas em aberto

| # | Dúvida | Responsável | Bloqueante? | Resposta |
|---|--------|-------------|-------------|----------|
| D01 | Precisamos atualizar todas as breaking changes agora (TS 7, ESLint 10, Firebase 13)? | Desenvolvedor | Sim | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo | Cobre | Passos | Resultado esperado |
|---|---------|------|-------|--------|--------------------|
| CT01 | Build após update | integração | CA03 | Rodar `npm update`, resolver possíveis quebras, rodar `npm run build` | O build compila com sucesso. |
| CT02 | Lint após update | integração | CA02 | Rodar `npm run lint` após atualizar o ESLint | O projeto passa no lint (ou os erros são resolvidos). |

## URL Complementar

- N/A
