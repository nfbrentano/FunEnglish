# [FEAT] Mais imagens nas atividades

> **Status:** Em andamento
> **Autor:** Natanael Brentano · **Revisor:** Natanael Brentano · **Criada em:** 2026-10-02 · **Atualizada em:** 2026-10-02

## Detalhes da Atividade

- **O que precisa ser feito:** Tornar as atividades visuais como as do Cool English, com imagem em toda a experiência do aluno:
  - ilustração de abertura (o thumbnail em destaque) na tela inicial do player;
  - uma imagem por pergunta, cartão, frase ou pista;
  - respostas em forma de figura no quiz;
  - uma ilustração na tela de resultados.
  
  O painel ganha meios de **planejar** essas imagens em lote (texto alternativo + prompt para cada item), para gerá-las e enviá-las com o fluxo de `SDD/2026-10-02_imagens-pelo-painel.md`. Imagens planejadas e ainda não enviadas nunca aparecem quebradas.
- **Problema e evidência:** Levantamento de 2026-10-02 nos 39 arquivos de `content/activities/`:

  | Tipo | Itens com imagem |
  |---|---|
  | Quiz | **0 de 181** perguntas |
  | Completar lacunas | **0 de 28** frases |
  | Quiz Board | **0 de 28** pistas |
  | Cartões de conversa | 6 de 42 cartões |
  | Flashcards | 14 de 24 cartões |

  A tela inicial e a de resultados do player não mostram nenhuma imagem; o thumbnail só aparece no card do catálogo. No Cool English, as atividades são ilustradas em quase todas as telas. O PO observa que isso deixa a atividade "mais atrativa ao aluno".
- **Impacto de não fazer:** Atividades com aparência de formulário de texto. Isso pesa mais para iniciantes e crianças, que dependem do apoio visual para entender o vocabulário, e afasta o site da referência.
- **Para quem é destinado:** Aluno (quem joga) e professor (quem projeta em sala). Indiretamente, o admin, que cria as imagens.
- **História de usuário:** Como aluno, quero ver uma figura em cada pergunta e cartão, para entender o contexto e me interessar pela atividade. Como admin, quero planejar e enviar essas figuras em lote, para ilustrar o acervo sem editar item por item.
- **Como saberemos que deu certo:**
  - 100% das atividades mostram uma imagem na tela inicial e na de resultados.
  - ≥ 80% dos itens das atividades Beginner e Intermediate têm imagem, e ≥ 50% nas Advanced (metas da 1ª leva).
  - 0 imagens quebradas visíveis para o aluno.
  - Uma atividade de 10 perguntas com imagens pesa ≤ 1,2 MB no total.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | **Tela inicial do player:** o thumbnail aparece em destaque (16:10, ao lado do título no desktop e acima dele no celular). Sem thumbnail, aparece a ilustração da categoria (RF09) | P0 | CA01 |
