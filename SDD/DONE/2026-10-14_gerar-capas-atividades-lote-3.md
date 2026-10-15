# [FEAT] Geração das Capas (Thumbnails) Faltantes das Atividades - Lote 3 (Final)

> **Status:** Concluída
> **Autor:** Antigravity · **Revisor:** Natanael Brentano · **Criada em:** 2026-10-14 · **Atualizada em:** 2026-10-14

## Detalhes da Atividade

- **O que precisa ser feito:** Gerar e converter as 6 capas (thumbnails 16:10, 960x600 em formato WebP otimizado <= 200 KB) restantes para as atividades do catálogo do Fun English, atingindo 100% de cobertura de capas.
- **Problema e evidência:** 6 atividades no catálogo ainda não possuem arquivo de capa (`thumb.webp`) em `public/images/activities/<slug>/`: `conjunctions-in-context`, `connecting-clauses-because-and-so`, `formal-email-sentences`, `giving-opinions-sentence-builder`, `opinion-essays-and-arguments`, `writing-complaint-letters`.
- **Impacto de não fazer:** Os cards dessas 6 atividades no catálogo e na tela inicial ficam desprovidos de imagem de capa ilustrada.
- **Para quem é destinado:** Professores e alunos que exploram o catálogo de atividades de ESL.
- **História de usuário:** Como professor de inglês, quero visualizar capas ilustrativas e atraentes para todas as atividades do catálogo, facilitando o planejamento e seleção de exercícios em sala de aula.
- **Como saberemos que deu certo:** 100% das 6 atividades restantes possuirão seus arquivos `thumb.webp` gerados na proporção 16:10, com dimensões 960×600 px e peso <= 200 KB, com aprovação completa em `npm test` e compilação limpa em `npm run build`.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Gerar as ilustrações para as 6 atividades restantes conforme prompts curados em `content/prompts/capas-pendentes.md`. | P0 | CA01 |
| RF02 | Redimensionar e converter cada imagem para WebP na resolução 960x600 e tamanho de arquivo <= 200 KB em `public/images/activities/<slug>/thumb.webp`. | P0 | CA02 |
| RF03 | Atualizar o checklist em `content/prompts/fila-image-playground.md` e esvaziar/atualizar `capas-pendentes.md`. | P1 | CA03 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Cada thumbnail deve ser 16:10 (960×600 px) e possuir tamanho de arquivo <= 200 KB, atendendo às regras do teste `images.test.ts`. | P0 | CA02 |
| RNF02 | O total de imagens do projeto deve permanecer dentro do limite de 30 MB. | P0 | CA02 |
| RNF03 | O comando `npm test` deve passar com 100% de sucesso. | P0 | CA02 |

### Dependências técnicas

- Sharp, Node.js fs, ferramenta de geração de imagem.

### Recursos necessários

- Prompts definidos em `content/prompts/capas-pendentes.md`.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado o conjunto de 6 atividades sem capa, quando as ilustrações forem geradas, então cada uma refletirá a descrição pedagógica do respectivo prompt.
- [x] **CA02:** Dado que as 6 capas foram salvas em `public/images/activities/<slug>/thumb.webp`, quando executado `npx vitest run tests/unit/activities/images.test.ts`, então todas passam com proporção 16:10 e tamanho <= 200 KB.
- [x] **CA03:** Dado o documento `content/prompts/fila-image-playground.md`, quando o processamento for finalizado, os itens correspondentes às capas são marcados como concluídos.

## O que a atividade não inclui

- Geração das ilustrações internas (itens/questões): motivo: escopo priorizado para conclusão de 100% das capas do catálogo.

### Considerado para o futuro (P2)

- Geração em lotes das questões internas de atividades interativas.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | N/A | Dev | Não | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Validação de especificações de imagens | unit | CA02 | Rodar `npx vitest run tests/unit/activities/images.test.ts` | 2 testes passando sem violações |
| CT02 | Presença física de todas as 6 capas | unit / fs | CA01, CA02 | Verificar existência de `thumb.webp` em cada slug | 6 novos arquivos encontrados |
| CT03 | Suíte completa e build de produção | unit / build | CA02 | Rodar `npm test && npm run build` | Sucesso total |

## URL Complementar

- Documentação técnica: `content/prompts/capas-pendentes.md`
- Issue / PR relacionado: N/A
