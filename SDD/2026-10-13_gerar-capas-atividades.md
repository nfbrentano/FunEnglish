# [FEAT] Geração das Capas (Thumbnails) Faltantes das Atividades

> **Status:** Em andamento
> **Autor:** Antigravity · **Revisor:** Natanael Brentano · **Criada em:** 2026-10-13 · **Atualizada em:** 2026-10-13

## Detalhes da Atividade

- **O que precisa ser feito:** Gerar e importar as 45 capas (thumbnails 16:10, 960x600 em formato WebP otimizado <= 200 KB) faltantes para as atividades do catálogo do Fun English, utilizando a ferramenta de geração visual com os prompts curados já definidos no projeto.
- **Problema e evidência:** 45 atividades no catálogo ainda não possuem arquivo físico de capa em `public/images/activities/<slug>/thumb.webp`, exibindo placeholders ou ausência de imagem nos cards do catálogo, busca e dashboard.
- **Impacto de não fazer:** O catálogo de atividades fica com lacunas visuais nos cards das atividades criadas recentemente, degradando a experiência do usuário e a atratividade pedagógica da plataforma.
- **Para quem é destinado:** Professores, alunos e visitantes do catálogo do Fun English.
- **História de usuário:** Como professor de inglês navegando pelo catálogo de atividades, quero ver capas ilustrativas e atraentes para todas as atividades disponíveis, para escolher rapidamente o conteúdo ideal para as minhas aulas.
- **Como saberemos que deu certo:** 100% das 45 atividades possuirão seu arquivo `thumb.webp` gerado em conformidade com as regras de proporção (16:10), dimensões (960x600) e peso (<= 200 KB), com aprovação do teste `tests/unit/activities/images.test.ts`.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Gerar ilustrações para as 45 atividades pendentes utilizando o estilo visual padronizado do projeto (flat vector, paleta terrosa, sem textos/letras, proporção 16:10). | P0 | CA01 |
| RF02 | Redimensionar e converter cada imagem para WebP na resolução 960x600 e tamanho de arquivo <= 200 KB em `public/images/activities/<slug>/thumb.webp`. | P0 | CA02 |
| RF03 | Atualizar o checklist em `content/prompts/fila-image-playground.md` marcando as capas concluídas. | P1 | CA03 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Cada thumbnail deve ser 16:10 (960×600 px) e possuir tamanho de arquivo <= 200 KB, atendendo às regras do teste `images.test.ts`. | P0 | CA02 |
| RNF02 | O total de imagens do projeto deve permanecer dentro do limite de 30 MB. | P0 | CA02 |
| RNF03 | O comando `npm test` deve passar com 100% de sucesso. | P0 | CA02 |

### Dependências técnicas

- Sharp, Node.js fs, ferramenta de geração de imagem.

### Recursos necessários

- Prompts definidos nos JSONs em `content/activities/`.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado o conjunto de 45 atividades sem capa, quando as imagens forem geradas, então cada uma refletirá a descrição pedagógica do respectivo prompt.
- [ ] **CA02:** Dado que as 45 capas foram salvas em `public/images/activities/<slug>/thumb.webp`, quando executado `npx vitest run tests/unit/activities/images.test.ts`, então todas passam com proporção 16:10 e tamanho <= 200 KB.
- [ ] **CA03:** Dado o documento `content/prompts/fila-image-playground.md`, quando o processamento for finalizado, os itens correspondentes às capas são atualizados.

## O que a atividade não inclui

- Geração das 500 imagens internas (itens/questões): motivo: escopo priorizado pelo usuário especificamente para as 45 capas do catálogo.

### Considerado para o futuro (P2)

- Geração em lote das imagens de questões internas por categoria.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | N/A | Dev | Não | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Validação de especificações de imagens | unit | CA02 | Rodar `npx vitest run tests/unit/activities/images.test.ts` | 2 testes passando sem violações |
| CT02 | Presença física de todas as 45 capas | unit / fs | CA01, CA02 | Verificar existência de `thumb.webp` em cada slug | 45 novos arquivos encontrados |
| CT03 | Build e testes gerais da aplicação | unit / build | CA02 | Rodar `npm test && npm run build` | Sucesso total |

## URL Complementar

- Documentação técnica: `content/prompts/image-style.md`
- Issue / PR relacionado: N/A
