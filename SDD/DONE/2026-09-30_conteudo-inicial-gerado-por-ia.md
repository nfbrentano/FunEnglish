# [FEAT] Conteúdo inicial do acervo gerado por IA

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-10-06

## Detalhes da Atividade

- **O que precisa ser feito:** Produzir o acervo inicial de atividades (≥ 3 por categoria, ≥ 27 no total) como arquivos JSON válidos, gerados por IA, cobrindo os 5 tipos da v1 (quiz, flashcards, completar lacunas, quiz board/jeopardy, cartões de conversa). Produzir também as imagens (thumbnails e imagens de conteúdo), geradas por IA a partir de prompts versionados com estilo visual único. Todo o conteúdo entra marcado como `origin: "ai"` e `reviewStatus: "pending"` para revisão posterior no painel admin.
- **Problema e evidência:** O catálogo, a busca e os players precisam de conteúdo real para serem validados e lançados. O PO decidiu gerar com IA e revisar depois, editando no próprio site.
- **Impacto de não fazer:** O site é lançado vazio; não há como validar os players com conteúdo realista.
- **Para quem é destinado:** PO (revisor do conteúdo) e, indiretamente, professores de ESL.
- **História de usuário:** Como PO, quero um acervo inicial gerado por IA, correto e adequado ao nível, para lançar o site com conteúdo e revisá-lo aos poucos pelo painel.
- **Como saberemos que deu certo:** 100% dos JSON passam na validação do seed; ≥ 3 atividades publicadas por categoria; ≥ 90% das atividades aprovadas na revisão sem mudanças estruturais (só ajustes de texto).

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Arquivos em `content/activities/ai/{categoria}/{slug}.json`, validados pelo esquema do tipo | P0 | CA01 |
| RF02 | Distribuição mínima: 3 atividades por categoria; níveis variados (≥ 1 Beginner, ≥ 1 Intermediate, ≥ 1 Advanced ou "All levels" por categoria) | P0 | CA02 |
| RF03 | Mapeamento sugerido de tipos: Fun → quiz board / quiz; Grammar → completar lacunas / quiz; Listening → completar lacunas com clipe do YouTube / quiz com TTS; Pictures → cartões de conversa / quiz com imagem; Reading → quiz com texto; Speaking → cartões de conversa; Videos → quiz / lacunas com YouTube; Vocabulary → flashcards; Writing → cartões de conversa (modo Writing) | P1 | CA02 |
| RF04 | Conteúdo em inglês americano, com vocabulário e gramática adequados ao nível (referência CEFR: Beginner ≈ A1–A2, Intermediate ≈ B1–B2, Advanced ≈ C1–C2); explicações nas respostas de quiz | P0 | CA03 |
| RF05 | Guia de prompts versionado (`content/prompts/activities.md`) com instruções por tipo e nível, para gerar novas atividades de forma reprodutível | P1 | CA06 |
| RF06 | Estilo visual único para imagens, descrito em `content/prompts/image-style.md` (ex.: ilustração flat, paleta terrosa com acento dourado, fundo neutro, sem texto na imagem), harmonizado com a identidade visual do site | P0 | CA04 |
| RF07 | Um arquivo de prompt por imagem (`content/prompts/images/{slug}/{n}.txt`), o que permite regerar qualquer imagem | P1 | CA04 |
| RF08 | Imagens em `/public/images/activities/{slug}/`, formato WebP, thumbnails 1280×800 (16:10) e imagens de conteúdo ≤ 1600 px de largura, ≤ 200 KB cada, com `alt` descritivo e `imageSource: "ai"` | P0 | CA04, CA05 |
| RF09 | Enquanto uma imagem não existir, o player e o card usam um placeholder SVG por categoria (não quebra o layout) | P1 | CA07 |
| RF10 | Atividades de Listening/Videos usam apenas vídeos do YouTube com embed permitido, seguindo a política de músicas da spec Completar lacunas | P0 | CA08 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Nenhum conteúdo ofensivo, estereotipado ou inadequado para sala de aula (inclusive turmas de crianças/adolescentes) | P0 | CA03 |
| RNF02 | Textos autorais: nenhum trecho copiado de livros didáticos, provas oficiais (Cambridge etc.) ou do site de referência | P0 | CA03 |
| RNF03 | Imagens sem pessoas reais identificáveis, marcas ou logotipos | P0 | CA04 |
| RNF04 | Os termos de uso da ferramenta de imagem precisam permitir uso comercial/público das imagens geradas | P0 | |
| RNF05 | Peso total das imagens do acervo inicial ≤ 30 MB (para o repositório) | P1 | CA05 |

### Dependências técnicas

- [FEAT] Modelo de dados de atividades (esquemas e campos `origin`/`reviewStatus`/`imageSource`).
- Esquemas dos 5 tipos (specs de Quiz, Flashcards, Completar lacunas, Jeopardy, Cartões de conversa).
- [FEAT] Painel admin (fila de revisão), para a revisão posterior.

### Recursos necessários

