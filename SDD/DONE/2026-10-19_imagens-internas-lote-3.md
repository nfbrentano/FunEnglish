# [FEAT] Imagens Internas das Atividades - Lote 3 (Story Starters, Emails & Debates)

> **Status:** Concluída
> **Autor:** Natanael Fernando Gatti Brentano · **Revisor:** Pair Programming Agent · **Criada em:** 2026-10-19 · **Atualizada em:** 2026-10-19

## Detalhes da Atividade

- **O que precisa ser feito:** Gerar e integrar 12 ilustrações internas em formato WebP para três atividades do catálogo: `story-starters-1` (carta 5 restante, completando 100% da atividade), `writing-emails-1` (5 cartas, completando 100%) e `ethical-dilemmas-and-debates` (6 cartas, completando 100%).
- **Problema e evidência:** As atividades `writing-emails-1`, `ethical-dilemmas-and-debates` e a última carta de `story-starters-1` referenciam arquivos de imagem `/images/activities/<slug>/card-N.webp` que ainda não existem em `public/images/activities/`, apresentando cards sem ilustração no player de atividades.
- **Impacto de não fazer:** Alunos e professores têm uma experiência visual incompleta durante a realização de atividades práticas de escrita de emails e discussões de dilemas éticos.
- **Para quem é destinado:** Usuários das categorias Writing e Speaking.
- **História de usuário:** Como estudante ou professor de inglês, quero ver ilustrações temáticas e atraentes em cada cartão de prompt, para enriquecer o vocabulário e estimular a criatividade e a conversação em sala de aula.
- **Como saberemos que deu certo:** Todas as 12 imagens geradas e salvas em `public/images/activities/`, formato WebP, largura ≤ 960 px, peso ≤ 100 KB cada, e 100% de aprovação na suíte de testes unitários (`npm test tests/unit/activities/images.test.ts`).

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Gerar a carta 5 de `story-starters-1` para atingir 100% de cobertura da atividade | P0 | CA01, CA04 |
| RF02 | Gerar as 5 cartas de `writing-emails-1` (card-1 a card-5) | P0 | CA02, CA04 |
| RF03 | Gerar as 6 cartas de `ethical-dilemmas-and-debates` (card-1 a card-6) | P0 | CA03, CA04 |
| RF04 | Converter as 12 imagens geradas para `.webp` redimensionadas com largura máxima de 960 px | P0 | CA04, CA05 |
| RF05 | Atualizar a checklist de prompts no arquivo `content/prompts/fila-image-playground.md` | P1 | CA06 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Cada arquivo WebP deve pesar ≤ 100 KB | P0 | CA04 |
| RNF02 | O estilo visual deve seguir estritamente o guia do projeto: flat vector, paleta terrosa quente, sem texto ou números, sem bordas | P0 | CA01, CA02, CA03 |
| RNF03 | O suite de testes unitários `tests/unit/activities/images.test.ts` deve passar sem regressões | P0 | CA05 |

### Dependências técnicas

- Subagente `image-generator` com modelos de geração de imagem Gemini.
- Node.js com biblioteca `sharp` para redimensionamento e conversão WebP.
- Vitest para execução dos testes unitários.

### Recursos necessários

- Prompts definidos no catálogo de atividades e em `content/prompts/fila-image-playground.md`.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado o catálogo de atividades, quando inspecionada a pasta `public/images/activities/story-starters-1/`, então deve existir o arquivo `card-5.webp` (completando 6/6 cartas).
- [x] **CA02:** Dado o catálogo de atividades, quando inspecionada a pasta `public/images/activities/writing-emails-1/`, então devem existir os arquivos `card-1.webp` até `card-5.webp` (5/5 cartas).
- [x] **CA03:** Dado o catálogo de atividades, quando inspecionada a pasta `public/images/activities/ethical-dilemmas-and-debates/`, então devem existir os arquivos `card-1.webp` até `card-6.webp` (6/6 cartas).
- [x] **CA04:** Dado os arquivos WebP criados, quando medidos tamanho e dimensões, então nenhum arquivo deve exceder 100 KB e a largura máxima deve ser ≤ 960 px (concluído: todas entre 12.1 KB e 74.7 KB).
- [x] **CA05:** Dado o repositório do projeto, quando executado `npm test tests/unit/activities/images.test.ts`, então o teste deve passar com sucesso sem ultrapassar o limite global de 30 MB.
- [x] **CA06:** Dado o arquivo `content/prompts/fila-image-playground.md`, quando verificados os itens correspondentes às 3 atividades, então devem estar marcados como concluídos `[x]`.

## O que a atividade não inclui

- Geração de imagens para outras atividades do catálogo: motivo: divisão em lotes gerenciáveis de ~12 imagens.
- Modificação dos componentes de UI do player: motivo: o player já suporta dinamicamente as imagens existentes nos JSONs.

### Considerado para o futuro (P2)

- Lotes subsequentes para cobrir as atividades de leitura, gramática e quiz boards.

## Dúvidas em aberto

| # | Dúvida | Responsável | Bloqueante? | Resposta |
|---|--------|-------------|-------------|----------|
| D01 | N/A | Dev | Não | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo | Cobre | Passos | Resultado esperado |
|---|---------|------|-------|--------|--------------------|
| CT01 | Validação de existência e formato | Unit | CA01, CA02, CA03, CA04, CA05 | Executar `npm test tests/unit/activities/images.test.ts` | 2/2 testes passam, todas as 12 imagens WebP válidas e dentro dos limites de peso |
| CT02 | Conferência de checklist | Manual | CA06 | Inspecionar `content/prompts/fila-image-playground.md` | Itens das 3 atividades marcados com `[x]` |

## URL Complementar

- Documentação técnica: `src/lib/admin/missing-images.ts`
- Referências de estilo: `content/prompts/image-style.md`
- Checklist de prompts: `content/prompts/fila-image-playground.md`
