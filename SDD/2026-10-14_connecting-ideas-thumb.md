# [FEAT] Geração e Integração de Capas: Connecting Ideas e Capital Letters

> **Status:** Em andamento
> **Autor:** Antigravity · **Revisor:** Natanael Brentano · **Criada em:** 2026-10-14 · **Atualizada em:** 2026-10-14

## Detalhes da Atividade

- **O que precisa ser feito:** Gerar, otimizar e integrar as capas dedicadas (`thumb.webp`) para as atividades `connecting-ideas-and-but-because` e `capital-letters-and-punctuation` no formato WebP 16:10 (960×600 px, <= 200 KB), garantindo que sejam exibidas com alta fidelidade visual nos cards do catálogo, carrosséis, página inicial e no player.
- **Problema e evidência:** Ao acessar a atividade `connecting-ideas-and-but-because` (`https://fun-english-972a2.web.app/play/connecting-ideas-and-but-because`), a tela interna exibia a arte de fallback da categoria escrita (`writing.webp`), mas o card no catálogo ficava sem thumbnail ilustrado (apenas com o ícone genérico da categoria).
- **Impacto de não fazer:** A atividade permanece com card desprovido de ilustração no catálogo, impactando negativamente o engajamento visual e a consistência da plataforma.
- **Para quem é destinado:** Professores e alunos que exploram e jogam atividades de escrita e conjunções.
- **História de usuário:** Como usuário, quero ver a capa ilustrada de Connecting Ideas no catálogo e na tela inicial, para que a atividade tenha identidade própria e seja fácil de localizar visualmente.
- **Como saberemos que deu certo:** `public/images/activities/connecting-ideas-and-but-because/thumb.webp` e `public/images/activities/capital-letters-and-punctuation/thumb.webp` estarão presentes, passando 100% no teste `tests/unit/activities/images.test.ts`, no `npm test` e compilando perfeitamente em `npm run build`.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Gerar a ilustração com peças de quebra-cabeça interconectadas para `connecting-ideas-and-but-because` e salvar como `thumb.webp`. | P0 | CA01 |
| RF02 | Gerar a ilustração com lápis, borracha e lupa para `capital-letters-and-punctuation` e salvar como `thumb.webp`. | P0 | CA01 |
| RF03 | Atualizar a lista de capas pendentes em `content/prompts/capas-pendentes.md`. | P1 | CA02 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Cada thumbnail deve seguir a proporção 16:10 (960×600 px) e ter tamanho <= 200 KB. | P0 | CA01 |
| RNF02 | O conjunto de testes `npm test` e o build de produção `npm run build` devem passar sem regressões. | P0 | CA02 |

### Dependências técnicas

- Sharp para conversão WebP
- Arquivos de imagem gerados pelo modelo

### Recursos necessários

- N/A

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que as novas capas foram salvas em `public/images/activities/`, quando executado `npx vitest run tests/unit/activities/images.test.ts`, então as dimensões (960×600), formato WebP e tamanho <= 200 KB são validados com sucesso.
- [ ] **CA02:** Dado o build completo `npm run build` e testes `npm test`, quando executados, então ambos passam com código de saída 0.

## O que a atividade não inclui

- Geração das 6 imagens restantes que aguardam o reset da cota do modelo: motivo: limite 429 da API; continuarão listadas em `capas-pendentes.md`.

### Considerado para o futuro (P2)

- Conclusão do lote 3 assim que a cota da API for liberada.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | N/A | Dev | Não | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Conformidade de imagens | unit | CA01 | Rodar `npx vitest run tests/unit/activities/images.test.ts` | Passa sem erros |
| CT02 | Build do catálogo | unit | CA02 | Rodar `npm run build` | Páginas estáticas geradas com as novas imagens |

## URL Complementar

- URL de produção: https://fun-english-972a2.web.app/play/connecting-ideas-and-but-because
