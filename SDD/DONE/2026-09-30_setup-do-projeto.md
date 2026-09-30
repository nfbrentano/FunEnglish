# [CHORE] Setup do projeto (Next.js + Firebase + deploy)

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Criar a base técnica do projeto "Fun English", um site de atividades interativas de inglês para professores de ESL inspirado no Cool English. A base inclui repositório, framework web, estilização, integração com Firebase (Auth e Firestore), variáveis de ambiente, lint/format, testes e deploy contínuo no Firebase Hosting (site estático, plano Spark gratuito).
- **Problema e evidência:** O diretório do projeto hoje contém apenas documentação (`CLAUDE.md`, `SDD/`). Nenhuma feature pode ser implementada sem a fundação técnica.
- **Impacto de não fazer:** Todas as demais specs ficam bloqueadas.
- **Para quem é destinado:** Dev.
- **História de usuário:** Como dev, quero um projeto configurado com framework, banco, auth e deploy automático, para começar a entregar features sem retrabalho de infraestrutura.
- **Como saberemos que deu certo:** `npm run dev`, `npm run build`, `npm run lint` e `npm test` executam sem erros; um push na branch principal publica o site numa URL pública em até 5 minutos; custo mensal de infraestrutura = R$ 0 (plano Spark, sem cartão cadastrado).

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Projeto Next.js (App Router) com TypeScript em modo `strict` | P0 | CA01 |
| RF02 | Tailwind CSS configurado com design tokens (cores, fontes, raios) em um único arquivo de tema | P0 | CA01 |
| RF03 | SDK do Firebase (client) inicializado a partir de variáveis de ambiente, com módulo único `lib/firebase.ts` | P0 | CA02 |
| RF04 | Firebase Admin SDK disponível apenas para scripts Node (`src/lib/firebase-admin/core.ts`: seed, set-admin); o site nunca o usa em runtime | P0 | CA02 |
| RF05 | Arquivo `.env.example` com todas as variáveis necessárias, sem valores reais | P0 | CA03 |
| RF06 | ESLint + Prettier configurados e script `lint` | P0 | CA01 |
| RF07 | Vitest + Testing Library para testes unitários/componentes; Playwright para e2e | P1 | CA04 |
| RF08 | Site gerado como **export estático** do Next.js (`output: "export"` → pasta `out/`) e publicado no **Firebase Hosting** via GitHub Actions a cada push na `main`, com rebuild diário agendado e disparo manual | P0 | CA05 |
| RF09 | Firebase Emulator Suite (Auth + Firestore) configurado para desenvolvimento local | P1 | CA06 |
| RF10 | Arquivo `firestore.rules` versionado no repositório e publicado via Firebase CLI | P0 | CA07 |
| RF11 | Variável `NEXT_PUBLIC_SITE_URL` como única fonte da URL base (canônicos, sitemap, links de compartilhamento), definida como variável do GitHub Actions e apontando para o domínio padrão do Firebase Hosting (`<projeto>.web.app`) enquanto não houver domínio próprio | P0 | CA09 |
| RF12 | Repositório local inicializado e conectado a `https://github.com/nfbrentano/FunEnglish.git`, com `.gitignore` (Node, Next, `.env*`, `.DS_Store`, service accounts) | P0 | CA03 |
| RF13 | Preview por pull request em um canal temporário do Firebase Hosting (expira em 7 dias), com a URL comentada no PR | P1 | CA10 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Tudo no plano gratuito **Spark**: Auth, Firestore e Hosting (10 GB de armazenamento, 360 MB/dia de transferência); sem Cloud Functions, Storage nem servidor Node em runtime | P0 | CA05 |
| RNF02 | Nenhuma credencial de service account commitada no repositório | P0 | CA03 |
| RNF03 | Workflow de deploy (lint + testes + build + deploy) concluído em < 10 min | P1 | CA05 |
| RNF04 | Node.js LTS (≥ 22.12) declarado em `package.json` (`engines`) e `.nvmrc` | P1 | CA01 |

### Dependências técnicas

- Nenhuma (primeira spec do roadmap).

### Recursos necessários

