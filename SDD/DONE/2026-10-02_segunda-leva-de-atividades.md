# [FEAT] Segunda leva de atividades: preencher as lacunas do catálogo

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-02 · **Atualizada em:** 2026-10-03

## Detalhes da Atividade

- **O que precisa ser feito:** Gerar com IA uma segunda leva de 21 atividades originais para que cada categoria (exceto Videos) tenha pelo menos 3 atividades publicadas em cada nível (Beginner, Intermediate, Advanced), variando também os tipos (hoje 23 de 36 são quiz).
- **Problema e evidência:** A página Coverage do admin mostra 17 combinações categoria × nível com menos de 3 publicadas: Writing Beginner tem 0, Listening Advanced tem 0, Pictures tem 1 em Beginner e Advanced, Reading Beginner tem 1, Grammar Advanced tem 1, entre outras. Um professor que filtra Writing + Beginner não encontra nada.
- **Impacto de não fazer:** Professores de turmas iniciantes ou avançadas saem sem atividade; o catálogo parece pequeno perto do Cool English.
- **Para quem é destinado:** Professor de ESL que filtra por categoria e nível; PO, que revisa o conteúdo no painel.
- **História de usuário:** Como professor de uma turma iniciante, quero encontrar ao menos 3 atividades em cada categoria para o nível dela, para variar as aulas sem sair do site.
- **Como saberemos que deu certo:** Coverage sem nenhuma célula abaixo de 3 nas 8 categorias (Videos fora); `npm run seed:check` sem erros; 0 erros no console ao jogar cada atividade nova.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | 21 atividades novas em `content/activities/ai/<categoria>/`, seguindo `content/prompts/activities.md` (regras por tipo, inglês americano, texto original, seguro para sala de aula) | P0 | CA01, CA02 |
| RF02 | Distribuição que leva cada célula categoria × nível (exceto Videos) a ≥ 3 publicadas: Fun 2, Grammar 3, Listening 3 (avançado, com áudio TTS), Pictures 4 (emoji), Reading 3, Speaking 1, Vocabulary 2, Writing 3 | P0 | CA03 |
| RF03 | Tipos variados: pelo menos 2 quiz-board, 2 fill-blanks, 1 flashcards e 2 prompt-cards na leva | P1 | CA03 |
| RF04 | Cada atividade com thumbnail com `alt` e `prompt`, e imagens planejadas por item (`npm run images:plan`) com as metas de 80% (Beginner/Intermediate) e 50% (Advanced) | P0 | CA04 |
| RF05 | Publicadas com `origin: ai` e `reviewStatus: pending`, entrando na fila "Needs review" do painel (mesma decisão da primeira leva) | P0 | CA05 |
| RF06 | Slugs que não existem no catálogo; o seed não sobrescreve atividades editadas no painel | P0 | CA06 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Quiz: exatamente uma resposta certa por pergunta e explicação de uma frase; sem alternativas ambíguas | P0 | CA02 |
| RNF02 | Vocabulário e gramática adequados ao CEFR do nível (A1–A2, B1–B2, C1–C2) | P0 | CA02 |
| RNF03 | Nenhuma imagem quebrada: imagens ainda não enviadas mostram o substituto do player | P0 | CA04 |

### Dependências técnicas

- Modelo de dados e validador (`src/lib/activities/schema/`), seed (`scripts/seed.ts`), `npm run images:plan`.
- Firestore é a fonte de verdade: o PO roda o seed em produção depois do merge.

### Recursos necessários

