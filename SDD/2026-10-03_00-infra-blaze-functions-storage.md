# [CHORE] Infraestrutura do plano Blaze: Cloud Functions, Storage, Realtime Database e e-mail

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-03 · **Atualizada em:** 2026-10-03  
> **Ordem de implementação:** 00 (sequência 00 a 11) · **Depende de:** — · **Por quê nesta posição:** Prepara a base de servidor (Functions), arquivos (Storage), tempo real (RTDB) e e-mail que as specs 03, 07, 08, 09, 10 e 11 usam; feita antes, evita que cada spec monte sua própria infraestrutura

## Detalhes da Atividade

- **O que precisa ser feito:** Com o projeto `fun-english-972a2` no plano **Blaze** (2026-10-03), configurar no repositório os recursos que o plano Spark não oferecia:
  - **Cloud Functions** (TypeScript) para operações confiáveis;
  - **Cloud Storage** para imagens;
  - **Realtime Database** para a sala ao vivo;
  - **envio de e-mail**.

  Inclui emuladores, regras com testes, scripts de deploy e proteção de custos (alerta de orçamento e App Check).
- **Problema e evidência:** As specs de 2026-10-03 aceitaram limitações por falta de backend:
  - o PIN e a nota do homework são conferidos no navegador;
  - o convite do portal depende de regras complexas;
  - não há e-mail;
  - a lousa não guarda imagens na nuvem;
  - a sala ao vivo ficava limitada a 100 conexões simultâneas.

  Hoje o repositório só tem `firestore.rules` e hosting estático (`firebase.json`).
- **Impacto de não fazer:** Cada feature criaria a sua parte de infraestrutura de um jeito diferente, sem testes de regras nem controle de custo. Com o Blaze, um bug pode virar cobrança.
- **Para quem é destinado:** Time de desenvolvimento (base técnica); indiretamente, professores e alunos.
- **História de usuário:** Como dev, quero Functions, Storage, Realtime Database e e-mail configurados, testáveis no emulador e com teto de gastos monitorado, para implementar as features de aula sem retrabalho e sem sustos na fatura.
- **Como saberemos que deu certo:**
  - `npm run test:emulator` roda as regras de Firestore, Storage e RTDB e as Functions no emulador, com 0 falhas;
  - o deploy de cada recurso é feito por um único script;
  - existe alerta de orçamento configurado;
  - a fatura do primeiro mês fica em US$ 0–5.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Pasta `functions/` (TypeScript, Node 22, Functions 2ª geração) com build, lint e testes próprios, e um codebase registrado no `firebase.json`. As Functions ficam na mesma região do Firestore (ver D01) | P0 | CA01 |
| RF02 | Função de exemplo `health` (callable) e um helper compartilhado de autenticação/validação com `zod` (o mesmo usado no app) | P0 | CA01 |
| RF03 | **Cloud Storage** configurado com `storage.rules` na raiz e no `firebase.json`; regras iniciais negando tudo (cada spec abre só o que precisa, como já é feito no Firestore) | P0 | CA02 |
| RF04 | **Realtime Database** criado na mesma região, com `database.rules.json` negando tudo por padrão | P0 | CA02 |
| RF05 | **Anonymous Auth** ativado (usado na sala ao vivo e no homework) | P0 | |
| RF06 | **E-mail**: extensão "Trigger Email from Firestore" (coleção `mail`, só escrita pelas Functions) com um provedor SMTP, remetente `no-reply@` do domínio do site, e templates em inglês com versões HTML e texto. O provedor está na D02 | P0 | CA03 |
| RF07 | **App Check** (reCAPTCHA Enterprise) obrigatório nas callables públicas (homework, sala ao vivo, convite) e no Storage | P1 | CA04 |
| RF08 | Emuladores no `firebase.json`: functions, storage, database e auth, além dos atuais. `npm run emulators` sobe todos, e `test:emulator` passa a incluir os testes de regras de Storage e RTDB | P0 | CA05 |
| RF09 | Scripts: `deploy:functions`, `deploy:storage-rules`, `deploy:database-rules`; `deploy:rules` passa a publicar Firestore, Storage e RTDB | P0 | CA06 |
| RF10 | **Proteção de custos**: alerta de orçamento no Google Cloud (50%, 90% e 100% de US$ 10/mês, para o e-mail do dono); `maxInstances` em todas as Functions (padrão 10); regra de ciclo de vida do bucket para apagar `tmp/` após 1 dia | P0 | CA07 |
| RF11 | Documentar no README: como rodar os emuladores, como fazer deploy de cada parte, as variáveis e segredos (Secret Manager para a chave SMTP) e o que fazer se o alerta de orçamento disparar | P1 | |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | O site continua `output: "export"` no Firebase Hosting; as Functions são chamadas pelo SDK (`httpsCallable`) e não por rotas do Next | P0 | |
| RNF02 | Segredos (chave SMTP) ficam só no Secret Manager (`defineSecret`), nunca no repositório nem em `NEXT_PUBLIC_*` | P0 | CA03 |
| RNF03 | Toda callable valida a entrada com `zod`, confere `request.auth` quando exigido e devolve erros `HttpsError` com códigos padronizados (`invalid-argument`, `permission-denied`, `resource-exhausted`) | P0 | |
| RNF04 | Rate limit nas callables públicas (contador por IP/uid em Firestore ou RTDB, com janela de 1 min), para evitar abuso e custo | P1 | |
| RNF05 | Cold start aceitável: callables de uso ao vivo com `minInstances: 0` na v1; medir o p95 e só então decidir manter instâncias quentes (que custam) | P1 | |
| RNF06 | CI (se houver) roda o build e os testes de `functions/` | P1 | |

