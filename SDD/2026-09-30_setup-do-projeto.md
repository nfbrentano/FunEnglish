# [CHORE] Setup do projeto (Next.js + Firebase + deploy)

> **Status:** Em andamento
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Criar a base técnica do projeto "Fun English", um site de atividades interativas de inglês para professores de ESL inspirado no Cool English. A base inclui repositório, framework web, estilização, integração com Firebase (Auth e Firestore), variáveis de ambiente, lint/format, testes e deploy contínuo no Firebase App Hosting.
- **Problema e evidência:** O diretório do projeto hoje contém apenas documentação (`CLAUDE.md`, `SDD/`). Nenhuma feature pode ser implementada sem a fundação técnica.
- **Impacto de não fazer:** Todas as demais specs ficam bloqueadas.
- **Para quem é destinado:** Dev.
- **História de usuário:** Como dev, quero um projeto configurado com framework, banco, auth e deploy automático, para começar a entregar features sem retrabalho de infraestrutura.
- **Como saberemos que deu certo:** `npm run dev`, `npm run build`, `npm run lint` e `npm test` executam sem erros; um push na branch principal publica o site numa URL pública em até 5 minutos; custo mensal de infraestrutura = R$ 0 dentro da cota gratuita do plano Blaze, com alerta de orçamento configurado.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Projeto Next.js (App Router) com TypeScript em modo `strict` | P0 | CA01 |
| RF02 | Tailwind CSS configurado com design tokens (cores, fontes, raios) em um único arquivo de tema | P0 | CA01 |
| RF03 | SDK do Firebase (client) inicializado a partir de variáveis de ambiente, com módulo único `lib/firebase.ts` | P0 | CA02 |
| RF04 | Firebase Admin SDK disponível apenas no servidor (`lib/firebase-admin.ts`) para leituras server-side e scripts de seed | P0 | CA02, CA05 |
| RF05 | Arquivo `.env.example` com todas as variáveis necessárias, sem valores reais | P0 | CA03 |
| RF06 | ESLint + Prettier configurados e script `lint` | P0 | CA01 |
| RF07 | Vitest + Testing Library para testes unitários/componentes; Playwright para e2e | P1 | CA04 |
| RF08 | Deploy automático no **Firebase App Hosting** (Next.js com SSR/ISR no Cloud Run) a cada push na branch `main`, configurado via `apphosting.yaml` | P0 | CA05 |
| RF09 | Firebase Emulator Suite (Auth + Firestore) configurado para desenvolvimento local | P1 | CA06 |
| RF10 | Arquivo `firestore.rules` versionado no repositório e publicado via Firebase CLI | P0 | CA07 |
| RF11 | Variável `NEXT_PUBLIC_SITE_URL` como única fonte da URL base (canônicos, sitemap, links de compartilhamento), definida no `apphosting.yaml` e apontando para o domínio padrão do App Hosting (`<backend>--<projeto>.<região>.hosted.app`) enquanto não houver domínio próprio | P0 | CA09 |
| RF12 | Repositório local inicializado e conectado a `https://github.com/nfbrentano/FunEnglish.git`, com `.gitignore` (Node, Next, `.env*`, `.DS_Store`, service accounts) | P0 | CA03 |
| RF13 | Admin SDK usa as credenciais padrão do ambiente (ADC) quando roda no App Hosting, dispensando chave de service account em produção | P0 | CA05 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Projeto Firebase no plano **Blaze** (exigido pelo App Hosting), operando dentro das cotas gratuitas; alerta de orçamento no Google Cloud (ex.: US$ 5/mês) e `maxInstances` limitado no `apphosting.yaml` para evitar custos inesperados | P0 | CA05, CA10 |
| RNF02 | Nenhuma credencial de service account commitada no repositório | P0 | CA03 |
| RNF03 | Rollout (build + deploy) concluído em < 10 min no App Hosting | P1 | CA05 |
| RNF04 | Node.js LTS (≥ 22.12) declarado em `package.json` (`engines`) e `.nvmrc` | P1 | CA01 |

### Dependências técnicas

- Nenhuma (primeira spec do roadmap).

### Recursos necessários

