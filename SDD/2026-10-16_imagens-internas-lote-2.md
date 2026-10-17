# [FEAT] Imagens Internas das Atividades - Lote 2 (Storytelling Cards)

> **Status:** Em andamento
> **Autor:** Natanael Fernando Gatti Brentano · **Revisor:** Pair Programming Agent · **Criada em:** 2026-10-16 · **Atualizada em:** 2026-10-16

## Detalhes da Atividade

- **O que precisa ser feito:** Gerar e integrar 12 ilustrações internas em formato WebP para duas atividades de escrita e contação de histórias baseadas em cartas de prompts: `fun-creative-story-sparks` (6 cartas) e `story-starters-1` (6 cartas).
- **Problema e evidência:** As atividades `fun-creative-story-sparks` e `story-starters-1` referenciam arquivos de imagem `/images/activities/<slug>/card-N.webp` que ainda não existem em `public/images/activities/`, resultando em fallbacks de imagem ou cartões sem ilustração no player de atividades.
- **Impacto de não fazer:** A experiência pedagógica e visual dos alunos fica empobrecida e incompleta durante atividades narrativas e de escrita criativa.
- **Para quem é destinado:** Alunos e professores que utilizam os módulos de Speaking e Writing / Storytelling.
- **História de usuário:** Como estudante ou professor de inglês, quero visualizar ilustrações temáticas inspiradoras em cada cartão de história, para compreender o tema e ter ideias ricas para conversar e redigir em inglês.
- **Como saberemos que deu certo:** Todas as 12 imagens geradas e salvas em `public/images/activities/`, formato WebP, largura ≤ 960 px, peso ≤ 100 KB cada, e 100% de aprovação na suíte de testes automatizados (`npm test tests/unit/activities/images.test.ts`).

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Gerar 6 imagens para as cartas da atividade `fun-creative-story-sparks` (card-1 a card-6) | P0 | CA01, CA03 |
| RF02 | Gerar 6 imagens para as cartas da atividade `story-starters-1` (card-1 a card-6) | P0 | CA02, CA03 |
| RF03 | Converter todas as 12 imagens geradas para `.webp` redimensionadas para largura máxima de 960 px | P0 | CA03, CA04 |
| RF04 | Atualizar a checklist de prompts no arquivo `content/prompts/fila-image-playground.md` | P1 | CA05 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Cada arquivo WebP de ilustração interna de conteúdo deve pesar ≤ 100 KB | P0 | CA03 |
| RNF02 | O estilo visual deve seguir estritamente o guia de estilo do projeto: flat vector, paleta terrosa quente, sem textos ou números, sem bordas | P0 | CA01, CA02 |
| RNF03 | O suite de testes unitários `tests/unit/activities/images.test.ts` deve passar sem regressões | P0 | CA04 |

### Dependências técnicas

- Subagente `image-generator` com modelos de geração de imagem.
- Node.js com biblioteca `sharp` para redimensionamento e conversão WebP.
- Vitest para execução dos testes unitários.

### Recursos necessários

- Prompts definidos no catálogo de atividades e em `content/prompts/fila-image-playground.md`.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado o catálogo de atividades, quando inspecionada a pasta `public/images/activities/fun-creative-story-sparks/`, então devem existir os arquivos `card-1.webp` até `card-6.webp` (100% concluído).
- [ ] **CA02:** Dado o catálogo de atividades, quando inspecionada a pasta `public/images/activities/story-starters-1/`, então devem existir os arquivos `card-1.webp` até `card-6.webp` (5/6 concluído: card-1, card-2, card-3, card-4, card-6 presentes; card-5 aguardando reset de cota às 04:35 BRT).
- [x] **CA03:** Dado os arquivos WebP criados, quando medidos tamanho e dimensões, então nenhum arquivo deve exceder 100 KB e a largura máxima deve ser ≤ 960 px (concluído: todas entre 14.8 KB e 39.7 KB).
- [x] **CA04:** Dado o repositório do projeto, quando executado `npm test tests/unit/activities/images.test.ts`, então o teste deve passar com sucesso sem ultrapassar o limite global de 30 MB.
- [ ] **CA05:** Dado o arquivo `content/prompts/fila-image-playground.md`, quando verificados os itens de `fun-creative-story-sparks` e `story-starters-1`, então todos devem estar marcados como concluídos `[x]` (11/12 marcados).

## O que a atividade não inclui

- Geração de imagens para outras atividades além de `fun-creative-story-sparks` e `story-starters-1`: motivo: escopo delimitado em lotes manejáveis (Lote 2 com 12 imagens).
- Alteração da lógica dos componentes de frontend ou player: motivo: a arquitetura já suporta nativamente as imagens existentes nos arquivos JSON.

### Considerado para o futuro (P2)

- Lotes subsequentes para completar as imagens de quiz boards, leituras e vocabulário restantes.

## Dúvidas em aberto

| # | Dúvida | Responsável | Bloqueante? | Resposta |
|---|--------|-------------|-------------|----------|
| D01 | N/A | Dev | Não | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo | Cobre | Passos | Resultado esperado |
|---|---------|------|-------|--------|--------------------|
| CT01 | Validação de existência e formato | Unit | CA01, CA02, CA03, CA04 | Executar `npm test tests/unit/activities/images.test.ts` | 2/2 testes passam, todas as imagens WebP válidas e dentro dos limites de peso |
| CT02 | Conferência de checklist | Manual | CA05 | Inspecionar `content/prompts/fila-image-playground.md` | Itens das 2 atividades marcados com `[x]` |

## URL Complementar

- Documentação técnica: `src/lib/admin/missing-images.ts`
- Referências de estilo: `content/prompts/image-style.md`
- Checklist de prompts: `content/prompts/fila-image-playground.md`
