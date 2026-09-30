# [FEAT] Modelo de dados de atividades, categorias e níveis

> **Status:** Em andamento
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Definir e implementar o modelo de dados do catálogo no Firestore: atividades, categorias e níveis, com esquema tipado e validado, índices necessários e script de seed com conteúdo inicial.
- **Problema e evidência:** O site de referência organiza mais de 1.000 atividades em 9 categorias (Fun, Grammar, Listening, Pictures, Reading, Speaking, Videos, Vocabulary, Writing) e faixas de nível ("Beg", "Beg–Inter", "Inter–Adv", "Adv", "All levels"). Sem um modelo consistente, catálogo, busca, filtros e o motor de atividades não conseguem ser construídos.
- **Impacto de não fazer:** Catálogo, busca, favoritos e players ficam bloqueados ou cada um cria seu próprio formato, gerando inconsistência.
- **Para quem é destinado:** Dev e autor de conteúdo (admin).
- **História de usuário:** Como autor de conteúdo, quero que toda atividade siga um formato único e validado, para que ela apareça corretamente no catálogo e rode no player sem erros.
- **Como saberemos que deu certo:** 100% das atividades do seed passam na validação do esquema; o catálogo consegue listar e filtrar a partir delas; seed cria ≥ 3 atividades por categoria.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Coleção `activities` com os campos: `id`, `slug` (único), `title`, `description`, `category` (enum das 9 categorias), `levelMin` e `levelMax` (enum `beginner`/`intermediate`/`advanced`), `type` (`quiz`, `flashcards`, `fill-blanks`, `quiz-board`, `prompt-cards`), `thumbnail` (`{src, alt, source}`), `tags[]`, `content` (objeto específico do tipo), `status` (`draft`/`published`), `featured` (bool), `createdAt`, `updatedAt`, `searchTokens[]` | P0 | CA01 |
| RF02 | Categorias definidas como constante versionada no código (id, nome, subtítulo — ex.: "Fun · Games & activities" —, ícone, cor), não no banco | P0 | CA02 |
| RF03 | Função utilitária que converte `levelMin/levelMax` no rótulo exibido: "Beg", "Inter", "Adv", "Beg–Inter", "Inter–Adv", "All levels" | P0 | CA03 |
| RF04 | Esquemas Zod para a atividade base e para o `content` de cada tipo (discriminado por `type`), exportando os tipos TypeScript | P0 | CA01, CA04 |
| RF05 | Campo `searchTokens` gerado automaticamente (título + tags, minúsculas, sem acento) ao salvar | P0 | CA05 |
| RF06 | Script `npm run seed` que popula o Firestore (ou emulador) a partir de arquivos JSON em `content/activities/`, validando cada um | P0 | CA04, CA06 |
| RF07 | Índices compostos do Firestore (`firestore.indexes.json`) para: `status + category + createdAt`, `status + createdAt`, `status + title` | P0 | CA07 |
| RF08 | Regras do Firestore: leitura pública apenas de atividades `published`; escrita apenas por usuários com claim `admin` | P0 | CA08 |
| RF09 | Campos de procedência e revisão: `origin` (`ai` \| `human`), `reviewStatus` (`pending` \| `reviewed`), `reviewedAt?`, `reviewedBy?`. Atividades geradas por IA entram com `origin: "ai"` e `reviewStatus: "pending"` e podem ser publicadas antes da revisão | P0 | CA09 |
| RF10 | Todo objeto de imagem (`{src, alt, source}`) tem `source` (`ai` \| `stock` \| `own`) e `alt` obrigatório | P1 | CA09 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Documento de atividade ≤ 200 KB (limite de 1 MB do Firestore, com folga) | P0 | CA04 |
| RNF02 | Mídia não fica no Firestore: imagens em `/public` ou URL externa; vídeo via ID do YouTube; áudio via Web Speech API ou URL externa | P0 | CA01 |
| RNF03 | Esquema versionado (`schemaVersion`) para permitir migrações futuras | P1 | CA01 |

### Dependências técnicas

- [CHORE] Setup do projeto (`2026-09-30_setup-do-projeto.md`).
- Os tipos de `content` são detalhados nas specs de cada player (quiz, flashcards, lacunas, jeopardy, cartões de conversa).

### Recursos necessários