- Conta Google para criar o projeto Firebase, com o plano Blaze ativado (cartão cadastrado).
- Conexão do Firebase App Hosting com o GitHub (app do Firebase autorizado no repositório).
- Repositório pessoal no GitHub: https://github.com/nfbrentano/FunEnglish.git

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que o repositório foi clonado e `npm install` executado, quando rodo `npm run dev`, `npm run lint` e `npm run build`, então todos concluem sem erros e a página inicial abre em `http://localhost:3000`.
- [x] **CA02:** Dado que as variáveis de ambiente estão preenchidas, quando a aplicação inicia, então o Firebase é inicializado uma única vez (sem erro "Firebase App named '[DEFAULT]' already exists" no console).
- [x] **CA03:** Dado que um dev novo abre o projeto, quando consulta `.env.example` e o `README.md`, então encontra todas as variáveis necessárias e instruções de configuração, e nenhuma credencial real está presente no repositório.
- [x] **CA04:** Dado que existe um teste de exemplo, quando rodo `npm test`, então ele executa e passa.
- [ ] **CA05:** Dado que faço push na branch principal, quando o rollout do App Hosting termina, então o site fica acessível na URL pública `*.hosted.app`. _(pendente: criar o projeto Firebase no Blaze e o backend do App Hosting)_
- [ ] **CA06:** Dado que rodo `npm run emulators`, quando a aplicação local aponta para os emuladores, então leituras/escritas no Firestore e logins não afetam o projeto de produção. _(pendente: instalar Java 21+ para os emuladores)_
- [ ] **CA07:** Dado que as regras do Firestore foram publicadas, quando um cliente não autenticado tenta escrever em qualquer coleção, então a escrita é negada. _(pendente: teste escrito em `tests/emulator/` (`npm run test:emulator`); requer Java para rodar e `npm run deploy:rules` no projeto Firebase)_
- [x] **CA08 (negativo):** Dado que uma variável de ambiente obrigatória está ausente, quando a aplicação inicia, então é exibido um erro claro indicando qual variável falta (e não um erro genérico do Firebase).
- [x] **CA09:** Dado que troco `NEXT_PUBLIC_SITE_URL` para outro domínio, quando faço novo build, então canônicos, sitemap e links de compartilhamento passam a usar o novo domínio sem outras mudanças de código.
- [ ] **CA10:** Dado o projeto no plano Blaze, quando abro o Google Cloud Billing, então existe um alerta de orçamento ativo, e o `apphosting.yaml` limita `maxInstances`. _(pendente: `maxInstances` já está no `apphosting.yaml`; falta criar o alerta)_

## O que a atividade não inclui

- Implementação de telas ou features: motivo: cobertas por specs próprias.
- CI com GitHub Actions: motivo: baixo impacto agora; o App Hosting já faz o build a cada push.
- Ambientes de preview por PR: motivo: o App Hosting não os cria nativamente; pode-se criar um segundo backend (staging) no futuro.
- Monitoramento/observabilidade (Sentry etc.): motivo: prematuro.

### Considerado para o futuro (P2)

- GitHub Actions rodando lint + testes + e2e em cada PR.
- Backend de staging no App Hosting (branch `develop`) e GitHub Actions com lint + testes + e2e em cada PR.
- Firebase Storage para upload de mídia (disponível agora que o projeto está no Blaze).

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Nome final do produto e domínio (ex.: funenglish.com.br) | PO | Não | Ainda não haverá domínio próprio: usar "Fun English" e o domínio padrão `*.hosted.app` do App Hosting (configurável via `NEXT_PUBLIC_SITE_URL`) |
| D02 | Repositório no GitHub pessoal ou de organização? | PO | Não | Pessoal: https://github.com/nfbrentano/FunEnglish.git |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Build limpo | manual | CA01 | Clonar, `npm install`, `npm run lint && npm run build` | Sem erros nem warnings de tipo |
| CT02 | Inicialização única do Firebase | unit | CA02 | Importar `lib/firebase.ts` duas vezes | Mesma instância retornada |
| CT03 | Segredos fora do repo | manual | CA03 | `git grep -i "private_key"` | Nenhum resultado |
| CT04 | Teste de exemplo | unit | CA04 | `npm test` | 1 teste passa |
| CT05 | Deploy | manual | CA05 | Push na main | URL pública responde 200 |
| CT06 | Emuladores isolados | integração | CA06 | Criar doc com emulador ativo | Doc aparece só na UI do emulador |
| CT07 | Regras bloqueiam escrita anônima | integração | CA07 | `@firebase/rules-unit-testing`: set em `activities` sem auth | `PERMISSION_DENIED` |
| CT08 | Env ausente | unit | CA08 | Remover `NEXT_PUBLIC_FIREBASE_PROJECT_ID` e iniciar | Mensagem cita a variável faltante |
| CT09 | URL base configurável | unit | CA09 | Build com `NEXT_PUBLIC_SITE_URL=https://exemplo.com` | Sitemap e canônicos com `exemplo.com` |
| CT10 | Alerta de orçamento | manual | CA10 | Abrir Billing > Budgets & alerts | Orçamento com alertas em 50/90/100% |

## URL Complementar

- Documentação técnica: https://nextjs.org/docs · https://firebase.google.com/docs/web/setup · https://firebase.google.com/docs/app-hosting · https://firebase.google.com/pricing
- Protótipo / mockup: N/A — spec de infraestrutura.
- Discussões relacionadas: Decisão de stack: Firebase (Auth + Firestore) + Next.js, por não haver conta Supabase ativa. Hospedagem: GitHub Pages e Firebase Hosting (Spark) foram descartados por servirem só arquivos estáticos (sem ISR, rotas de servidor nem revalidação ao publicar pelo admin); Firebase App Hosting exige o plano Blaze. Primeiro se escolheu a Vercel Hobby; depois o PO decidiu hospedar tudo no Google: **Firebase App Hosting** (plano Blaze, com cota gratuita e alerta de orçamento).
- Referências de design: https://www.coolenglish.org/activities
- Requisitos originais: Pedido de criar um site semelhante ao Cool English.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