- PO para rodar `npm run seed -- --production` com a chave de admin e revisar as atividades na fila.
- Geração das imagens pelo painel (Missing images), como na leva anterior.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado os 21 arquivos novos, quando rodo `npm run seed:check`, então todos passam sem erros.
- [x] **CA02:** Dado qualquer quiz novo, quando o reviso, então cada pergunta tem exatamente uma alternativa correta e uma explicação.
- [x] **CA03:** Dado o conteúdo após a leva, quando calculo a cobertura por categoria × nível, então nenhuma célula (exceto Videos) tem menos de 3 publicadas.
- [x] **CA04:** Dado uma atividade nova sem imagens enviadas, quando a jogo, então não há imagem quebrada nem erro 404 no console.
- [x] **CA05:** Dado o seed rodado, quando abro o painel admin, então as 21 aparecem em "Needs review".
- [x] **CA06 (negativo):** Dado uma atividade existente editada no painel, quando rodo o seed com a leva nova, então ela não é sobrescrita.

### Notas de implementação

- 21 arquivos em `content/activities/ai/` (Fun 2, Grammar 3, Listening 3, Pictures 4, Reading 3, Speaking 1, Vocabulary 2, Writing 3); tipos: 14 quiz, 2 quiz-board, 2 fill-blanks, 2 prompt-cards, 1 flashcards.
- Cobertura publicada depois da leva (Beg/Inter/Adv): Fun 3/5/3, Grammar 3/8/3, Listening 4/5/3, Pictures 3/4/3, Reading 3/5/3, Speaking 3/4/3, Vocabulary 3/3/3, Writing 3/5/3 (Videos 1/3/2, fora do escopo).
- 132 imagens planejadas por item (`images:plan`), com `alt` reescrito para nunca revelar a resposta. Listening (TTS) e Pictures (emoji) já têm o visual do item; Weather Words usa emoji na frente dos cartões.
- Revisão: 1 alternativa ambígua corrigida (Mixed Conditionals, pergunta 2: "hadn't been" também seria certo).
- e2e: o teste de busca por Grammar + Beginner inclui a atividade nova; o teste de Coverage passou a usar a lacuna Videos × Beginner (Listening × Advanced foi preenchida).
- CA05 validado no painel admin (21 atividades listadas em "Needs review"); CA06 validado via testes automatizados no emulador (`tests/emulator/seed.test.ts`).

## O que a atividade não inclui

- Atividades de Videos: motivo: exigem vídeos reais de canais oficiais assistidos para escrever as perguntas; fica para uma leva específica.
- Geração dos arquivos de imagem: motivo: o PO gera e envia pelo painel (Missing images).
- Revisão pedagógica final: motivo: feita pelo PO na fila "Needs review".

### Considerado para o futuro (P2)

- Leva de Videos com vídeos verificados (`npm run content:check-videos`).
- Uma meta mais alta (5 por célula) quando o catálogo crescer.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Publicar direto ou como rascunho? | PO | Não | Publicar com revisão pendente, como na primeira leva (decisão "conteúdo de IA revisado depois no painel") |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Validação | integração | CA01 | `npm run seed:check` | 0 erros |
| CT02 | Uma resposta certa | unit (script) | CA02 | Conferir `correct` por pergunta nos arquivos novos | Exatamente 1 |
| CT03 | Cobertura | unit (script) | CA03 | Contar publicadas por categoria × nível | ≥ 3 em todas (exceto Videos) |
| CT04 | Sem imagem quebrada | e2e | CA04 | Suíte e2e completa (seed inclui o conteúdo real) | Verde |
| CT05 | Fila de revisão | manual | CA05 | Abrir /admin, filtro Needs review | 21 novas listadas |
| CT06 | Seed não sobrescreve | integração | CA06 | `tests/emulator/seed.test.ts` (CA08/CA09 da gestão) | Verde |

## URL Complementar

- Documentação técnica: `content/prompts/activities.md`, `content/prompts/image-style.md`.
- Protótipo / mockup: N/A.
- Discussões relacionadas: SDD/2026-09-30_conteudo-inicial-gerado-por-ia.md (primeira leva).
- Referências de design: https://coolenglish.org/activities
- Requisitos originais: Pedido do PO "pode gerar mais atividades".
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
