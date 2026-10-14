# [FIX] Resolução de Falha do Build Turbopack com Google Fonts

> **Status:** Concluída
> **Autor:** Antigravity · **Revisor:** Natanael Brentano · **Criada em:** 2026-10-14 · **Atualizada em:** 2026-10-14

## Detalhes da Atividade

- **O que precisa ser feito:** Substituir o carregamento remoto via `next/font/google` da fonte `Cormorant_Garamond` por self-hosting local via `next/font/local` (`src/app/fonts/cormorant-garamond.woff2`), eliminando o erro de parser de query do Turbopack (`next/font/google queries have exactly one entry`) durante o build em CI/GitHub Actions.
- **Problema e evidência:** No workflow de deploy do GitHub Actions (`deploy.yml`), a etapa `npm run build` que executa `next build` com Turbopack falha com o erro:
  ```
  Error: Turbopack build failed with 15 errors:
  [next]/internal/font/google/cormorant_garamond_fd0a5a2d.module.css:7:8
  Error: Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
  next/font/google queries have exactly one entry
  ```
  Isso ocorre porque respostas da API do Google Fonts para o User-Agent do runner Linux retornam URLs com parâmetros (`&`) que quebram o parser interno em Rust do Turbopack.
- **Impacto de não fazer:** O pipeline de CI e de deploy diário em produção (`main`) quebra no GitHub Actions, bloqueando deploys automáticos no Firebase Hosting.
- **Para quem é destinado:** Usuários e desenvolvedores do Fun English, mantendo o pipeline de CI/CD 100% verde e estável.
- **História de usuário:** Como mantenedor do projeto, quero que o build de produção (`npm run build`) seja determinístico, offline e passe sem erros tanto em desenvolvimento local quanto nos runners do GitHub Actions.
- **Como saberemos que deu certo:** `npm run build` executa sem erros com Turbopack localmente e no GitHub Actions, a fonte `Cormorant Garamond` carrega perfeitamente na aplicação sem dependência de requisições externas em tempo de build, e a suíte `npm test` passa 100%.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Baixar e armazenar o arquivo WOFF2 otimizado da fonte `Cormorant Garamond` em `src/app/fonts/cormorant-garamond.woff2`. | P0 | CA01 |
| RF02 | Atualizar `src/app/layout.tsx` para importar `localFont` de `next/font/local` apontando para o arquivo WOFF2 local mantendo a variável CSS `--font-cormorant`. | P0 | CA01, CA02 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | O arquivo de fonte deve ser leve (WOFF2 <= 120 KB) e com `display: swap`. | P0 | CA01 |
| RNF02 | O comando `npm run build` deve compilar sem erros de Turbopack. | P0 | CA02 |
| RNF03 | `npm test` e `npm run typecheck` devem passar 100%. | P0 | CA02 |

### Dependências técnicas

- `next/font/local` nativo do Next.js 16.
- Arquivo WOFF2 oficial da fonte Google Cormorant Garamond.

### Recursos necessários

- N/A

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que a aplicação utiliza Cormorant Garamond nos títulos (`font-display`), quando a página é carregada, a fonte é aplicada via variável CSS `--font-cormorant` servida localmente sem requisições ao Google Fonts durante o build.
- [x] **CA02:** Dado o comando `npm run build`, quando executado no ambiente local e no GitHub Actions, então o build do Turbopack é concluído com sucesso com 0 erros de fonte.

## O que a atividade não inclui

- Alteração da família tipográfica ou do design system: motivo: mantém a identidade visual exata do projeto.
- Remoção do Turbopack: motivo: Turbopack é mantido como padrão do Next.js 16.

### Considerado para o futuro (P2)

- Avaliar migração de outras fontes futuras para self-hosting caso sejam adicionadas.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | N/A | Dev | Não | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Build de produção com Turbopack | build | CA02 | Rodar `npm run build` | Saída limpa com código 0 e páginas estáticas geradas |
| CT02 | Checagem de tipos e lint | unit | CA01, CA02 | Rodar `npm run typecheck && npm run lint` | 0 erros |
| CT03 | Suíte de testes unitários | unit | CA02 | Rodar `npm test` | Todos os testes passando |

## URL Complementar

- Documentação Next.js Local Fonts: `https://nextjs.org/docs/app/building-your-application/optimizing/fonts#local-fonts`