| RF02 | **Imagem por item:** o player mostra em destaque a imagem de cada item que tiver uma. É o que já existe hoje: `media` de imagem em perguntas, frases e pistas, `front.image` nos flashcards e `image` nos cartões de conversa. Fica acima do enunciado, com tamanho estável, sem empurrar o layout | P0 | CA02 |
| RF03 | **Respostas com figura (quiz):** cada alternativa aceita `image` opcional (mesmo esquema de imagem, com `alt` e `prompt`). Quando todas as alternativas têm imagem, elas aparecem em grade 2×2 de figuras com o texto embaixo, clicáveis e navegáveis por teclado. O texto continua obrigatório (é o nome acessível) | P0 | CA03 |
| RF04 | **Tela de resultados:** uma ilustração conforme o desempenho, em 3 faixas: ótimo (≥ 80%), bom (≥ 50%) e "vamos praticar" (< 50%). Nas atividades sem pontuação (cartões de conversa), uma ilustração de "bom trabalho". São 4 imagens do site, no estilo do guia | P1 | CA04 |
| RF05 | **Nunca quebrada:** se uma imagem não carrega (ainda não enviada, caminho errado ou falha de rede), o player não mostra o ícone de imagem quebrada. Ele mostra a ilustração da categoria (thumbnail e itens) ou simplesmente omite a imagem (alternativas e frente de flashcard com texto). Uma frente de flashcard **só com imagem** que falha mostra o `alt` em texto grande | P0 | CA05 |
| RF06 | **Planejar imagens (painel):** botão **Plan images** no editor. Para cada item sem imagem, ele cria uma imagem planejada com: `src` = `/images/activities/<slug>/<item>-<n>.webp` (ex.: `question-3`, `card-2`); `alt` = rascunho tirado do texto do item, editável; e `prompt` = alt + estilo. O admin revisa, salva, e as imagens passam a constar em "Missing images", prontas para "Upload several". Há a opção de incluir também as alternativas do quiz (RF03) | P0 | CA06 |
| RF07 | **Create with AI com imagens:** o guia `content/prompts/activities.md` e o prompt do painel pedem à IA um `image` com `alt` e `prompt` para cada item (o `src` é preenchido pelo painel ao importar, no mesmo padrão do RF06) | P1 | CA07 |
| RF08 | **Cobertura de imagens:** `/admin/coverage` ganha a coluna "% items with images" por atividade e por categoria, com destaque abaixo da meta do nível. A lista do admin ganha o filtro "Few images" | P1 | CA08 |
| RF09 | **Ilustrações de categoria:** 9 ilustrações (até existirem, o ícone da categoria sobre a cor dela; o build só pede as imagens do site que existem, para não gerar 404), uma por categoria, no estilo do guia. Servem de substituto quando falta imagem (RF01, RF05); sem fundo decorativo (D03) | P1 | CA01, CA05 |
| RF10 | **Leva de conteúdo:** usar RF06 nas 39 atividades atuais para planejar as imagens até as metas de cobertura; o PO gera e envia as imagens pelo painel. As atividades seguem publicadas durante a leva (RF05 garante que nada aparece quebrado) | P1 | CA09 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | **Peso:** imagens de item ≤ 960 px de largura e ≤ 100 KB (WebP); figuras de alternativa ≤ 480 px e ≤ 40 KB. O thumbnail segue 1280×800 ≤ 200 KB. O painel e o `images:import` aplicam esses limites por tipo de imagem | P0 | CA10 |
| RNF02 | **Banda do plano Spark:** o Hosting gratuito tem cerca de **360 MB/dia** de transferência. Por isso: `loading="lazy"` e `decoding="async"` em todas as imagens; pré-carregar só a imagem do **próximo** item; `width`/`height` declarados (sem salto de layout) | P0 | CA10 |
| RNF03 | **Cache sem imagem velha:** o upload pelo painel grava o `src` com uma versão (`thumb.webp?v=<hash curto>`): uma substituição muda a URL, e o aluno vê a nova na hora. O cache das imagens continua de 7 dias (o Hosting só varia o cabeçalho pelo caminho, não pela query; um `immutable` de 1 ano deixaria velhas as imagens trocadas pelo `images:import`) | P1 | CA11 |
| RNF04 | **Acessibilidade:** imagens informativas com `alt` (obrigatório no esquema); ilustrações decorativas (categoria, resultados) com `alt=""`; as figuras das alternativas mantêm o texto como nome; telas novas sem violação séria no axe | P0 | CA03, CA12 |
| RNF05 | **Estilo único:** todas as imagens novas seguem `content/prompts/image-style.md` (o prompt planejado já o inclui) | P0 | |
| RNF06 | **Projetar em sala:** em tela cheia, a imagem do item ocupa até 45% da altura, sem empurrar alternativas ou botões para fora da tela em 1366×768 | P1 | CA02 |

### Dependências técnicas

