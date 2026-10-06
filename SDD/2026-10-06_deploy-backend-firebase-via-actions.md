# [CHORE] Deploy de functions e regras do Firebase via GitHub Actions

> **Status:** Em andamento
> **Autor:** Natanael Brentano (com Claude) · **Revisor:** · **Criada em:** 2026-10-06 · **Atualizada em:** 2026-10-06

## Detalhes da Atividade

- **O que precisa ser feito:** Publicar automaticamente, a cada push na `main`, o "backend" do Firebase: Cloud Functions, regras e índices do Firestore, regras do Storage e regras do Realtime Database.
- **Problema e evidência:** O workflow `Deploy` só publica o Hosting (`FirebaseExtended/action-hosting-deploy`). Functions e regras dependem de `npm run deploy:functions` / `deploy:rules` rodados à mão. Ex.: a correção de `functions/src/billing.ts` e `booking.ts` (commit e787cf2) está na `main`, mas não em produção.
- **Impacto de não fazer:** Produção fica com site novo e backend antigo (regras/functions desatualizadas), causando erros de permissão ou callables inexistentes.
- **Para quem é destinado:** Dev/mantenedor do projeto.
- **História de usuário:** Como dev, quero que o push na `main` publique functions e regras, para não esquecer deploys manuais.
- **Como saberemos que deu certo:** O job `deploy-backend` termina verde e `firebase functions:list` mostra as functions do commit atual.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Job `deploy-backend` em `deploy.yml` roda `firebase deploy --only functions,firestore:rules,firestore:indexes,storage,database` no projeto de produção. | P0 | CA01 |
| RF02 | O job só roda depois do job `deploy` (lint, testes e builds já aprovados) e nunca roda se ele falhar. | P0 | CA02 |
| RF03 | O job só roda com a variável de repositório `DEPLOY_BACKEND` = `true` (liga/desliga sem mudar código). | P0 | CA03 |
| RF04 | Não roda no rebuild diário agendado (`schedule`): ele existe só para o Hosting. | P1 | CA04 |
| RF05 | README documenta as permissões extras do service account e como ligar. | P0 | CA01 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Falha no backend não impede o deploy do Hosting (jobs separados). | P0 | CA05 |
| RNF02 | Usa o `firebase-tools` fixado no `package-lock.json` e não interativo (`--non-interactive --force`). | P0 | CA01 |

### Dependências técnicas

- `firebase.json` (functions com `predeploy` de build, firestore, storage, database).
- `firebase-tools` em `devDependencies`.
- `google-github-actions/auth` para autenticar com o JSON do service account.

### Recursos necessários

- Papéis IAM extras no service account do secret `FIREBASE_SERVICE_ACCOUNT` (ver README).
- Variável `DEPLOY_BACKEND=true` em GitHub > Settings > Secrets and variables > Actions > Variables.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado `DEPLOY_BACKEND=true` e o service account com os papéis, quando há push na `main`, então functions, regras e índices são publicados e o job fica verde.
- [ ] **CA02:** Dado que lint ou testes falham no job `deploy`, quando o workflow roda, então `deploy-backend` não executa.
- [x] **CA03:** Dado que `DEPLOY_BACKEND` não existe, quando há push na `main`, então `deploy-backend` aparece como *skipped* e o deploy do Hosting segue normal.
- [ ] **CA04:** Dado o rebuild diário agendado, quando o workflow roda, então `deploy-backend` é *skipped*.
- [ ] **CA05:** Dado que falta uma permissão IAM, quando `deploy-backend` falha, então o Hosting já foi publicado pelo job `deploy`.

## O que a atividade não inclui

- Deploy do backend em preview de PR: motivo: functions/regras não têm canal de preview; publicaria em produção.
- Conceder os papéis IAM: motivo: alteração de segurança na conta GCP, feita pelo dono do projeto.
- Workload Identity Federation (sem chave JSON): motivo: o projeto já usa chave JSON; migração é outra iniciativa.

### Considerado para o futuro (P2)

- Filtrar por caminhos alterados (`functions/**`, `*.rules`) para pular o deploy quando nada do backend mudou.
- Migrar para Workload Identity Federation.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D02 | Quais papéis faltaram no primeiro run? | dev | Não | `roles/firebasestorage.viewer` (`firebasestorage.defaultBucket.get`, run 37487215629). |
| D01 | Usar o mesmo service account do Hosting ou um novo só para o backend? | dev | Não | Mesmo (menos segredos); papéis listados no README. |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Backend ligado | manual | CA01 | Definir `DEPLOY_BACKEND=true`, rodar Deploy por `workflow_dispatch` | Job verde; `firebase functions:list` atualizado |
| CT02 | Testes quebrados | manual | CA02 | Observar um run com falha em `npm test` | `deploy-backend` não executa |
| CT03 | Backend desligado | manual | CA03 | Push sem a variável | `deploy-backend` *skipped*, Hosting publicado |
| CT04 | Rebuild diário | manual | CA04 | Observar o run das 06:00 UTC | `deploy-backend` *skipped* |
| CT05 | Permissão faltando | manual | CA05 | Primeiro run antes de conceder papéis | Job falha nomeando a permissão; site publicado |

## URL Complementar

- Documentação técnica: https://firebase.google.com/docs/cli#cli-ci-systems
- Protótipo / mockup: N/A
- Discussões relacionadas: N/A
- Referências de design: N/A
- Requisitos originais: N/A
- Issue / PR relacionado: commit e787cf2 (correção das functions ainda não publicada)
