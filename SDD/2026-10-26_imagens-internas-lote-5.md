# [FEAT] Imagens Internas das Atividades - Lote 5 (Odd One Out e Describe the Room Restante)

> **Status:** Em andamento (Agendada para 15:36)
> **Autor:** Natanael Fernando Gatti Brentano · **Revisor:** Pair Programming Agent · **Criada em:** 2026-10-26 · **Atualizada em:** 2026-10-26

## Detalhes da Atividade

- **O que precisa ser feito:** Gerar e integrar 13 ilustrações internas em formato WebP para duas atividades do catálogo: `odd-one-out-1` (8 perguntas, completando 100% da atividade) e `describe-the-room-and-objects` (cards 2 a 6, completando 100% da atividade).
- **Problema e evidência:** As atividades `odd-one-out-1` (questões 1 a 8) e `describe-the-room-and-objects` (cards 2 a 6) ainda não possuem seus arquivos de imagem em `public/images/activities/`, apresentando cards sem ilustração no player.
- **Impacto de não fazer:** Alunos e professores têm uma experiência visual incompleta durante a realização de atividades práticas de vocabulário, lógica e descrição de cenários.
- **Para quem é destinado:** Usuários e estudantes que utilizam as atividades das categorias Fun e Speaking.
- **História de usuário:** Como estudante ou professor de inglês, quero ver ilustrações temáticas e atrativas em cada cartão de Odd One Out e Describe the Room, para enriquecer o vocabulário e a compreensão contextual.
- **Como saberemos que deu certo:** Todas as 13 imagens geradas e salvas em `public/images/activities/`, formato WebP, largura ≤ 960 px, peso ≤ 100 KB cada, e 100% de aprovação na suíte de testes unitários (`npm test tests/unit/activities/images.test.ts`).

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Gerar as 8 imagens de `odd-one-out-1` (question-1 a question-8) para atingir 100% de cobertura da atividade (8/8) | P0 | CA01, CA03 |
| RF02 | Gerar as 5 imagens restantes de `describe-the-room-and-objects` (card-2 a card-6) para atingir 100% de cobertura da atividade (6/6) | P0 | CA02, CA03 |
| RF03 | Converter as 13 imagens geradas para `.webp` redimensionadas com largura máxima de 960 px e peso ≤ 100 KB | P0 | CA03, CA04 |
| RF04 | Atualizar a checklist de prompts no arquivo `content/prompts/fila-image-playground.md` marcando os itens concluídos | P1 | CA05 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Cada arquivo WebP deve pesar ≤ 100 KB | P0 | CA03 |
| RNF02 | O estilo visual deve seguir estritamente o guia do projeto: flat vector, paleta terrosa quente, sem texto ou números, sem bordas | P0 | CA01, CA02 |
| RNF03 | O suite de testes unitários `tests/unit/activities/images.test.ts` deve passar sem regressões | P0 | CA04 |

### Dependências técnicas

- Subagentes `image-generator` com modelos de geração de imagem Gemini.
- Node.js com biblioteca `sharp` para redimensionamento e conversão WebP.
- Vitest para execução dos testes unitários.

### Recursos necessários

- Prompts definidos no catálogo de atividades e em `content/prompts/fila-image-playground.md`.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado o catálogo de atividades, quando inspecionada a pasta `public/images/activities/odd-one-out-1/`, então devem existir todos os arquivos de `question-1.webp` até `question-8.webp` (8/8 imagens completas).
- [ ] **CA02:** Dado o catálogo de atividades, quando inspecionada a pasta `public/images/activities/describe-the-room-and-objects/`, então devem existir todos os arquivos de `card-1.webp` até `card-6.webp` (6/6 imagens completas).
- [ ] **CA03:** Dado os arquivos WebP criados, quando medidos tamanho e dimensões, então nenhum arquivo deve exceder 100 KB e a largura máxima deve ser ≤ 960 px.
- [ ] **CA04:** Dado o repositório do projeto, quando executado `npm test tests/unit/activities/images.test.ts`, então o teste deve passar com sucesso e o total de imagens não deve ultrapassar o limite global de 30 MB.
- [ ] **CA05:** Dado o arquivo `content/prompts/fila-image-playground.md`, quando verificados os itens correspondentes às duas atividades, então devem estar marcados como concluídos `[x]`.

## O que a atividade não inclui

- Geração de imagens para outras atividades do catálogo: motivo: divisão em lotes gerenciáveis de ~13 imagens.
- Modificação dos componentes de UI do player: motivo: o player já consome dinamicamente as imagens existentes nos JSONs.

### Considerado para o futuro (P2)

- Lotes subsequentes para cobrir as atividades de `quiz-board-basic-1`, `mystery-scenes-what-just-happened` e `some-or-any`.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | N/A | Dev | Não | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Validação de existência e formato | unit | CA01, CA02, CA03, CA04 | Executar `npm test tests/unit/activities/images.test.ts` | 2/2 testes passam, todas as 13 imagens WebP válidas e dentro dos limites de peso |
| CT02 | Conferência de checklist | manual | CA05 | Inspecionar `content/prompts/fila-image-playground.md` | Itens marcados com `[x]` |

## URL Complementar

- Documentação técnica: `src/lib/admin/missing-images.ts`
- Referências de estilo: `content/prompts/image-style.md`
- Checklist de prompts: `content/prompts/fila-image-playground.md`
