# [FIX] Correção do pipeline de CI/CD e suporte a basePath do GitHub Pages

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** Equipe · **Criada em:** 2026-11-05 · **Atualizada em:** 2026-11-05

## Detalhes da Atividade

- **O que precisa ser feito:** Corrigir as causas de falha do deploy para o GitHub Pages (`https://nfbrentano.github.io/FunEnglish/`) e garantir a resolução correta de todas as imagens em subcaminho:
  1. Isolar as variáveis de ambiente `GITHUB_PAGES`, `NEXT_PUBLIC_BASE_PATH` e `NEXT_PUBLIC_SITE_URL` apenas para o step `npm run build` no workflow `.github/workflows/deploy.yml`, evitando que interfiram no passo de testes unitários (`npm test`).
  2. Remover o workflow conflitante e incompleto `.github/workflows/nextjs.yml`, gerado pelo assistente do GitHub.
  3. Aplicar o utilitário `withBasePath()` nas tags de imagem que ainda não o utilizavam (`src/components/catalog/activity-thumbnail.tsx` e `src/components/admin/content/image-fields.tsx`), corrigindo links quebrados de miniaturas sob `/FunEnglish`.
- **Problema e evidência:** O site retorna HTTP 404 atualmente. A inspeção dos logs do GitHub Actions demonstrou que o job `deploy` falha no step `Run npm test` porque a injeção global de `NEXT_PUBLIC_BASE_PATH: "/FunEnglish"` quebrou as asserções de [`tests/unit/site.test.ts`](tests/unit/site.test.ts) e [`tests/unit/player/images.test.tsx`](tests/unit/player/images.test.tsx), que esperam comportamento padrão local. Adicionalmente, o arquivo `nextjs.yml` criava concorrência de deploys no Pages com falhas de versão do Node.js.
- **Impacto de não fazer:** O site Fun English permanece fora do ar (HTTP 404) e nenhuma atualização na branch `main` consegue ser publicada.
- **Para quem é destinado:** Mantenedores, professores e alunos que acessam a plataforma web.
- **História de usuário:** Como mantenedor do Fun English, quero que o pipeline de deploy no GitHub Actions seja concluído com sucesso e sirva todos os assets estáticos corretamente em subpasta, para que o site esteja estável e no ar no GitHub Pages.
- **Como saberemos que deu certo:** Pipeline do GitHub Actions concluída com sucesso (status verde em lint, test, build e deploy); ausência de arquivos duplicados de workflow; 100% dos testes unitários passando localmente e no CI; imagens do catálogo com prefixo `/FunEnglish` quando construídas para Pages.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | **Isolamento de variáveis no CI (`deploy.yml`):** Mover as variáveis `GITHUB_PAGES`, `NEXT_PUBLIC_BASE_PATH` e `NEXT_PUBLIC_SITE_URL` para o escopo específico do comando `npm run build`, permitindo que os testes unitários rodem em ambiente padrão limpo. | P0 | CA01, CA04 |
| RF02 | **Remoção de workflow conflitante (`nextjs.yml`):** Deletar o arquivo `.github/workflows/nextjs.yml` para evitar conflito de concorrência no ambiente `github-pages`. | P0 | CA02 |
| RF03 | **Suporte a `basePath` em thumbnails:** Usar `withBasePath` no atributo `src` de `<Image>` em `src/components/catalog/activity-thumbnail.tsx`. | P0 | CA03 |
| RF04 | **Suporte a `basePath` em previews de imagem do admin:** Garantir que `src/components/admin/content/image-fields.tsx` resolva caminhos estáticos locais com `withBasePath`. | P1 | CA03 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | **Sem regressão em ambiente de desenvolvimento:** `npm run dev` e testes sem `GITHUB_PAGES` continuam funcionando sem prefixo `/FunEnglish`. | P0 | CA04 |
| RNF02 | **Integridade de testes:** 100% dos testes unitários devem continuar passando. | P0 | CA04 |

### Dependências técnicas

- Workflows: `.github/workflows/deploy.yml` e `.github/workflows/nextjs.yml`.
- Componentes: `src/components/catalog/activity-thumbnail.tsx` e `src/components/admin/content/image-fields.tsx`.
- Utilitário: `src/lib/site.ts`.

### Recursos necessários

- Acesso ao repositório Git para versionamento e abertura de PR.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado o arquivo `.github/workflows/deploy.yml`, quando inspecionado, então as variáveis `GITHUB_PAGES`, `NEXT_PUBLIC_BASE_PATH` e `NEXT_PUBLIC_SITE_URL` estão associadas ao step `npm run build` e não ao job `deploy`.
- [x] **CA02:** Dado o repositório, quando a pasta `.github/workflows/` é verificada, então o arquivo `nextjs.yml` foi excluído.
- [x] **CA03:** Dado o build estático gerado com `GITHUB_PAGES=true`, quando as tags de imagem em `out/` são inspecionadas, então as miniaturas das atividades possuem o prefixo `/FunEnglish/images/...`.
- [x] **CA04:** Dado o comando `npm test`, quando executado em ambiente padrão, então 100% dos testes unitários passam sem falhas.

## O que a atividade não inclui

- Alteração de regras de backend ou Cloud Functions do Firebase. Motivo: Fora do escopo do frontend/deploy web.
- Configuração de domínio customizado (CNAME). Motivo: Futuro/P2.

### Considerado para o futuro (P2)

- Domínio personalizado próprio caso o projeto adquira um domínio `.com` ou `.com.br`.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O setup de Pages na interface do GitHub precisa de alteração? | Dev | Não | Não, basta manter a fonte como "GitHub Actions". |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Execução da suite de testes | Unit | CA04 | Rodar `npm test` | 100% dos testes passam |
| CT02 | Ausência de `nextjs.yml` | Integração | CA02 | Verificar se `.github/workflows/nextjs.yml` existe | Não deve existir |
| CT03 | Build estático com basePath | Integração / Build | CA01, CA03 | Rodar `GITHUB_PAGES=true NEXT_PUBLIC_BASE_PATH=/FunEnglish npm run build` e inspecionar `out/index.html` | Imagens e scripts com `/FunEnglish/` |

## URL Complementar

- Documentação técnica: https://nextjs.org/docs/app/building-your-application/deploying/static-exports#github-pages
- Protótipo / mockup: N/A
- Discussões relacionadas: N/A
- Referências de design: N/A
- Requisitos originais: Validação e correção do uso do GitHub Pages solicitado pelo usuário.
- Issue / PR relacionado: N/A