- Conteúdo inicial: pelo menos 3 atividades por categoria (27+) em JSON, geradas por IA e revisadas depois (ver `2026-09-30_conteudo-inicial-gerado-por-ia.md`).
- Thumbnails (imagens 16:10, ≥ 640 px de largura) geradas por IA, salvas em `/public/images/`.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado um JSON de atividade com todos os campos obrigatórios, quando ele é validado pelo esquema, então a validação passa e o objeto resultante é tipado.
- [x] **CA02:** Dado que o código importa a lista de categorias, quando ela é lida, então contém exatamente as 9 categorias com id, nome, subtítulo, ícone e cor.
- [x] **CA03:** Dado `levelMin = beginner` e `levelMax = advanced`, quando o rótulo é gerado, então retorna "All levels"; dado `intermediate`/`advanced`, retorna "Inter–Adv"; dado `beginner`/`beginner`, retorna "Beg".
- [x] **CA04:** Dado um JSON com `type = "quiz"` mas `content` no formato de flashcards, quando o seed roda, então o script falha indicando o arquivo e o campo inválido, e nenhuma atividade desse arquivo é gravada.
- [x] **CA05:** Dado uma atividade com título "Café & Idioms", quando é salva, então `searchTokens` contém "cafe" e "idioms".
- [ ] **CA06:** Dado o emulador vazio, quando rodo `npm run seed`, então todas as atividades válidas são criadas e rodar novamente não duplica registros (upsert por `slug`). _(pendente: teste em `tests/emulator/seed.test.ts`; requer Java)_
- [ ] **CA07:** Dado os índices publicados, quando o catálogo consulta atividades publicadas de uma categoria ordenadas por data, então a consulta executa sem erro de índice ausente. _(pendente: índices em `firestore.indexes.json`; publicar com `npm run deploy:rules` no projeto real)_
- [ ] **CA08 (negativo):** Dado um usuário comum autenticado, quando tenta criar ou editar um documento em `activities`, ou ler uma atividade `draft`, então a operação é negada. _(pendente: teste em `tests/emulator/firestore.rules.test.ts`; requer Java)_
- [x] **CA09:** Dado um JSON do seed sem `origin` informado, quando o seed roda a partir de `content/activities/ai/`, então a atividade é gravada com `origin: "ai"` e `reviewStatus: "pending"`; e uma imagem sem `alt` é rejeitada.

## O que a atividade não inclui

- Interface de administração para editar atividades: motivo: spec própria (painel admin).
- Busca full-text com ranking (Algolia/Typesense): motivo: complexo demais agora; tokens simples atendem ao volume inicial.
- Atividades pagas/premium (`isFree`): motivo: fora do escopo da v1 (sem pagamento).

### Considerado para o futuro (P2)

- Campo `accessTier` (`free`/`premium`) para planos pagos, sem quebrar o esquema atual.
- Coleções/"packs" de atividades (ex.: "Jeopardy Kids 1–5").
- Contadores de popularidade (`playCount`) para ordenar por "mais jogadas".

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Quem produz o conteúdo inicial (27+ atividades)? Pode ser gerado com IA e revisado? | PO | Não | Sim: gerado por IA e revisado depois, com edição no próprio site (painel admin) |
| D02 | Precisamos de níveis CEFR (A1–C2) além de Beg/Inter/Adv? | PO | Não | Começar com 3 níveis; CEFR como tag |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Atividade válida | unit | CA01 | Validar fixture completa com Zod | `success: true` |
| CT02 | Lista de categorias | unit | CA02 | Importar `CATEGORIES` | 9 itens com todos os campos |
| CT03 | Rótulos de nível | unit | CA03 | Testar todas as 6 combinações válidas | Rótulos corretos; `levelMin > levelMax` lança erro |
| CT04 | Content incompatível | unit | CA04 | Validar quiz com content de flashcards | Erro aponta `content` |
| CT05 | Tokens de busca | unit | CA05 | Gerar tokens de "Café & Idioms" | `["cafe","idioms"]` |
| CT06 | Seed idempotente | integração | CA06 | Rodar seed 2× no emulador | Contagem igual nas duas execuções |
| CT07 | Consulta com índice | integração | CA07 | Query category+status+createdAt | Retorna resultados ordenados |
| CT08 | Regras de escrita/leitura | integração | CA08 | rules-unit-testing com usuário sem claim | `PERMISSION_DENIED` |
| CT09 | Procedência IA e alt obrigatório | unit/integração | CA09 | Seed de `content/activities/ai/`; imagem sem `alt` | `origin: ai`, `pending`; erro de alt |

## URL Complementar

- Documentação técnica: https://firebase.google.com/docs/firestore/data-model · https://zod.dev
- Protótipo / mockup: N/A.
- Discussões relacionadas: N/A.
- Referências de design: https://www.coolenglish.org/activities (categorias e rótulos de nível)
- Requisitos originais: Pedido de criar um site semelhante ao Cool English.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
