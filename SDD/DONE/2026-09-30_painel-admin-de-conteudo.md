# [FEAT] Painel admin de conteúdo

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-10-01

## Detalhes da Atividade

- **O que precisa ser feito:** Criar a área `/admin`, acessível apenas a usuários com claim `admin`, para listar, criar, editar, duplicar, publicar/despublicar e excluir atividades. A edição usa um formulário com os metadados (título, categoria, níveis, tags, thumbnail) e um editor JSON do `content` com validação em tempo real e botão "Preview" que abre o player.
- **Problema e evidência:** Com o seed via JSON, qualquer ajuste de conteúdo exige deploy ou script. Para chegar a centenas de atividades (a referência tem 1.300+), o autor precisa de uma ferramenta de edição.
- **Impacto de não fazer:** O crescimento do acervo depende de dev; erros de conteúdo só aparecem em produção.
- **Para quem é destinado:** Autor de conteúdo / admin.
- **História de usuário:** Como autor de conteúdo, quero criar e editar atividades num painel com validação e pré-visualização, para publicar conteúdo novo sem depender de deploy.
- **Como saberemos que deu certo:** Criar e publicar uma atividade nova em < 10 min sem tocar no código; 0 atividades publicadas com `content` inválido; revisar uma atividade gerada por IA em < 5 min.
- **Contexto:** o acervo inicial será gerado por IA e publicado antes da revisão. O painel precisa de uma fila de revisão e de edição direta no site.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Rota `/admin` protegida: exige login e custom claim `admin: true` | P0 | CA01, CA08 |
| RF02 | Lista de atividades com busca por título, filtro por categoria/status/tipo e colunas: título, categoria, tipo, status, atualizado em | P0 | CA02 |
| RF03 | Formulário de metadados: título, slug (gerado do título, editável, único), descrição, categoria, nível mín./máx., tipo, tags, URL do thumbnail com pré-visualização, destaque | P0 | CA03 |
| RF04 | Editor JSON do `content` (ex.: Monaco/CodeMirror) com validação pelo esquema Zod do tipo e erros apontando o caminho (ex.: `questions[3].options`) | P0 | CA04 |
| RF05 | Botão "Insert template" que preenche o `content` com um exemplo mínimo válido do tipo escolhido | P1 | CA05 |
| RF06 | "Preview" abre o player com o conteúdo não salvo (sem publicar) | P0 | CA06 |
| RF07 | Ações: salvar rascunho, publicar, despublicar, duplicar, excluir (com confirmação digitando o título) | P0 | CA07 |
| RF08 | Script `npm run set-admin <email>` (Admin SDK) para conceder a claim `admin` | P0 | CA01 |
| RF09 | Importar/exportar atividade em JSON (arquivo) | P1 | |
| RF10 | Ao publicar/editar/despublicar, atualizar na mesma transação o documento agregado `catalog/index` (ver spec do Catálogo), para que a mudança apareça no catálogo sem rebuild; as páginas estáticas e o sitemap são atualizados no rebuild diário (ou pelo botão "Rebuild site", que abre o workflow no GitHub) | P0 | CA09 |
| RF11 | Fila de revisão de conteúdo gerado por IA: filtro "Needs review" (`origin: ai` + `reviewStatus: pending`), contador no topo do painel e badge "AI · Needs review" na lista | P0 | CA10 |
| RF12 | Ação "Mark as reviewed" (grava `reviewStatus: reviewed`, `reviewedAt`, `reviewedBy`) e "Save & next" para revisar em sequência | P0 | CA10 |
| RF13 | Editor em formulário para os textos dos 5 tipos da v1 (perguntas, alternativas, respostas, cartões, pistas, prompts), como alternativa ao JSON; os dois modos ficam sincronizados | P1 | CA11 |
| RF14 | Na página da atividade (`/play/[slug]`), admins veem o botão "Edit" que abre a atividade no painel | P1 | CA11 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | A autorização é garantida pelas regras do Firestore (claim `admin`), não só pela UI | P0 | CA08 |
| RNF02 | Páginas `/admin` com `noindex` e fora do sitemap | P0 | |
| RNF03 | Publicar é bloqueado se a validação falhar | P0 | CA04 |
| RNF04 | Painel funcional em desktop ≥ 1024 px (mobile não obrigatório) | P1 | |

### Dependências técnicas

- [FEAT] Autenticação.
- [FEAT] Modelo de dados (esquemas Zod por tipo).
- [FEAT] Motor de atividades (preview).
- Documento `catalog/index` e regras que permitam só admins escrevê-lo.

### Recursos necessários

