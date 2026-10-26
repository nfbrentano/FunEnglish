# [FEAT] Imagens Internas das Atividades - Lote 4 (Facts & Riddles e Guess the Idiom)

> **Status:** Em andamento
> **Autor:** Natanael Fernando Gatti Brentano · **Revisor:** Pair Programming Agent · **Criada em:** 2026-10-26 · **Atualizada em:** 2026-10-26

## Detalhes da Atividade

- **O que precisa ser feito:** Gerar e integrar 12 ilustrações internas em formato WebP para duas atividades chave da categoria Fun: `crazy-world-facts-and-riddles` (perguntas 2 a 8, completando 100% da atividade) e `guess-the-idiom-1` (perguntas 1 a 5, completando 100% da atividade).
- **Problema e evidência:** As atividades `crazy-world-facts-and-riddles` (questões 2 a 8) e `guess-the-idiom-1` (questões 1 a 5) referenciam arquivos de imagem `/images/activities/<slug>/question-N.webp` que ainda não existem em `public/images/activities/`, apresentando perguntas sem ilustração no player de atividades.
- **Impacto de não fazer:** Alunos e professores têm uma experiência visual incompleta durante a realização de atividades interativas de enigmas e expressões idiomáticas.
- **Para quem é destinado:** Usuários e estudantes que utilizam as atividades da categoria Fun.
- **História de usuário:** Como estudante ou professor de inglês, quero ver ilustrações temáticas e atraentes em cada questão de riddles e idioms, para enriquecer a compreensão visual do vocabulário e manter o engajamento na aula.
- **Como saberemos que deu certo:** Todas as 12 imagens geradas e salvas em `public/images/activities/`, formato WebP, largura ≤ 960 px, peso ≤ 100 KB cada, e 100% de aprovação na suíte de testes unitários (`npm test tests/unit/activities/images.test.ts`).

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Gerar as 7 imagens restantes de `crazy-world-facts-and-riddles` (question-2 a question-8) para atingir 100% de cobertura da atividade (8/8) | P0 | CA01, CA03 |
| RF02 | Gerar as 5 imagens restantes de `guess-the-idiom-1` (question-1 a question-5) para atingir 100% de cobertura da atividade (8/8) | P0 | CA02, CA03 |
| RF03 | Converter as 12 imagens geradas para `.webp` redimensionadas com largura máxima de 960 px e peso ≤ 100 KB | P0 | CA03, CA04 |
| RF04 | Atualizar a checklist de prompts no arquivo `content/prompts/fila-image-playground.md` marcando os itens concluídos | P1 | CA05 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Cada arquivo WebP deve pesar ≤ 100 KB | P0 | CA03 |
| RNF02 | O estilo visual deve seguir estritamente o guia do projeto: flat vector, paleta terrosa quente, sem texto ou números, sem bordas | P0 | CA01, CA02 |
| RNF03 | O suite de testes unitários `tests/unit/activities/images.test.ts` deve passar sem regressões e sem estourar o limite global de 30 MB | P0 | CA04 |

### Dependências técnicas

- Subagente `image-generator` com modelos de geração de imagem Gemini.
- Node.js com biblioteca `sharp` para redimensionamento e conversão WebP.
- Vitest para execução dos testes unitários.

### Recursos necessários

- Prompts definidos no catálogo de atividades e em `content/prompts/fila-image-playground.md`.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado o catálogo de atividades, quando inspecionada a pasta `public/images/activities/crazy-world-facts-and-riddles/`, então devem existir todos os arquivos de `question-1.webp` até `question-8.webp` (8/8 imagens completas).
- [ ] **CA02:** Dado o catálogo de atividades, quando inspecionada a pasta `public/images/activities/guess-the-idiom-1/`, então devem existir todos os arquivos de `question-1.webp` até `question-8.webp` (8/8 imagens completas).
- [ ] **CA03:** Dado os arquivos WebP criados, quando medidos tamanho e dimensões, então nenhum arquivo deve exceder 100 KB e a largura máxima deve ser ≤ 960 px.
- [ ] **CA04:** Dado o repositório do projeto, quando executado `npm test tests/unit/activities/images.test.ts`, então o teste deve passar com sucesso e o total de imagens não deve ultrapassar o limite global de 30 MB.
- [ ] **CA05:** Dado o arquivo `content/prompts/fila-image-playground.md`, quando verificados os itens correspondentes às duas atividades, então devem estar marcados como concluídos `[x]`.

## O que a atividade não inclui

- Geração de imagens para outras atividades do catálogo: motivo: divisão em lotes gerenciáveis de ~12 imagens.
- Modificação dos componentes de UI do player: motivo: o player já suporta dinamicamente as imagens existentes nos JSONs.

### Considerado para o futuro (P2)

- Lotes subsequentes para cobrir as atividades de `odd-one-out-1`, `quiz-board-basic-1` e atividades gramaticais.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | N/A | Dev | Não | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Validação de existência e formato | unit | CA01, CA02, CA03, CA04 | Executar `npm test tests/unit/activities/images.test.ts` | 2/2 testes passam, todas as 12 imagens WebP válidas e dentro dos limites de peso |
| CT02 | Conferência de checklist | manual | CA05 | Inspecionar `content/prompts/fila-image-playground.md` | Itens das 2 atividades marcados com `[x]` |

## URL Complementar

- Documentação técnica: `src/lib/admin/missing-images.ts`
- Referências de estilo: `content/prompts/image-style.md`
- Checklist de prompts: `content/prompts/fila-image-playground.md`
