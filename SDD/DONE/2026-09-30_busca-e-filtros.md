# [FEAT] Busca, filtros e ordenação de atividades

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Permitir buscar atividades por texto ("Search by topic, level, grammar point, or activity name…") e filtrar por categoria (All Categories + 9) e nível (All Levels, Beginner, Intermediate, Advanced), ordenando por "Newest First", "Title: A-Z" ou "Title: Z-A", com contador "Showing N activities". Com busca ou filtro ativo, os carrosséis dão lugar a uma grade de resultados.
- **Problema e evidência:** Com centenas de atividades, navegar só por carrosséis é lento. O site de referência exibe uma barra de filtros logo abaixo do hero e o contador de resultados.
- **Impacto de não fazer:** Professores com necessidade específica (ex.: "present perfect, intermediate") não encontram o conteúdo.
- **Para quem é destinado:** Professor de ESL.
- **História de usuário:** Como professor, quero buscar por tema e filtrar por nível e categoria, para achar em segundos a atividade certa para minha turma.
- **Como saberemos que deu certo:** Resultados exibidos em < 300 ms após parar de digitar (com dados já carregados); 100% das combinações de filtro refletidas na URL.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Campo de busca com debounce de 250 ms; busca por título, descrição e tags, ignorando maiúsculas e acentos | P0 | CA01, CA06 |
| RF02 | Filtro de categoria (dropdown) com "All Categories" + 9 categorias | P0 | CA02 |
| RF03 | Filtro de nível: "All Levels", "Beginner", "Intermediate", "Advanced"; uma atividade entra no resultado se o nível escolhido estiver entre `levelMin` e `levelMax` | P0 | CA03 |
| RF04 | Ordenação: "Newest First" (padrão), "Title: A-Z", "Title: Z-A" | P0 | CA04 |
| RF05 | Contador "Showing N activities" atualizado em tempo real | P0 | CA01 |
| RF06 | Estado de busca/filtros sincronizado com a URL (`?q=&category=&level=&sort=`), permitindo compartilhar e usar voltar/avançar do navegador | P0 | CA05 |
| RF07 | Com qualquer filtro/busca ativo, exibir grade de resultados paginada ("Load more", 24 por vez) no lugar dos carrosséis | P0 | CA07 |
| RF08 | Botão "Clear filters" quando houver filtro ativo | P1 | CA08 |
| RF09 | Estado vazio: "No activities found" com sugestão de limpar filtros | P0 | CA09 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Para até 2.000 atividades, a busca roda no cliente sobre um índice leve (id, slug, título, categoria, níveis, tags, data, thumbnail) vindo do documento `catalog/index` (ver spec do Catálogo), sem consultas ao Firestore por tecla digitada | P0 | CA10 |
| RNF02 | Índice leve ≤ 300 KB gzip | P1 | CA10 |
| RNF03 | Controles acessíveis: `label` associado, dropdowns operáveis por teclado, contador anunciado via `aria-live="polite"` | P0 | |

### Dependências técnicas

- [FEAT] Catálogo de atividades (card e página).
- [FEAT] Modelo de dados (campos `tags`, `levelMin`, `levelMax`, `searchTokens`).

### Recursos necessários

- Lista de tags padronizadas (tópicos gramaticais, temas): fica para a spec de conteúdo inicial.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que estou em `/activities`, quando digito "irregular verbs", então em até 300 ms após parar de digitar vejo só as atividades correspondentes e o contador "Showing N activities" com o número correto.
- [x] **CA02:** Dado o filtro de categoria, quando escolho "Listening", então só atividades de Listening aparecem.
- [x] **CA03:** Dado uma atividade com níveis Beginner–Intermediate, quando filtro por "Intermediate", então ela aparece; quando filtro por "Advanced", então ela não aparece.
- [x] **CA04:** Dado resultados na tela, quando escolho "Title: A-Z", então ficam em ordem alfabética crescente; com "Title: Z-A", decrescente.
- [x] **CA05:** Dado busca "idioms", categoria Vocabulary e nível Advanced, quando copio a URL e abro em outra aba, então os mesmos filtros e resultados são exibidos; e o botão voltar desfaz o último filtro.
- [x] **CA06:** Dado uma atividade chamada "Café Vocabulary", quando busco "cafe", então ela aparece.
- [x] **CA07:** Dado mais de 24 resultados, quando clico em "Load more", então os próximos 24 são anexados à grade.
- [x] **CA08:** Dado filtros ativos, quando clico em "Clear filters", então a URL volta para `/activities` e os carrosséis reaparecem.
- [x] **CA09 (limite):** Dado a busca "xyzqwe", quando não há resultados, então vejo "No activities found" e o botão "Clear filters".
- [x] **CA10 (negativo):** Dado que digito 20 caracteres na busca, quando observo a aba Network, então nenhuma requisição ao Firestore é feita por tecla.

## O que a atividade não inclui

- Busca semântica ou com tolerância a erros de digitação: motivo: complexo demais agora.
- Filtro "Free Only": motivo: sem pagamento na v1.
- Filtro por tipo de atividade (quiz, flashcards…): motivo: baixo impacto inicial.

### Considerado para o futuro (P2)

- Busca server-side (Algolia/Typesense ou extensão do Firebase) quando o acervo passar de ~2.000 atividades.
- Filtro por tipo de atividade e por tag.
- Autocompletar/sugestões.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Usar lib de busca no cliente (ex.: MiniSearch/Fuse.js) ou filtro simples por tokens? | Dev | Não | Filtro próprio, sem dependência: cada palavra da busca precisa iniciar alguma palavra do título, descrição ou tags (sem acentos/maiúsculas). Suficiente até ~2.000 atividades; trocar por MiniSearch se precisar de ranking |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Busca por texto | e2e | CA01 | Digitar "irregular verbs" | Resultados e contador corretos |
| CT02 | Filtro de categoria | unit | CA02 | `filterActivities({category:'listening'})` | Só Listening |
| CT03 | Faixa de nível | unit | CA03 | Atividade Beg–Inter com filtros Inter/Adv | Inclui / exclui |
| CT04 | Ordenação | unit | CA04 | Ordenar lista fixa | Ordem esperada |
| CT05 | URL como estado | e2e | CA05 | Aplicar filtros, recarregar, voltar | Estado preservado e desfeito |
| CT06 | Acentos | unit | CA06 | Buscar "cafe" | Encontra "Café" |
| CT07 | Paginação | e2e | CA07 | Seed com 30 resultados | 24 + 6 após "Load more" |
| CT08 | Limpar filtros | e2e | CA08 | Clicar "Clear filters" | Carrosséis de volta |
| CT09 | Sem resultados | e2e | CA09 | Buscar "xyzqwe" | Estado vazio |
| CT10 | Sem requisições por tecla | e2e | CA10 | Monitorar requests ao digitar | 0 chamadas a `firestore.googleapis.com` |

## URL Complementar

- Documentação técnica: https://lucaong.github.io/minisearch/
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: https://www.coolenglish.org/activities (barra de filtros e contador)
- Requisitos originais: Pedido de criar um site semelhante ao Cool English.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