### Dependências técnicas

- Projeto `fun-english-972a2` no plano Blaze (feito em 2026-10-03).
- Acesso de Owner ao Google Cloud para orçamento, Secret Manager, reCAPTCHA Enterprise e extensão de e-mail.
- `firebase-tools` atualizado; `firebase-admin` já está nas dependências.

### Recursos necessários

- Conta no provedor de e-mail (D02) e domínio verificado (registros SPF/DKIM no DNS).
- Definição do valor do orçamento mensal.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado o repositório configurado, quando rodo `npm run emulators` e chamo a callable `health` pelo app local, então recebo `{ ok: true }`; e a mesma chamada funciona em produção depois do `deploy:functions`.
- [ ] **CA02 (negativo):** Dado as regras iniciais, quando um usuário logado tenta ler ou escrever qualquer caminho no Storage ou no Realtime Database, então a operação é negada.
- [ ] **CA03:** Dado um documento criado em `mail` por uma Function, quando a extensão o processa, então o e-mail chega à caixa de teste com o remetente do domínio, e nenhum segredo aparece no repositório nem no bundle do site.
- [ ] **CA04 (negativo):** Dado o App Check obrigatório, quando a callable pública é chamada por um script sem token de App Check, então a chamada é recusada.
- [ ] **CA05:** Dado os emuladores, quando rodo `npm run test:emulator`, então os testes de regras do Firestore, do Storage e do RTDB e os testes das Functions rodam e passam.
- [ ] **CA06:** Dado uma alteração só em `storage.rules`, quando rodo `npm run deploy:storage-rules`, então só as regras do Storage são publicadas.
- [ ] **CA07:** Dado o orçamento configurado, quando consulto o Google Cloud Billing, então existe o alerta de US$ 10/mês com limiares de 50%, 90% e 100%, e todas as Functions têm `maxInstances` definido.

## O que a atividade não inclui

- As Functions de cada feature (homework, convite, resumo por e-mail etc.): motivo: cada uma fica na sua spec; aqui só a base.
- Migrar o site para SSR (Next no App Hosting): motivo: desnecessário; a exportação estática continua atendendo.
- Desligamento automático da cobrança ao atingir o orçamento: motivo: complexo e arriscado (derruba o site); na v1 bastam os alertas e o `maxInstances`.
- Migração para o Supabase: motivo: decisão de 2026-10-03 de permanecer no Firebase.

### Considerado para o futuro (P2)

- Envio de e-mails em lote (newsletter para professores).
- Painel de custos no `/admin`.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Qual a região do Firestore do projeto (`southamerica-east1`, `us-central1` ou `nam5`)? As Functions, o RTDB e o Storage devem ficar na mesma região ou na mais próxima | Dev | Sim | Conferir no console |
| D02 | Provedor SMTP: Resend, SendGrid ou Brevo (todos com plano gratuito para o volume inicial)? | PO / Dev | Sim | Sugestão: Resend |
| D03 | Valor do alerta de orçamento (sugestão US$ 10/mês)? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Callable `health` | integração (emulador) + manual (produção) | CA01 | Chamar pelo SDK | `{ ok: true }` |
| CT02 | Regras fechadas | integração (rules) | CA02 | Ler e escrever no Storage e no RTDB | Negado |
| CT03 | E-mail | manual | CA03 | Criar doc em `mail` via Function | E-mail recebido; segredo fora do bundle |
| CT04 | App Check | manual | CA04 | Chamar sem token | Recusado |
| CT05 | Suíte de emulador | integração | CA05 | `npm run test:emulator` | Tudo verde |
| CT06 | Deploy isolado | manual | CA06 | `deploy:storage-rules` | Só o Storage é publicado |
| CT07 | Orçamento | manual | CA07 | Conferir o Billing | Alerta e limiares configurados |

## URL Complementar

- Documentação técnica: `firebase.json`, `firestore.rules`, `.firebaserc`; docs do Firebase sobre Functions 2ª geração, Storage Security Rules, Realtime Database Rules, App Check e a extensão "Trigger Email".
- Protótipo / mockup: N/A, infraestrutura sem interface.
- Discussões relacionadas: Decisões de 2026-10-03: permanecer no Firebase e ativar o Blaze.
- Referências de design: N/A.
- Requisitos originais: Limitações registradas nas specs 03, 07, 08, 09 e 10 de 2026-10-03.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
