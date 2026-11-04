# [CHORE] Migração da hospedagem web para GitHub Pages

> **Status:** Em andamento
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-11-04 · **Atualizada em:** 2026-11-04
> **Contexto:** Migração da hospedagem dos arquivos estáticos da web (frontend) do Firebase Hosting para o GitHub Pages (URL: `https://nfbrentano.github.io/FunEnglish`).

## Detalhes da Atividade

- **O que precisa ser feito:** Configurar o Next.js e o pipeline de CI/CD do GitHub Actions para publicar os arquivos estáticos exportados (`out/`) diretamente no GitHub Pages do repositório (`https://nfbrentano.github.io/FunEnglish`). Ajustar a configuração de `basePath` para suportar o subcaminho `/FunEnglish` no GitHub Pages sem quebrar a execução local no `localhost:3000`, incluir o arquivo `.nojekyll` para evitar bloqueio da pasta `_next` e garantir a resolução correta dos assets e rotas.
- **Problema e evidência:** Atualmente, a publicação do frontend estático depende de credenciais de serviço do Firebase Hosting (`FIREBASE_SERVICE_ACCOUNT`) no GitHub Actions. A centralização da hospedagem estática no GitHub Pages simplifica a infraestrutura de frontend, aproveita os recursos nativos do GitHub e mantém o Firebase dedicado ao banco de dados (Firestore), autenticação e storage.
- **Impacto de não fazer:** Dependência desnecessária de tokens e cotas de hospedagem no Firebase Hosting quando o projeto já é 100% estático e compatível com GitHub Pages.
- **Para quem é destinado:** Desenvolvedores, mantenedores do projeto, professores e alunos que acessam o site.
- **História de usuário:** Como mantenedor do Fun English, quero que o frontend do site seja compilado e publicado automaticamente no GitHub Pages a cada commit na `main`, para ter uma hospedagem estável, gratuita e integrada ao repositório GitHub.
- **Como saberemos que deu certo:** Build estático executado com sucesso com `basePath` configurado; presença de `.nojekyll` em `out/`; workflow do GitHub Actions com os passos `actions/upload-pages-artifact` e `actions/deploy-pages`; todos os testes unitários passando.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | **Configuração de `basePath` dinâmico:** Suportar `basePath: "/FunEnglish"` no `next.config.ts` quando a variável de ambiente `GITHUB_PAGES=true` ou `NEXT_PUBLIC_BASE_PATH` for definida, mantendo vazio em desenvolvimento local. | P0 | CA01, CA04 |
| RF02 | **Inclusão do arquivo `.nojekyll`:** Garantir que o arquivo `.nojekyll` seja copiado para a raiz de `out/` durante o build para que o GitHub Pages não ignore pastas iniciadas com underscore (`_next`). | P0 | CA02 |
| RF03 | **Atualização do GitHub Actions (`deploy.yml`):** Configurar permissões de `pages: write` e `id-token: write`, e adicionar steps de `actions/configure-pages`, `actions/upload-pages-artifact` e `actions/deploy-pages`. | P0 | CA03 |
| RF04 | **Compatibilidade com assets e URLs:** Criar utilitário `withBasePath` em `src/lib/site.ts` para garantir que caminhos de imagens e referências estáticas respeitem o prefixo `/FunEnglish`. | P0 | CA01 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | **Sem regressão local:** `npm run dev` e testes unitários devem continuar rodando normalmente na raiz (`/`) sem exigir prefixo `/FunEnglish`. | P0 | CA04 |
| RNF02 | **Compatibilidade contínua com Firebase:** As chamadas de Firestore, Auth e Storage via cliente web devem continuar operando sem alterações. | P0 | CA01 |

### Dependências técnicas

- Arquivo de configuração: `next.config.ts`.
- Workflow GitHub Actions: `.github/workflows/deploy.yml`.
- Arquivo público: `public/.nojekyll`.
- Utilitários do site: `src/lib/site.ts` e `src/lib/site-images.ts`.

### Recursos necessários

- Acesso às configurações do repositório no GitHub para selecionar a fonte de deploy do GitHub Pages (GitHub Actions).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que o build é executado com `GITHUB_PAGES=true`, quando o Next.js gera os arquivos estáticos, então as tags `<link>` e scripts possuem o prefixo `/FunEnglish/_next/...` e links internos apontam para `/FunEnglish/...`.
- [ ] **CA02:** Dado que o comando `npm run build` é executado, quando a pasta `out/` é inspecionada, então o arquivo `out/.nojekyll` existe na raiz.
- [ ] **CA03:** Dado o arquivo `.github/workflows/deploy.yml`, quando inspecionado, então ele contém o ambiente `github-pages`, permissões `pages: write`, `id-token: write` e o step `actions/deploy-pages@v4`.
- [ ] **CA04:** Dado o ambiente de desenvolvimento local (`npm run test` e `npm run typecheck`), quando os comandos são executados sem `GITHUB_PAGES`, então 100% dos testes passam e nenhum caminho é quebrado.

## O que a atividade não inclui

- Migração ou alteração do banco de dados Cloud Firestore ou das regras de segurança.
- Criação de domínio customizado pago (DNS externo fora do escopo imediato).

### Considerado para o futuro (P2)

- Configuração de domínio customizado (CNAME) caso o usuário registre um domínio próprio.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O nome do repositório no GitHub Pages tem letras maiúsculas (`/FunEnglish`)? | Dev | Não | Sim, no GitHub URLs respeitam o nome do repositório `FunEnglish`. A variável `NEXT_PUBLIC_BASE_PATH` permite sobrescrever facilmente se necessário. |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Verificação de `.nojekyll` | Integração / Build | CA02 | Executar build e verificar `out/.nojekyll` | Arquivo presente |
| CT02 | Verificação de `basePath` condicional | Unit | CA01, CA04 | Testar função `resolveBasePath` | Retorna `/FunEnglish` quando ativo e vazio quando desativado |
| CT03 | Suite de testes unitários | Unit | CA04 | Executar `npm run test` | 100% dos testes passam |

## URL Complementar

- Documentação técnica: https://nextjs.org/docs/app/building-your-application/deploying/static-exports#github-pages
- Protótipo / mockup: N/A
- Discussões relacionadas: N/A
- Referências de design: N/A
- Requisitos originais: Solicitação do usuário para migrar a hospedagem web para o GitHub Pages (`https://nfbrentano.github.io/FunEnglish`).
- Issue / PR relacionado: N/A