- Geração de texto: Claude (nesta sessão de desenvolvimento), sem custo adicional de API.
- Geração de imagens: uma ferramenta de imagem por IA escolhida pelo PO (ver D01). O Claude escreve os prompts, o PO gera as imagens e as salva nas pastas indicadas.
- Lista de vídeos do YouTube (canais oficiais) para Listening/Videos.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado os arquivos em `content/activities/ai/`, quando rodo `npm run seed`, então todos passam na validação e são gravados com `origin: "ai"` e `reviewStatus: "pending"`.
- [x] **CA02:** Dado o acervo gerado, quando conto por categoria, então cada uma das 9 tem ≥ 3 atividades, com pelo menos 2 níveis diferentes.
- [x] **CA03:** Dado uma amostra de 5 atividades por nível, quando o PO as revisa, então o vocabulário é adequado ao nível declarado, as respostas marcadas como corretas estão corretas e não há conteúdo inadequado para sala de aula. _(pré-revisão feita em 2026-10-01 por um agente revisor nas 29 atividades: 2 respostas ambíguas ou erradas e 10 ajustes menores, todos corrigidos nos arquivos. Pendente: amostra do PO pela fila "Needs review" do painel)_
- [x] **CA04:** Dado as imagens do acervo, quando as vejo lado a lado, então seguem o mesmo estilo visual, não contêm texto, marcas nem pessoas reais, e cada uma tem um arquivo de prompt correspondente. _(revisão lado a lado em 2026-10-01: 21 imagens saíram com moldura redonda, mandala central ou texto ("at"). Prompts corrigidos e lista "Regerar" em `content/prompts/images/README.md`. Pendente: o PO regerar as 21)_
- [x] **CA05:** Dado a pasta `/public/images/activities/`, quando verifico os arquivos, então todos são WebP, cada um tem ≤ 200 KB, os thumbnails são 16:10 e o total é ≤ 30 MB. _(automatizado em `tests/unit/activities/images.test.ts`: 38 WebP, todos ≤ 200 KB, 1,4 MB no total, thumbnails 16:10)_
- [x] **CA06:** Dado o guia `content/prompts/activities.md`, quando o uso para gerar uma atividade nova de Grammar Intermediate, então o JSON produzido passa na validação sem ajustes estruturais. _(validado em 2026-10-01: `first-and-second-conditionals` gerada pelo guia passou no `seed:check` de primeira; o guia agora tem um template por tipo, testado em `tests/unit/activities/guide.test.ts`)_
- [x] **CA07 (limite):** Dado uma atividade cuja imagem ainda não foi gerada, quando a abro no catálogo e no player, então aparece o placeholder da categoria e não uma imagem quebrada.
- [x] **CA08 (negativo):** Dado as atividades com YouTube, quando as abro, então nenhum vídeo mostra "Video unavailable / embedding disabled" (vídeos bloqueados são trocados antes da publicação).

## O que a atividade não inclui

- Revisão pedagógica completa antes do lançamento: motivo: decisão do PO de revisar depois, pela fila do painel.
- Geração automática dentro do site (botão "Generate with AI"): motivo: exige API paga; está listado como P2 no painel admin.
- Áudios gravados: motivo: usa-se TTS do navegador e YouTube.
- Acervo grande (centenas de atividades): motivo: a v1 precisa de um acervo mínimo; ele cresce depois pelo painel.

### Considerado para o futuro (P2)

- Geração de atividades e imagens pelo painel admin via API.
- Mais atividades por categoria (meta: 20+ por categoria, para encher os carrosséis).
- Selo "Reviewed by a teacher" visível para o usuário.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Qual ferramenta de imagem por IA usar (ex.: Gemini, ChatGPT/DALL·E, Microsoft Designer, Midjourney)? Os termos dela precisam permitir uso público | PO | Sim (só para imagens) | |
| D02 | Estilo visual: ilustração flat, aquarela ou foto realista? | PO/Design | Não | Ilustração flat com paleta terrosa e acento dourado (ver `content/prompts/image-style.md`) |
| D03 | Atividades pendentes de revisão devem ter algum aviso para o usuário? | PO | Não | Não na v1 |
| D04 | Sem imagens ainda, como fazer a categoria Pictures? | Dev | Não | Quizzes com emoji como figura (nova mídia `emoji`, mostrada em destaque); "Picture Description 1" fica como rascunho até as imagens existirem |
| D05 | Quais vídeos usar em Videos? | Dev | Não | Filmes abertos da Blender Foundation (Big Buck Bunny, Sintel; CC BY) e a palestra TED de Derek Sivers; todos verificados com `npm run content:check-videos` |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Seed do acervo IA | integração (emulador) | CA01 | `npm run seed` | 0 erros; campos de procedência corretos |
| CT02 | Distribuição | unit | CA02 | Script que conta arquivos por categoria/nível | ≥ 3 por categoria; ≥ 2 níveis |
| CT03 | Revisão por amostragem | manual | CA03 | PO revisa 15 atividades | Sem erros de resposta nem conteúdo inadequado |
| CT04 | Consistência visual | manual | CA04 | Grade com todas as imagens | Estilo uniforme; prompts presentes |
| CT05 | Peso e formato | unit | CA05 | Script verificando extensão, tamanho e proporção | Tudo dentro dos limites |
| CT06 | Guia reprodutível | manual | CA06 | Gerar nova atividade com o guia | JSON válido |
| CT07 | Placeholder | e2e | CA07 | Remover uma imagem e abrir | Placeholder exibido |
| CT08 | Embeds válidos | e2e | CA08 | Abrir cada atividade com YouTube | Nenhum erro de embed |

## URL Complementar

- Documentação técnica: https://www.coe.int/en/web/common-european-framework-reference-languages/table-1-cefr-3.3-common-reference-levels-global-scale (níveis CEFR)
- Protótipo / mockup: N/A.
- Discussões relacionadas: Decisões do PO: conteúdo e imagens gerados por IA, revisados depois pelo site; trechos de música via embed do YouTube.
- Referências de design: https://nfgbrentano.art.br (paleta para o estilo das imagens)
- Requisitos originais: Pedido de criar um site semelhante ao Cool English.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
