# [FIX] Suporte a URLs de Thumbnail com Versão de Cache no Catálogo

> **Status:** Em andamento
> **Autor:** Antigravity · **Revisor:** Natanael Brentano · **Criada em:** 2026-10-14 · **Atualizada em:** 2026-10-14

## Detalhes da Atividade

- **O que precisa ser feito:** Utilizar a função `stripVersion` ao verificar a disponibilidade de imagens (`images.has(...)`) nos cards do catálogo (`CatalogView`, `CategoryView`, `HomeView` e `DashboardView`), permitindo que atividades cujas imagens possuem sufixo de cache-busting (ex.: `?v=d3eb764f`, gerado ao enviar imagens pelo painel de admin) exibam corretamente seus thumbnails nos cards em vez do ícone de placeholder.
- **Problema e evidência:** Atividades com imagens enviadas pelo painel de administração (como `sentences-about-my-day`, `nationalities-quiz-a1`, `story-starters-1`, `reading-signs-and-notices` e `present-perfect-or-past-simple`) salvam o caminho da thumbnail no Firestore com query string de versão (ex.: `src: "/images/activities/sentences-about-my-day/thumb.webp?v=d3eb764f"`). Ao navegar pelo catálogo ou tela inicial, a checagem `images.has(item.thumbnail.src)` falha porque a lista de imagens compiladas em `public/images` (`getPublicImagePaths()`) contém apenas caminhos limpos (`/images/activities/sentences-about-my-day/thumb.webp`). Isso faz com que `imageAvailable` seja `false` e o card exiba apenas um ícone genérico da categoria. Porém, ao entrar na atividade (`/play/sentences-about-my-day`), a imagem é exibida normalmente porque `ActivityImage` utiliza `stripVersion` internamente.
- **Impacto de não fazer:** Usuários e professores veem cards de atividades sem imagem de capa no catálogo e na página inicial mesmo quando o arquivo de thumbnail existe e está disponível no servidor.
- **Para quem é destinado:** Todos os visitantes, professores e alunos que utilizam o catálogo e navegam pelas atividades.
- **História de usuário:** Como usuário, quero visualizar as capas de todas as atividades no catálogo e na tela inicial, para identificar e selecionar atividades com facilidade visual.
- **Como saberemos que deu certo:** Atividades com versão na URL (ex.: `/play/sentences-about-my-day`) exibem o thumbnail normalmente nos cards do catálogo, carrosséis e página inicial, com testes unitários cobrindo o cenário.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Atualizar a verificação `hasImage` e `imageAvailable` em `CatalogView`, `CategoryView`, `HomeView` e `DashboardView` para normalizar o caminho com `stripVersion`. | P0 | CA01, CA02 |
| RF02 | Adicionar testes unitários garantindo que `CatalogView` e cards reconheçam imagens mesmo com query parameters na URL. | P0 | CA01 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Não alterar o comportamento de cache-busting das URLs no navegador (a URL com `?v=` deve continuar sendo passada ao componente `<Image />` para garantir invalidação de cache). | P0 | CA01 |
| RNF02 | A suíte de testes unitários (`npm test`) e de tipos (`npm run typecheck`) deve passar com 100% de sucesso. | P0 | CA02 |

### Dependências técnicas

- `stripVersion` de `@/lib/site-images`.

### Recursos necessários

- N/A

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um item de catálogo cujo `thumbnail.src` contenha query param (ex.: `/images/activities/sentences-about-my-day/thumb.webp?v=d3eb764f`), quando renderizado em `CatalogView`, `CategoryView`, `HomeView` ou `DashboardView`, então `imageAvailable` avalia como `true` e a tag `<img>` do thumbnail é exibida.
- [ ] **CA02:** Dado o comando `npm test`, quando executado, então todos os testes passam sem regressões.

## O que a atividade não inclui

- Remoção do mecanismo de versionamento: motivo: `?v=` é necessário para invalidação de cache de CDN quando imagens são atualizadas pelo painel.

### Considerado para o futuro (P2)

- Encapsular a resolução de `imageAvailable` diretamente dentro de `ActivityThumbnail` ou `CatalogItem`.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | N/A | Dev | Não | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Thumbnail com query string de versão | unit | CA01 | Renderizar `CatalogView` com item contendo `?v=abc` e path base existente em `imagePaths` | Imagem renderizada como `<img />` e não como `<div>` de placeholder |
| CT02 | Execução completa dos testes | unit | CA02 | Rodar `npm test` | Todos os testes passando |

## URL Complementar

- URL de produção afetada: `https://fun-english-972a2.web.app/activities`
