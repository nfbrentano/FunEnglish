# [CHORE] Correção de vulnerabilidades do Dependabot (uuid e @grpc/grpc-js)

> **Status:** Concluída
> **Autor:** Antigravity · **Revisor:** N/A · **Criada em:** 2026-10-08 · **Atualizada em:** 2026-10-08

## Detalhes da Atividade

- **O que precisa ser feito:** Atualizar as dependências `uuid` e `@grpc/grpc-js` para versões seguras, conforme reportado pelo Dependabot.
- **Problema e evidência:** Dependabot alertou sobre vulnerabilidades de segurança nestes pacotes:
  - `@grpc/grpc-js`: High (#4), Low (#3)
  - `uuid`: Moderate (#6) e Moderate (#1)
- **Impacto de não fazer:** Manter vulnerabilidades conhecidas no código, que poderiam ser exploradas.
- **Para quem é destinado:** Desenvolvedores e sistema de segurança (CI).
- **História de usuário:** Como desenvolvedor, quero que as dependências não tenham vulnerabilidades conhecidas, para manter a segurança do projeto.
- **Como saberemos que deu certo:** `npm audit` em `root` e `functions` não deve reportar as vulnerabilidades de `uuid` e `@grpc/grpc-js`. O build do projeto não deve quebrar.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Atualizar a versão do uuid | P0 | CA01 |
| RF02 | Atualizar a versão do @grpc/grpc-js | P0 | CA01 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | O build deve passar com as novas versões | P0 | CA02 |

### Dependências técnicas

- N/A

### Recursos necessários

- N/A

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que as dependências vulneráveis existem, quando atualizadas, então o `npm audit` não deve acusar falhas para `uuid` e `@grpc/grpc-js`.
- [x] **CA02:** Dado que as dependências foram atualizadas, quando executado `npm run build` e `npm run typecheck`, então as validações devem passar.

## O que a atividade não inclui

- Atualizar vulnerabilidades além das mencionadas (ex: outras no npm audit que gerem breaking changes maiores que não foram citadas pelo Dependabot).

### Considerado para o futuro (P2)

- N/A

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | N/A | | | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Build e Testes passando | integração | CA02 | `npm run build` e `npm run typecheck` | Sucesso |

## URL Complementar

- Documentação técnica:
- Protótipo / mockup:
- Discussões relacionadas:
- Referências de design:
- Requisitos originais: [uuid dependabot issue](https://github.com/nfbrentano/FunEnglish/security/dependabot/6)
- Issue / PR relacionado: 