- `SDD/2026-10-02_imagens-pelo-painel.md`: campo `prompt`, upload e "Upload several" pelo painel, "Missing images".
- Motor do player e plugins (`src/components/player/`): intro, resultados, `ActivityMedia`, os 5 players.
- Esquema `imageSchema` / `quizContentSchema` (`src/lib/activities/schema/`) para `image` nas alternativas (RF03).
- `firebase.json` (cabeçalhos de cache, RNF03).
- Editor estruturado (`src/components/admin/content/`) para "Plan images" e a imagem das alternativas.

### Recursos necessários

- Geração das imagens pelo PO na ferramenta de IA que ele usa, com os prompts planejados: cerca de 230 imagens de item para chegar às metas, mais 4 de resultados e 9 de categoria.
- Token do GitHub conectado em `/admin/settings` (já previsto).

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado uma atividade com thumbnail, quando abro `/play/<slug>`, então vejo a ilustração em destaque na tela inicial; sem thumbnail (ou se ele falha), vejo a ilustração da categoria. _(PR 1)_
- [x] **CA02:** Dado um quiz em que a pergunta 2 tem imagem, quando chego nela, então a imagem aparece acima do enunciado sem deslocar o layout, e em tela cheia em 1366×768 as alternativas e o botão continuam visíveis sem rolar. _(PR 1)_
- [x] **CA03:** Dado uma pergunta cujas 4 alternativas têm imagem, quando a vejo, então as alternativas aparecem em grade 2×2 de figuras com o texto, posso escolher com mouse ou teclado, e o leitor de tela lê o texto de cada uma. _(PR 1)_
- [x] **CA04:** Dado que termino um quiz com 9/10, quando vejo os resultados, então aparece a ilustração "ótimo"; com 3/10, a de "vamos praticar". _(PR 1)_
- [x] **CA05:** Dado uma imagem planejada que ainda não foi enviada, quando o aluno chega no item, então não aparece imagem quebrada; numa frente de flashcard só com imagem, aparece o `alt` em texto grande. _(PR 1)_
- [ ] **CA06:** Dado um quiz de 8 perguntas sem imagens, quando clico **Plan images** e salvo, então as 8 perguntas ganham `image` com `src` `…/question-1.webp` … `question-8.webp`, `alt` editável e `prompt`, e "Missing images" lista as 8 com os nomes `<slug>--question-1.png` etc.
- [ ] **CA07:** Dado "Create with AI" para um quiz Beginner, quando colo a resposta da IA, então cada pergunta vem com `image.alt` e `image.prompt`, e o rascunho já aparece em "Missing images".
- [ ] **CA08:** Dado a página de cobertura, quando uma atividade Beginner tem 30% dos itens com imagem, então ela aparece destacada abaixo da meta de 80%, e o filtro "Few images" da lista a mostra.
- [ ] **CA09:** Dado o fim da leva de conteúdo, quando conto os itens, então ≥ 80% (Beginner/Intermediate) e ≥ 50% (Advanced) têm imagem enviada.
- [x] **CA10 (limite):** Dado uma atividade de 10 perguntas com imagem, quando a jogo com a rede monitorada, então o total transferido de imagens é ≤ 1,2 MB, e só a imagem do item atual e a do próximo são baixadas antes de serem necessárias. _(PR 1)_
- [x] **CA11:** Dado que substituo uma imagem pelo painel, quando o deploy termina e o aluno abre a atividade, então ele vê a nova (o `src` mudou de `?v=`), mesmo tendo visto a antiga antes. _(PR 1)_
- [x] **CA12 (negativo):** Dado a tela inicial, a de resultados e uma pergunta com respostas em figura, quando rodo o axe nos 3 temas, então não há violação séria de contraste nem imagem sem `alt`. _(PR 1)_

## O que a atividade não inclui

