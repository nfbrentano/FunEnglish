# [FEAT] Imagens Internas das Atividades - Lote 4 (Facts & Riddles, Guess the Idiom e Describe the Room)

> **Status:** Concluída
> **Autor:** Natanael Fernando Gatti Brentano · **Revisor:** Pair Programming Agent · **Criada em:** 2026-10-26 · **Atualizada em:** 2026-10-26

## Detalhes da Atividade

- **O que precisa ser feito:** Gerar e integrar 13 ilustrações internas em formato WebP para enriquecer o catálogo com a identidade visual atualizada do projeto: `crazy-world-facts-and-riddles` (7 perguntas, completando 100%), `guess-the-idiom-1` (5 perguntas, completando 100%) e `describe-the-room-and-objects` (card-1, The Cozy Living Room).
- **Problema e evidência:** As atividades `crazy-world-facts-and-riddles` e `guess-the-idiom-1` continham pendências no checklist do guia de prompts de ilustrações sem o estilo atualizado (flat vector, paleta terrosa, sem bordas/texto), e `describe-the-room-and-objects` não possuía imagens internas em `public/images/activities/`.
- **Impacto de não fazer:** Alunos e professores têm uma experiência visual inconsistente ou incompleta durante a realização de atividades práticas no player.
- **Para quem é destinado:** Usuários e estudantes que utilizam as atividades das categorias Fun e Speaking.
- **História de usuário:** Como estudante ou professor de inglês, quero ver ilustrações temáticas, suaves e atraentes em cada questão de riddles, idioms e rooms, para enriquecer o vocabulário e a compreensão visual sem distrações.
- **Como saberemos que deu certo:** Todas as 13 imagens geradas e salvas em `public/images/activities/`, formato WebP, largura ≤ 960 px, peso ≤ 100 KB cada, e 100% de aprovação na suíte de testes unitários (`npm test tests/unit/activities/images.test.ts`).

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Integrar as 7 imagens de `crazy-world-facts-and-riddles` (question-2 a question-8) atualizadas no novo estilo para 100% de cobertura (8/8) | P0 | CA01, CA04 |
| RF02 | Integrar as 5 imagens de `guess-the-idiom-1` (question-1 a question-5) atualizadas no novo estilo para 100% de cobertura (8/8) | P0 | CA02, CA04 |
| RF03 | Integrar a imagem de `describe-the-room-and-objects` (card-1, The Cozy Living Room) | P0 | CA03, CA04 |
| RF04 | Converter as 13 imagens geradas para `.webp` redimensionadas com largura máxima de 960 px e peso ≤ 100 KB | P0 | CA04, CA05 |
| RF05 | Atualizar a checklist de prompts no arquivo `content/prompts/fila-image-playground.md` marcando os itens concluídos | P1 | CA06 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Cada arquivo WebP deve pesar ≤ 100 KB | P0 | CA04 |
| RNF02 | O estilo visual deve seguir estritamente o guia do projeto: flat vector, paleta terrosa quente, sem texto ou números, sem bordas | P0 | CA01, CA02, CA03 |
| RNF03 | O suite de testes unitários `tests/unit/activities/images.test.ts` deve passar sem regressões e sem estourar o limite global de 30 MB | P0 | CA05 |

### Dependências técnicas

- Subagentes `image-generator` com modelos de geração de imagem Gemini.
- Node.js com biblioteca `sharp` para redimensionamento e conversão WebP.
- Vitest para execução dos testes unitários.

### Recursos necessários

- Prompts definidos no catálogo de atividades e em `content/prompts/fila-image-playground.md`.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado o catálogo de atividades, quando inspecionada a pasta `public/images/activities/crazy-world-facts-and-riddles/`, então devem existir todos os arquivos de `question-1.webp` até `question-8.webp` (8/8 imagens completas e no novo estilo).
- [x] **CA02:** Dado o catálogo de atividades, quando inspecionada a pasta `public/images/activities/guess-the-idiom-1/`, então devem existir todos os arquivos de `question-1.webp` até `question-8.webp` (8/8 imagens completas e no novo estilo).
- [x] **CA03:** Dado o catálogo de atividades, quando inspecionada a pasta `public/images/activities/describe-the-room-and-objects/`, então deve existir o arquivo `card-1.webp`.
- [x] **CA04:** Dado os arquivos WebP criados, quando medidos tamanho e dimensões, então nenhum arquivo deve exceder 100 KB e a largura máxima deve ser ≤ 960 px (concluído: todas entre 13.4 KB e 90.5 KB).
- [x] **CA05:** Dado o repositório do projeto, quando executado `npm test tests/unit/activities/images.test.ts`, então o teste deve passar com sucesso e o total de imagens não deve ultrapassar o limite global de 30 MB.
- [x] **CA06:** Dado o arquivo `content/prompts/fila-image-playground.md`, quando verificados os itens correspondentes às atividades, então devem estar marcados como concluídos `[x]`.

## O que a atividade não inclui

- Geração das imagens restantes de `describe-the-room-and-objects` (cards 2 a 6) e `odd-one-out-1` (8 perguntas): motivo: esgotamento temporário da cota diária do modelo `gemini-3.1-flash-image` (reset após ~4h50m).
- Modificação dos componentes de UI do player: motivo: o player já consome dinamicamente as imagens existentes nos JSONs.

### Considerado para o futuro (P2)

- Lotes subsequentes para cobrir as atividades de `odd-one-out-1`, `describe-the-room-and-objects` (restante), `quiz-board-basic-1` e atividades gramaticais assim que a cota do modelo for reestabelecida.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | N/A | Dev | Não | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Validação de existência e formato | unit | CA01, CA02, CA03, CA04, CA05 | Executar `npm test tests/unit/activities/images.test.ts` | 2/2 testes passam, todas as 13 imagens WebP válidas e dentro dos limites de peso |
| CT02 | Conferência de checklist | manual | CA06 | Inspecionar `content/prompts/fila-image-playground.md` | Itens marcados com `[x]` |

## URL Complementar

- Documentação técnica: `src/lib/admin/missing-images.ts`
- Referências de estilo: `content/prompts/image-style.md`
- Checklist de prompts: `content/prompts/fila-image-playground.md`
