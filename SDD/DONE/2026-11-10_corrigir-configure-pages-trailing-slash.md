# [FIX] Remover injeção conflitante de next.config pelo actions/configure-pages no GitHub Actions

> **Status:** Concluída
> **Autor:** Antigravity · **Revisor:** Natanael Fernando Gatti Brentano · **Criada em:** 2026-11-10 · **Atualizada em:** 2026-11-10

## Detalhes da Atividade

- **O que precisa ser feito:** Remover o parâmetro `static_site_generator: next` do step `actions/configure-pages@v5` no workflow `.github/workflows/deploy.yml`.
- **Problema e evidência:** No build do CI, a action `actions/configure-pages@v5` só suporta extensões `.js`, `.cjs` e `.mjs`. Como o repositório utiliza `next.config.ts`, a action não encontra o arquivo de configuração e cria dinamicamente um arquivo `next.config.js` minimalista na raiz antes da execução de `npm run build`. Esse arquivo gerado automaticamente tem prioridade de resolução no Next.js e omite diretivas essenciais do projeto como `trailingSlash: true`, `NEXT_PUBLIC_IMAGES` e `assetPrefix`. Como consequência, as páginas estáticas foram exportadas como arquivos soltos (ex.: `lousa.html` e `activities.html`) ao invés de diretórios com `index.html`, fazendo com que requisições com barra no final (ex.: `/FunEnglish/lousa/`) retornassem erro 404 no GitHub Pages.
- **Impacto de não fazer:** Usuários e links que acessam rotas com barra final no GitHub Pages encontram tela de erro 404, além de potenciais omissões na injeção de imagens pré-computadas (`NEXT_PUBLIC_IMAGES`).
- **Para quem é destinado:** Alunos, professores e visitantes acessando a plataforma via GitHub Pages.
- **História de usuário:** Como visitante ou professor utilizando o GitHub Pages, quero acessar `/FunEnglish/lousa` ou `/FunEnglish/lousa/`, para conseguir utilizar a lousa interativa sem interrupções por erro 404.
- **Como saberemos que deu certo:** `actions/configure-pages@v5` roda sem gerar `next.config.js`, permitindo que o `next.config.ts` do projeto seja utilizado integralmente com `trailingSlash: true` e `out/lousa/index.html` sendo devidamente gerado no build.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Remover `static_site_generator: next` do step de Setup Pages no workflow de deploy | P0 | CA01, CA02 |
| RF02 | Assegurar que `npm run build` continue utilizando integralmente o `next.config.ts` do repositório | P0 | CA01 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Não alterar o comportamento de deploy para Firebase Hosting nem pipelines locais | P0 | CA01 |
| RNF02 | Todos os testes unitários e de integração existentes continuam passando | P0 | CA02 |

### Dependências técnicas

- `.github/workflows/deploy.yml`
- `next.config.ts`

### Recursos necessários

- Acesso ao repositório GitHub para atualizar o workflow.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado o workflow `.github/workflows/deploy.yml`, quando o step `Setup Pages` for executado, então ele não deve injetar nem criar um arquivo `next.config.js` conflitante na raiz do workspace.
- [x] **CA02:** Dado que o `npm run build` é disparado no CI com `GITHUB_PAGES=true`, quando a exportação for concluída, então os artefatos devem ser gerados em diretórios com `index.html` em conformidade com `trailingSlash: true` de `next.config.ts`.

## O que a atividade não inclui

- Alterações na lógica de renderização da lousa: motivo: a lousa já foi tornada pública e funcional no commit anterior.
- Modificações no deploy de backend / Cloud Functions: motivo: fora do escopo do pipeline do GitHub Pages.

### Considerado para o futuro (P2)

- N/A: O pipeline estático atende totalmente às necessidades de exportação no Pages.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O `actions/configure-pages` ainda é necessário se removermos `static_site_generator: next`? | dev | Não | Sim, pois ele configura o Pages environment e emite as variáveis de output para `actions/deploy-pages@v4`. |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Validar ausência de `static_site_generator` no deploy.yml | unit/inspeção | CA01 | Verificar conteúdo do step `Setup Pages` em `.github/workflows/deploy.yml` | Step não contém `static_site_generator: next` |
| CT02 | Execução de testes e build estático | unit/build | CA02 | Rodar `npm test` e `GITHUB_PAGES=true NEXT_PUBLIC_BASE_PATH=/FunEnglish npm run build` | Build gera `out/lousa/index.html` com sucesso |

## URL Complementar

- Documentação técnica: https://github.com/actions/configure-pages
- Protótipo / mockup: N/A
- Discussões relacionadas: N/A
- Referências de design: N/A
- Requisitos originais: Solicitação do usuário para validar lousa no GitHub Pages
- Issue / PR relacionado: N/A
