# [FEAT] Página de categoria ("See All")

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Criar a rota `/activities/[category]` que lista todas as atividades publicadas de uma categoria em grade, com cabeçalho da categoria (ícone, nome, subtítulo, contagem), filtros de nível, busca e ordenação reaproveitados, e paginação.
- **Problema e evidência:** O carrossel do catálogo mostra no máximo 20 itens; categorias como Listening e Fun têm dezenas/centenas. O link "See All" do site de referência leva à lista completa.
- **Impacto de não fazer:** A maior parte do acervo de cada categoria fica inacessível sem busca.
- **Para quem é destinado:** Professor de ESL.
- **História de usuário:** Como professor, quero ver todas as atividades de uma categoria em uma página, para explorar tudo o que existe, por exemplo, de Speaking.
- **Como saberemos que deu certo:** Todas as atividades publicadas da categoria são alcançáveis pela página; a URL da categoria é indexável pelo Google (ver spec de SEO).

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Rota `/activities/[category]` para cada id de categoria; ids inválidos retornam 404 | P0 | CA01, CA06 |
| RF02 | Cabeçalho com ícone, nome, subtítulo e contagem ("128 activities") | P0 | CA01 |
| RF03 | Grade responsiva de cards (1 col < 480 px, 2 col, 3 col, 4 col ≥ 1280 px) | P0 | CA02 |
| RF04 | Filtro de nível, busca e ordenação iguais aos da spec de Busca e filtros, com categoria fixa | P0 | CA03 |
| RF05 | Paginação com "Load more" (24 por vez), preservando posição de rolagem ao voltar do player | P0 | CA04 |
| RF06 | Rota `/activities/new` para "See All" de What's New, ordenada por data | P1 | CA05 |
| RF07 | Categoria destacada na barra de categorias | P0 | CA01 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Páginas das 9 categorias geradas no build (`generateStaticParams`) e atualizadas no navegador a partir do `catalog/index` (1 leitura por visita) | P0 | |
| RNF02 | Mesmos requisitos de acessibilidade e performance do catálogo | P0 | |

### Dependências técnicas

- [FEAT] Catálogo de atividades (componentes de card).
- [FEAT] Busca e filtros (lógica de filtro reutilizável).

### Recursos necessários

- N/A: reutiliza assets já definidos.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que acesso `/activities/speaking`, quando a página carrega, então vejo o cabeçalho "Speaking · Conversation practice" com a contagem correta e a categoria destacada na barra.
- [ ] **CA02:** Dado larguras de 375, 768 e 1440 px, quando vejo a grade, então ela tem 1, 2–3 e 4 colunas, respectivamente.
- [ ] **CA03:** Dado a página de Grammar, quando filtro por "Beginner" e busco "questions", então só atividades de Grammar que atendem aos dois critérios aparecem.
- [ ] **CA04:** Dado 60 atividades na categoria, quando clico "Load more" duas vezes, abro uma atividade e volto, então retorno à mesma posição com os 60 itens carregados.
- [ ] **CA05:** Dado que clico "See All" em What's New, quando a página abre, então vejo todas as atividades ordenadas da mais nova para a mais antiga.
- [ ] **CA06 (negativo):** Dado a URL `/activities/cooking`, quando a acesso, então recebo 404.
- [ ] **CA07 (limite):** Dado uma categoria sem atividades publicadas, quando a acesso, então vejo "No activities in this category yet" e link para o catálogo.

## O que a atividade não inclui

- Subcategorias (ex.: Listening > Songs): motivo: prematuro; tags cobrem por enquanto.
- Paginação numérica: motivo: "Load more" é suficiente.

### Considerado para o futuro (P2)

- Subcategorias/coleções dentro da categoria.
- Texto introdutório de SEO por categoria.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Nenhuma no momento | | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Cabeçalho da categoria | e2e | CA01 | Abrir `/activities/speaking` | Nome, subtítulo e contagem |
| CT02 | Grade responsiva | e2e | CA02 | 3 viewports | Colunas esperadas |
| CT03 | Filtros combinados | e2e | CA03 | Nível + busca | Resultado correto |
| CT04 | Restauração de rolagem | e2e | CA04 | Load more ×2, abrir e voltar | Mesma posição e itens |
| CT05 | What's New completo | e2e | CA05 | Abrir `/activities/new` | Ordem por data desc |
| CT06 | Categoria inválida | e2e | CA06 | `/activities/cooking` | 404 |
| CT07 | Categoria vazia | integração | CA07 | Seed sem Writing | Estado vazio |

## URL Complementar

- Documentação técnica: https://nextjs.org/docs/app/api-reference/functions/generate-static-params
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: https://www.coolenglish.org/activities (link "See All")
- Requisitos originais: Pedido de criar um site semelhante ao Cool English.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