- E-mail(s) de quem será admin.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que rodei `npm run set-admin autor@exemplo.com` e esse usuário fez login novamente, quando acessa `/admin`, então vê a lista de atividades.
- [x] **CA02:** Dado 50 atividades, quando filtro por status "draft" e categoria "Grammar", então só os rascunhos de Grammar aparecem.
- [x] **CA03:** Dado que digito o título "Present Perfect Quiz", quando o slug é gerado, então vira `present-perfect-quiz`; se já existir, vejo "Slug already in use" e não consigo salvar.
- [x] **CA04:** Dado um quiz com uma pergunta sem alternativa correta no editor, quando tento publicar, então vejo o erro no caminho `questions[2].options` e a publicação é bloqueada.
- [x] **CA05:** Dado o tipo "flashcards" selecionado e o editor vazio, quando clico "Insert template", então o editor recebe um exemplo válido de flashcards.
- [x] **CA06:** Dado edições não salvas, quando clico "Preview", então o player abre com o conteúdo editado e a versão publicada não é alterada.
- [x] **CA07:** Dado uma atividade, quando clico "Delete", então preciso digitar o título para confirmar; depois de confirmado, ela some da lista e do catálogo.
- [x] **CA08 (negativo):** Dado um professor comum logado, quando acessa `/admin` ou tenta gravar em `activities` pelo SDK, então vê 404/"Not authorized" e a escrita é negada pelas regras.
- [x] **CA09:** Dado que publico uma atividade nova, quando acesso `/activities` em até 1 min, então ela já aparece em "What's New".
- [x] **CA10:** Dado 27 atividades geradas por IA pendentes, quando abro o filtro "Needs review", reviso uma e clico "Mark as reviewed" (ou "Save & next"), então o contador cai para 26, a atividade sai da fila e passa a ter `reviewedBy` com meu uid.
- [x] **CA11:** Dado que sou admin e estou jogando um quiz com um erro de digitação, quando clico "Edit", corrijo o texto da alternativa no formulário e salvo, então o JSON reflete a mudança e o quiz publicado mostra o texto corrigido.

## O que a atividade não inclui

- Editor visual rico (WYSIWYG, drag-and-drop de tabuleiro/cartões): motivo: complexo demais agora; formulário de textos (RF13) + JSON cobrem a revisão do conteúdo gerado por IA.
- Upload de imagens: motivo: adiado para simplificar a v1; imagens ficam versionadas em `/public` (Firebase Storage exigiria o plano Blaze).
- Fluxo de revisão/aprovação com vários autores: motivo: prematuro.
- Histórico de versões: motivo: baixo impacto inicial.

### Considerado para o futuro (P2)

- Editores visuais ricos por tipo (tabuleiro drag-and-drop, reordenar cartões).
- Botão "Generate with AI" no painel (Claude API) para criar rascunhos a partir de tema, nível e tipo. Exige chave de API paga e um backend (Cloud Functions no Blaze ou outro serviço), pois o site é estático.
- Upload de mídia pelo painel via Firebase Storage (exige o plano Blaze).
- Histórico de versões e papel "editor" vs "admin".

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Exclusão definitiva ou soft delete (`status: archived`)? | PO | Não | Exclusão definitiva, protegida pela confirmação digitando o título; antes de excluir dá para usar "Export JSON" como backup |
| D02 | Onde hospedar imagens enviadas pelos autores sem custo? | Dev/PO | Não | v1: `/public` via PR ou URL externa (campo "Thumbnail path or URL" com pré-visualização) |
| D03 | Editor JSON com Monaco/CodeMirror (RF04)? | Dev | Não | `textarea` monoespaçada com validação ao vivo: evita ~1 MB de JS no bundle; a aba "Texts" cobre a revisão do dia a dia |
| D04 | `catalog/index` "na mesma transação" (RF10)? | Dev | Não | Firestore Lite não tem listeners/transações com consultas; o índice é reconstruído logo após cada gravação a partir das atividades publicadas (idempotente: um "Save" seguinte corrige uma falha intermediária) |
| D05 | Páginas `/play/[slug]` estáticas mostram a edição sem rebuild (CA11)? | Dev | Não | Sim: o player busca a versão publicada ao abrir e troca o conteúdo se mudou e o jogo ainda não começou |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Conceder admin | integração (emulador) | CA01 | `set-admin` + login | Acesso a `/admin` |
| CT02 | Filtros da lista | e2e | CA02 | Filtrar draft + Grammar | Lista correta |
| CT03 | Slug | unit + e2e | CA03 | `slugify` e slug duplicado | `present-perfect-quiz`; erro de duplicado |
| CT04 | Validação bloqueia | e2e | CA04 | Publicar content inválido | Erro com caminho; não publica |
| CT05 | Template | componente | CA05 | Insert template flashcards | JSON válido |
| CT06 | Preview | e2e | CA06 | Editar e Preview | Player com edição; publicado intacto |
| CT07 | Exclusão | e2e | CA07 | Delete com confirmação | Some do catálogo |
| CT08 | Sem permissão | integração | CA08 | Professor comum no SDK | `PERMISSION_DENIED` |
| CT09 | Índice do catálogo | e2e (emulador) | CA09 | Publicar e abrir catálogo | Aparece sem rebuild |
| CT10 | Fila de revisão | e2e (emulador) | CA10 | Seed IA; revisar 1 | Contador 27 → 26; campos de revisão gravados |
| CT11 | Editar a partir do player | e2e | CA11 | Clicar Edit, alterar texto, salvar | JSON e player atualizados |

## URL Complementar

- Documentação técnica: https://firebase.google.com/docs/auth/admin/custom-claims · https://firebase.google.com/docs/firestore/manage-data/transactions
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: N/A: área interna.
- Requisitos originais: Necessidade de escalar o acervo de atividades.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
