# [FEAT] Catálogo de atividades (página /activities)

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Construir a página `/activities`, principal vitrine do site: hero com título, contagem total de atividades e campo de busca; seção "What's New" com as atividades mais recentes; e um carrossel horizontal por categoria (ex.: "Fun · Games & activities", "Grammar · Grammar practice"), cada um com link "See All". Cada atividade aparece como card.
- **Problema e evidência:** O site de referência mostra ~20 atividades por categoria em carrosséis, permitindo ao professor "passear" pelo acervo sem aplicar filtros. É a principal forma de descoberta de conteúdo.
- **Impacto de não fazer:** O professor não tem como descobrir e abrir atividades.
- **Para quem é destinado:** Professor de ESL (visitante ou logado).
- **História de usuário:** Como professor, quero ver as atividades organizadas por categoria e as novidades em destaque, para escolher rapidamente o que usar na próxima aula.
- **Como saberemos que deu certo:** Abrir uma atividade a partir do catálogo em ≤ 2 cliques; LCP < 2.5 s em 4G; 0 erros no console.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Hero com título "Fun English Activities", subtítulo com a contagem real de atividades publicadas ("N Interactive Activities for ESL Teachers") e campo de busca | P0 | CA01 |
| RF02 | Seção "What's New · Recently added activities" com as 20 atividades publicadas mais recentes | P0 | CA02 |
| RF03 | Um carrossel por categoria (na ordem da constante de categorias), com ícone, nome, subtítulo e até 20 atividades; categorias sem atividades não aparecem | P0 | CA03, CA07 |
| RF04 | Link "See All" em cada seção levando à página da categoria (ou à listagem completa, no caso de What's New) | P0 | CA04 |
| RF05 | Card de atividade com: thumbnail, título, categoria, rótulo de nível ("All levels", "Beg–Inter"…), botão de favorito (coração) e botão de compartilhar | P0 | CA05 |
| RF06 | Clique no card abre a página do player da atividade (`/play/[slug]`) | P0 | CA05 |
| RF07 | Carrossel navegável por setas (desktop), swipe (touch) e teclado; setas ocultas quando não há mais itens naquela direção | P0 | CA06 |
| RF08 | Skeletons durante o carregamento | P1 | CA08 |
| RF09 | Badge "NEW" em atividades criadas há ≤ 14 dias | P1 | CA02 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Site estático (Firebase Hosting, plano Spark): a página é gerada no build com os dados do Firestore e, no navegador, atualizada a partir de **um único documento agregado** `catalog/index` (dados leves de todas as atividades publicadas, mantido pelo seed e pelo painel admin). Cada visita custa no máximo 1 leitura (cota gratuita: 50 mil leituras/dia) | P0 | CA09 |
| RNF02 | Imagens via `next/image`, lazy loading fora da primeira dobra | P0 | |
| RNF03 | LCP < 2.5 s e CLS < 0.1 em mobile (Lighthouse) | P1 | |
| RNF04 | Cards com `alt` descritivo e carrossel com `aria-roledescription="carousel"` | P0 | CA06 |

### Dependências técnicas

- [UI] Layout base e navegação.
- [FEAT] Modelo de dados de atividades (e seed).
- Botões de favorito e compartilhar dependem das specs [FEAT] Favoritos e [FEAT] Compartilhar atividade (podem ser renderizados como placeholders até lá).

### Recursos necessários

- Seed com ≥ 3 atividades por categoria (vem da spec de conteúdo inicial; hoje há 5 exemplos e fixtures de teste em `e2e/fixtures/`).
- Mockup do card e do carrossel.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que existem 42 atividades publicadas, quando acesso `/activities`, então o hero exibe "42 Interactive Activities for ESL Teachers" e um campo de busca.
- [x] **CA02:** Dado que existem atividades publicadas, quando vejo "What's New", então aparecem até 20, ordenadas da mais recente para a mais antiga, e as criadas há ≤ 14 dias exibem o badge "NEW".
- [x] **CA03:** Dado que as 9 categorias têm atividades, quando rolo a página, então vejo 9 carrosséis na ordem definida, cada um com ícone, nome e subtítulo.
- [x] **CA04:** Dado o carrossel "Grammar", quando clico em "See All", então sou levado a `/activities/grammar`.
- [x] **CA05:** Dado um card, quando o vejo, então ele mostra thumbnail, título, categoria e nível; e quando clico nele (fora dos botões de favoritar/compartilhar), então abro `/play/[slug]`.
- [x] **CA06:** Dado um carrossel com mais itens que cabem na tela, quando clico na seta direita (ou deslizo no touch, ou uso o teclado), então novos cards aparecem, e a seta esquerda passa a ser exibida.
- [x] **CA07 (limite):** Dado que a categoria "Writing" não tem atividades publicadas, quando acesso a página, então o carrossel de Writing não é exibido.
- [x] **CA08:** Dado uma conexão lenta, quando a página carrega dados no cliente, então skeletons ocupam o espaço dos cards sem deslocar o layout.
- [x] **CA09 (negativo):** Dado 100 visitas ao catálogo, quando comparo as leituras no Firestore, então elas somam no máximo 100 (1 leitura do `catalog/index` por visita), e não uma leitura por atividade.
- [x] **CA10 (negativo):** Dado uma atividade com status `draft`, quando acesso o catálogo, então ela não aparece em nenhuma seção.

## O que a atividade não inclui

- Filtros, ordenação e busca funcional: motivo: spec própria ([FEAT] Busca e filtros); aqui o campo de busca apenas redireciona.
- Badge "FREE" e cadeado de conteúdo premium: motivo: sem pagamento na v1.
- Personalização por usuário ("Recommended for you"): motivo: prematuro.

### Considerado para o futuro (P2)

- Seção "Most played" ordenada por `playCount`.
- Seção "Continue where you left off" para usuários logados.
- Badge "FREE"/cadeado se houver plano pago.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | A Home (`/`) será uma landing page separada ou redireciona para `/activities`? | PO | Não | Sugestão v1: `/` redireciona para `/activities` |
| D02 | O player abre na mesma aba ou em nova aba (o de referência abre em nova aba)? | PO | Não | Implementado na mesma aba; o botão "fullscreen" vem com o motor de atividades |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Contagem no hero | integração | CA01 | Seed com N atividades; abrir página | Texto exibe N |
| CT02 | Ordem e badge do What's New | integração | CA02 | Seed com datas variadas | Ordem desc; badge só nas ≤ 14 dias |
| CT03 | Carrosséis por categoria | e2e | CA03 | Abrir `/activities` | 9 seções na ordem |
| CT04 | See All | e2e | CA04 | Clicar See All em Grammar | URL `/activities/grammar` |
| CT05 | Card e navegação | e2e | CA05 | Clicar num card | Abre `/play/[slug]` |
| CT06 | Navegação do carrossel | e2e | CA06 | Clicar seta; teclado; swipe emulado | Scroll avança; setas atualizam |
| CT07 | Categoria vazia | integração | CA07 | Seed sem Writing | Seção ausente |
| CT08 | Skeleton | manual | CA08 | Throttle "Slow 3G" | Skeletons, CLS < 0.1 |
| CT09 | Leituras por visita | integração (emulador) | CA09 | Carregar o catálogo e contar leituras | 1 leitura (`catalog/index`) |
| CT10 | Draft oculto | integração | CA10 | Seed com 1 draft | Não aparece |

## URL Complementar

- Documentação técnica: https://nextjs.org/docs/app/guides/static-exports
- Protótipo / mockup: N/A — validado visualmente no navegador (desktop e mobile, temas Dark e Light).
- Discussões relacionadas: N/A.
- Referências de design: https://www.coolenglish.org/activities
- Requisitos originais: Pedido de criar um site semelhante ao Cool English.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
