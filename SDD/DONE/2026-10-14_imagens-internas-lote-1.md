# [FEAT] Geração de Imagens Internas das Atividades - Lote 1

> **Status:** Concluída
> **Autor:** Antigravity · **Revisor:** Natanael Brentano · **Criada em:** 2026-10-14 · **Atualizada em:** 2026-10-16

## Detalhes da Atividade

- **O que precisa ser feito:** Gerar e converter 12 imagens internas (largura <= 960 px, peso <= 100 KB para cartões e perguntas, formato WebP) para completar 100% das imagens de 6 atividades: `crazy-world-facts-and-riddles`, `sintel-watch-and-answer`, `ted-keep-your-goals-to-yourself`, `whats-the-best-reply`, `this-or-that-1` e `guess-the-idiom-1`.
- **Problema e evidência:** Essas 6 atividades possuem apenas de 1 a 3 imagens internas faltantes em `public/images/activities/<slug>/`, deixando exercícios sem apoio visual ilustrado.
- **Impacto de não fazer:** A experiência interativa dos alunos nessas atividades fica com placeholders vazios ou ausência de ilustrações pedagógicas.
- **Para quem é destinado:** Alunos e professores que utilizam essas atividades interativas em aula ou tarefa.
- **História de usuário:** Como aluno de inglês, quero visualizar ilustrações temáticas e educativas em cada questão/carta, facilitando a compreensão contextual dos enigmas e expressões.
- **Como saberemos que deu certo:** 100% das 12 imagens internas dessas 6 atividades estarão presentes em WebP, aprovadas em `npm test` e validadas por `images.test.ts`.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Gerar as 12 ilustrações internas conforme prompts curados em `content/prompts/fila-image-playground.md`. | P0 | CA01 |
| RF02 | Redimensionar e converter cada imagem para WebP na resolução adequada (largura <= 960 px, tamanho <= 100 KB). | P0 | CA02 |
| RF03 | Atualizar o checklist em `content/prompts/fila-image-playground.md`. | P1 | CA03 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Cada imagem interna deve ser WebP <= 100 KB e largura <= 960 px, atendendo ao teste `images.test.ts`. | P0 | CA02 |
| RNF02 | O total de imagens do projeto deve permanecer dentro do limite de 30 MB. | P0 | CA02 |
| RNF03 | O comando `npm test` deve passar com 100% de sucesso. | P0 | CA02 |

### Dependências técnicas

- Sharp, Node.js fs, ferramenta de geração de imagens.

### Recursos necessários

- Prompts definidos em `content/prompts/fila-image-playground.md` e JSONs das atividades.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado o conjunto de 12 imagens internas faltantes para as 6 atividades, quando geradas, então cada imagem reflete a descrição pedagógica do prompt.
- [x] **CA02:** Dado que as 12 imagens foram salvas em `public/images/activities/<slug>/<name>.webp`, quando executado `npx vitest run tests/unit/activities/images.test.ts`, então todas passam com tamanho <= 100 KB e formato WebP.
- [x] **CA03:** Dado o documento `content/prompts/fila-image-playground.md`, os itens correspondentes a essas 12 imagens são marcados como concluídos.

## O que a atividade não inclui

- Geração de imagens internas de atividades de grande porte (essas serão tratadas em lotes futuros).

### Considerado para o futuro (P2)

- Lotes subsequentes de imagens internas para quiz boards e leitura.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | N/A | Dev | Não | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Validação de especificações de imagens | unit | CA02 | Rodar `npx vitest run tests/unit/activities/images.test.ts` | Testes passando |
| CT02 | Presença física de todas as 12 imagens | unit / fs | CA01, CA02 | Verificar existência dos arquivos nos respectivos slugs | 12 novos arquivos encontrados |
| CT03 | Suíte completa | unit | CA02 | Rodar `npm test` | Sucesso total |

## URL Complementar

- Documentação técnica: `content/prompts/fila-image-playground.md`
- Issue / PR relacionado: N/A