- Conta Google para criar o projeto Firebase (plano Spark).
- No GitHub: secret `FIREBASE_SERVICE_ACCOUNT` (conta de serviço com papel de deploy no Hosting) e variables `NEXT_PUBLIC_*` do repositório.
- Repositório pessoal no GitHub: https://github.com/nfbrentano/FunEnglish.git

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que o repositório foi clonado e `npm install` executado, quando rodo `npm run dev`, `npm run lint` e `npm run build`, então todos concluem sem erros e a página inicial abre em `http://localhost:3000`.
- [x] **CA02:** Dado que as variáveis de ambiente estão preenchidas, quando a aplicação inicia, então o Firebase é inicializado uma única vez (sem erro "Firebase App named '[DEFAULT]' already exists" no console).
- [x] **CA03:** Dado que um dev novo abre o projeto, quando consulta `.env.example` e o `README.md`, então encontra todas as variáveis necessárias e instruções de configuração, e nenhuma credencial real está presente no repositório.
- [x] **CA04:** Dado que existe um teste de exemplo, quando rodo `npm test`, então ele executa e passa.
- [x] **CA05:** Dado que faço push na branch principal, quando o workflow "Deploy" termina, então o site fica acessível na URL pública `*.web.app`.
- [x] **CA06:** Dado que rodo `npm run emulators`, quando a aplicação local aponta para os emuladores, então leituras/escritas no Firestore e logins não afetam o projeto de produção.
- [x] **CA07:** Dado que as regras do Firestore foram publicadas, quando um cliente não autenticado tenta escrever em qualquer coleção, então a escrita é negada.
- [x] **CA08 (negativo):** Dado que uma variável de ambiente obrigatória está ausente, quando a aplicação inicia, então é exibido um erro claro indicando qual variável falta (e não um erro genérico do Firebase).
- [x] **CA09:** Dado que troco `NEXT_PUBLIC_SITE_URL` para outro domínio, quando faço novo build, então canônicos, sitemap e links de compartilhamento passam a usar o novo domínio sem outras mudanças de código.
- [x] **CA10:** Dado um pull request aberto no repositório, quando o workflow "Preview" termina, então o PR recebe um comentário com a URL de preview, e a versão de produção não muda.

## O que a atividade não inclui

- Implementação de telas ou features: motivo: cobertas por specs próprias.
- Renderização no servidor (SSR/ISR, rotas de API, proxy): motivo: o plano Spark só hospeda arquivos estáticos; dados novos chegam pelo cliente (Firestore) e pelo rebuild diário.
- e2e no CI: motivo: baixo impacto agora; lint e testes unitários já rodam antes de cada deploy.
- Monitoramento/observabilidade (Sentry etc.): motivo: prematuro.

### Considerado para o futuro (P2)

- GitHub Actions rodando lint + testes + e2e em cada PR.
- Migrar para Vercel ou Firebase App Hosting (Blaze) se o site precisar de SSR/ISR, sem mudar o código das páginas.
- Firebase Storage para upload de mídia (exige Blaze).
- e2e (Playwright) no CI.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Nome final do produto e domínio (ex.: funenglish.com.br) | PO | Não | Ainda não haverá domínio próprio: usar "Fun English" e o domínio padrão `*.web.app` do Firebase Hosting (configurável via `NEXT_PUBLIC_SITE_URL`) |
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
| CT10 | Preview de PR | manual | CA10 | Abrir PR de teste | Comentário com URL `--pr-*.web.app`; produção intacta |

## URL Complementar

- Documentação técnica: https://nextjs.org/docs · https://firebase.google.com/docs/web/setup · https://firebase.google.com/docs/hosting/github-integration · https://nextjs.org/docs/app/guides/static-exports · https://firebase.google.com/pricing
- Protótipo / mockup: N/A — spec de infraestrutura.
- Discussões relacionadas: Stack: Firebase (Auth + Firestore) + Next.js, por não haver conta Supabase ativa. Hospedagem: depois de avaliar Vercel Hobby, GitHub Pages e Firebase App Hosting (Blaze), o PO decidiu ficar no plano **Spark** com **Firebase Hosting estático**. As limitações de um export estático (sem ISR, rotas de servidor nem proxy) são compensadas com: índice `catalog/index` lido no cliente, shell do player para atividades novas, guardas de rota no cliente e rebuild diário via GitHub Actions.
- Referências de design: https://www.coolenglish.org/activities
- Requisitos originais: Pedido de criar um site semelhante ao Cool English.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish · Preview validado no PR #1
