# [FIX] Corrigir erro de permissão ao salvar novos estudantes

> **Status:** Rascunho
> **Autor:** AI · **Revisor:** N/A · **Criada em:** 2026-10-08 · **Atualizada em:** 2026-10-08

## Detalhes da Atividade

- **O que precisa ser feito:** Atualizar as regras de segurança do Firebase (Firestore ou Realtime Database) para permitir a criação/salvamento de novos estudantes.
- **Problema e evidência:** Ao tentar salvar um novo estudante, ocorre o erro no console: `installHook.js:1 FirebaseError: Missing or insufficient permissions. overrideMethod @ installHook.js:1`.
- **Impacto de não fazer:** Usuários ficam bloqueados e não conseguem cadastrar novos estudantes no sistema, impedindo o fluxo principal de uso.
- **Para quem é destinado:** Usuários autenticados responsáveis por gerenciar estudantes (ex: Professores ou Administradores).
- **História de usuário:** Como [usuário autenticado], quero [salvar novos estudantes com sucesso], para [poder gerenciar alunos no sistema].
- **Como saberemos que deu certo:** Conseguir criar um novo estudante pela interface sem erros de permissão no console, validando a persistência no banco de dados.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Identificar a coleção/caminho onde os documentos de estudantes são salvos. | P0 | CA01 |
| RF02 | Ajustar as regras de segurança (ex: `firestore.rules`) para permitir a operação `create` ou `write` na coleção de estudantes para o perfil de usuário correto. | P0 | CA01, CA02, CA03 |
| RF03 | Fazer o deploy e testar as novas regras de segurança no ambiente. | P0 | CA01 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Garantir que a regra de segurança não exponha dados ou permita escrita indiscriminada (ex: exigir que `request.auth != null` e, se necessário, validar escopo/papel do usuário). | P0 | CA03 |

### Dependências técnicas

- Acesso ao arquivo de regras de segurança local (ex: `firestore.rules`).
- Firebase CLI configurado para teste local e/ou deploy.

### Recursos necessários

- Acesso ao projeto do Firebase no ambiente onde o erro está ocorrendo.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que sou um usuário autenticado e autorizado, quando tento salvar um novo estudante na interface, então o Firebase aceita a requisição e salva o documento com sucesso.
- [x] **CA02:** Dado que tento salvar um estudante, quando a requisição é feita, então nenhum erro de "Missing or insufficient permissions" aparece no console.
- [x] **CA03:** Dado que não estou autenticado ou não tenho permissão, quando tento criar um estudante diretamente no banco, então a requisição é negada com erro de permissão.

## O que a atividade não inclui

- Alterações visuais ou de fluxo na interface de cadastro: motivo: o escopo desta atividade é restrito à camada de infraestrutura/regras de acesso (Firebase).

### Considerado para o futuro (P2)

- N/A

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Qualquer usuário logado pode criar estudantes, ou existe uma validação específica de permissão/papel baseada no ID do usuário ou tenant? | Dev | Sim | Qualquer usuário logado pode, mas ele é forçado a setar `teacherUid` como o seu próprio UID, atuando como tenant (restrição já existente `request.resource.data.teacherUid == request.auth.uid`). |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Cadastro com usuário autorizado | manual | CA01, CA02 | 1. Login com conta autorizada. 2. Cadastrar estudante e salvar. | Estudante salvo sem erros no console, registro visível no banco. |
| CT02 | Tentativa de cadastro sem login | integração | CA03 | 1. Fazer requisição de criação de estudante via script/API sem token auth. | Erro `Missing or insufficient permissions` retornado pelo Firebase. |

## URL Complementar

- Documentação técnica: N/A
- Protótipo / mockup: N/A
- Discussões relacionadas: N/A
- Referências de design: N/A
- Requisitos originais: N/A
- Issue / PR relacionado: N/A