- **Animações e personagens animados (mascote):** motivo: custo de produção alto; fica como P2.
- **Geração das imagens por API:** motivo: segue o fluxo de copiar o prompt (spec de imagens pelo painel).
- **Imagens geradas para os vídeos do YouTube:** motivo: o próprio vídeo já é a mídia.
- **Novos tipos de atividade baseados em imagem (ex.: "find the difference", arrastar etiquetas):** motivo: cada tipo novo tem a sua spec.

### Considerado para o futuro (P2)

- Mascote do Fun English nas telas de início e resultado, com expressões por desempenho.
- Animações leves ao acertar ou errar (confete, figura que pula).
- Versões responsivas (`srcset`) quando a banda apertar.
- Upgrade para o plano Blaze se a transferência diária passar de 80% da cota.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | As metas de cobertura (80% Beginner/Intermediate, 50% Advanced) estão boas? | PO | Não | Sim (PO, 2026-10-02) |
| D02 | Respostas em figura (RF03) entram nesta leva ou depois? | PO | Não | Entram nesta leva (PO, 2026-10-02); a leva de conteúdo as usa onde fizer sentido |
| D03 | Fundo decorativo por categoria (RF09) ou fundo neutro? | PO/Design | Não | **Não** (PO, 2026-10-02): sem fundo decorativo; as ilustrações de categoria servem só de substituto quando falta imagem (RF01, RF05) |
| D04 | Ordem de entrega? | PO | Não | 2 PRs (PO, 2026-10-02): (1) player (RF01–RF05, RF09, RNF01–RNF04, RNF06); (2) painel e conteúdo (RF06–RF08, RF10) |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Intro com imagem | e2e | CA01 | Abrir atividade com e sem thumbnail | Ilustração / fallback da categoria |
| CT02 | Imagem do item | e2e | CA02 | Pergunta com imagem em 1366×768 tela cheia | Visível; alternativas sem rolar |
| CT03 | Respostas com figura | componente + e2e | CA03 | 4 alternativas com imagem; teclado | Grade 2×2; seleção; nome acessível |
| CT04 | Resultados | componente | CA04 | Placar 9/10 e 3/10 | Ilustração da faixa |
| CT05 | Fallback | componente + e2e | CA05 | `src` inexistente | Sem ícone quebrado; alt/categoria |
| CT06 | Plan images | componente + e2e | CA06 | Quiz de 8 sem imagem | 8 imagens planejadas; Missing images lista |
| CT07 | Create with AI | unit | CA07 | Prompt do guia e resposta com `image` | Campos preservados; `src` gerado |
| CT08 | Cobertura | unit + e2e | CA08 | Atividade com 30% de itens ilustrados | Destaque; filtro |
| CT09 | Leva | manual | CA09 | Contagem ao fim | Metas atingidas |
| CT10 | Banda | e2e | CA10 | Monitorar requisições de imagem ao jogar | ≤ 1,2 MB; só atual + próxima |
| CT11 | Cache | e2e | CA11 | Substituir imagem | `?v=` novo no `src`; a imagem nova aparece |
| CT12 | Acessibilidade | e2e (axe) | CA12 | Intro/resultados nos 3 temas | 0 violações sérias |

## URL Complementar

- Documentação técnica: https://firebase.google.com/docs/hosting/usage-quotas-pricing (cotas do Hosting no Spark) · https://web.dev/articles/browser-level-image-lazy-loading · https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link/rel/preload
- Protótipo / mockup: N/A: seguir o visual atual do player com as imagens nas posições descritas.
- Discussões relacionadas: Pedido do PO (2026-10-02): "que todas as atividades possuam mais imagens em tela, pois fica mais atrativo ao aluno e mais parecido com o Cool English".
- Referências de design: https://www.coolenglish.org/activities · `content/prompts/image-style.md`
- Requisitos originais: `SDD/2026-09-30_conteudo-inicial-gerado-por-ia.md` (imagens do acervo) e `SDD/2026-10-02_imagens-pelo-painel.md`.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
