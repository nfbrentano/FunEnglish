# [FEAT] Gestão completa de atividades pelo admin

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-01 · **Atualizada em:** 2026-10-02

## Detalhes da Atividade

- **O que precisa ser feito:** Evoluir o painel admin (`/admin`) para que o admin crie, edite e organize **qualquer** atividade sem depender de JSON nem do repositório, permitindo que o acervo cresça pelo próprio site. A spec cobre seis frentes:
  1. **Editor estruturado por tipo:** adicionar, remover e reordenar perguntas, alternativas, cartões, lacunas e pistas.
  2. **Mídia:** escolher imagens, emoji, áudio e vídeo com pré-visualização.
  3. **Novas formas de criar:** atividades com ajuda de IA sem custo, e importação colando o JSON.
  4. **Firestore como fonte da verdade:** o seed passa a não apagar edições feitas no painel, e o conteúdo tem backup no repositório.
  5. **Segurança ao salvar:** histórico de versões, aviso de alterações não salvas e conflito entre abas.
  6. **Gestão do acervo:** ações em lote e uma visão de cobertura por categoria, nível e tipo.
- **Problema e evidência:**
  - Hoje o editor (spec `SDD/DONE/2026-09-30_painel-admin-de-conteudo.md`) edita só os **textos** num formulário. Qualquer mudança de estrutura, como uma pergunta nova, mais uma alternativa, trocar a correta, uma lacuna nova ou uma pista do Quiz Board, exige editar **JSON** à mão. Criar uma atividade nova também começa por um template em JSON. Isso trava o crescimento do acervo.
  - `npm run seed -- --production` grava por cima (`set`) de toda atividade com o mesmo slug (`src/lib/activities/seed-writer.ts`). Qualquer revisão ou edição feita no painel se perde no próximo seed, então não existe uma fonte da verdade clara entre `content/activities/` e o Firestore.
  - Não há histórico: um "Save" errado não tem volta.
- **Impacto de não fazer:** Só quem conhece o esquema JSON cria atividades. Há risco real de perder revisões feitas no painel. O acervo fica nas cerca de 29 atividades iniciais.
- **Para quem é destinado:** Admin de conteúdo (PO e futuros autores com a claim `admin`).
- **História de usuário:** Como admin, quero criar e editar qualquer atividade, inclusive a estrutura, por formulários com pré-visualização, sem medo de perder trabalho, para fazer o acervo crescer toda semana.
- **Como saberemos que deu certo:**
  - criar um quiz de 8 perguntas do zero, sem abrir a aba JSON, em ≤ 10 minutos;
  - 0 edições do painel perdidas por um seed;
  - 100% das atividades com backup versionado no git após `npm run content:pull`;
  - acervo ≥ 60 atividades 2 meses após a entrega.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | **Editor estruturado do Quiz:** lista de perguntas com adicionar, remover, duplicar e reordenar (botões ↑ ↓ e arrastar). Cada pergunta tem enunciado, explicação, mídia e de 2 a 6 alternativas, com o mesmo controle de adicionar, remover e reordenar e um seletor "correta" (várias corretas só com a opção "Choose all that apply") | P0 | CA01, CA02 |
| RF02 | **Editor estruturado do Completar lacunas:** modo (typing / word-bank); itens com o texto da frase. O admin seleciona uma palavra e clica "Make blank" para transformá-la em `[[...]]`. Cada lacuna aceita respostas alternativas. Há também dica, mídia, lista de distratores e o crédito de música | P0 | CA03 |
| RF03 | **Editor estruturado de Flashcards** (frente com texto, emoji ou imagem; verso com palavra, definição, exemplo e "speak"), **do Quiz Board** (grade de categorias × valores, com adicionar categoria ou linha e valores automáticos 100, 200, 300…) e **dos Cartões de conversa** (prompt, imagem, duas opções "This or That", follow-ups, vocabulário e modo Writing) | P0 | CA04 |
| RF04 | **Editor de mídia** por item (`media`/`image`), com pré-visualização. Os tipos de mídia são: **imagem**, escolhida na galeria das imagens que já existem no site ou por URL `https://`; **emoji**; **áudio TTS**, com botão "Listen"; e **YouTube**, colando o link: o `videoId` é extraído, há campos de início e fim e o clipe toca no intervalo, com aviso se o vídeo não permitir embed | P0 | CA05 |
| RF05 | O editor estruturado, a aba **Texts** e a aba **JSON** editam o mesmo conteúdo e ficam sincronizados. O JSON continua disponível para usos avançados | P0 | CA02 |
| RF06 | **Validação junto ao campo:** cada erro do esquema aparece ao lado do campo correspondente (por exemplo "Mark one option as correct" na pergunta 3), com um resumo clicável que leva ao campo. Publicar fica bloqueado enquanto houver erros | P0 | CA02 |
| RF07 | **Pré-visualização ao vivo** lado a lado (desktop ≥ 1280 px) ou em aba (telas menores), com alternância de largura Desktop / Phone e reinício automático ao mudar o conteúdo | P1 | CA06 |
| RF08 | **Novas formas de criar:** em branco por tipo (com 1 item vazio, já estruturado), duplicar, **importar colando o JSON** (além do arquivo) e **"Create with AI (copy prompt)"**. Nessa última, o admin escolhe tipo, categoria, nível, tema e quantidade; o painel monta o prompt do guia `content/prompts/activities.md` com o template do tipo; o admin cola o prompt em qualquer IA (sem custo de API) e depois cola o JSON de volta, que é validado e vira **rascunho** com `origin: "ai"` e `reviewStatus: "pending"` | P1 | CA07 |
| RF09 | **Firestore como fonte da verdade:** toda gravação pelo painel registra `editedInPanelAt`. O seed **não sobrescreve** uma atividade com `editedInPanelAt` mais recente que o arquivo e lista esses casos como "skipped (edited in the admin panel)". `--force` sobrescreve, com confirmação | P0 | CA08 |
| RF10 | **Backup no repositório:** `npm run content:pull` (Admin SDK) baixa todas as atividades do Firestore para `content/activities/<origem>/<categoria>/<slug>.json`, no formato do seed, para commit. Uma atividade removida no Firestore é listada para remoção manual. O painel ganha também "Export all" (um JSON único) | P0 | CA09 |
| RF11 | **Histórico de versões:** cada gravação cria uma revisão em `activities/{id}/revisions/{revId}`, com o conteúdo completo, autor (uid e nome), data e um resumo automático (por exemplo "3 fields changed"). São mantidas as últimas 20. O painel lista as revisões, mostra a diferença em relação à atual e permite **Restore**, que gera uma nova revisão | P1 | CA10 |
| RF12 | **Segurança ao editar:** aviso ao sair com alterações não salvas; rascunho local automático (restaurável após fechar a aba); **detecção de conflito** quando outra aba ou admin salvou depois que o editor abriu (comparando `updatedAt`), com as opções "Reload their version" e "Overwrite" | P0 | CA11 |
| RF13 | **Ações em lote** na lista: selecionar várias atividades (ou todas as filtradas) e então publicar, despublicar, marcar como revisada, mudar a categoria, destacar ou tirar o destaque, ou excluir (a exclusão em lote pede que se digite o número de atividades). O `catalog/index` é reconstruído uma vez só ao final | P1 | CA12 |
| RF14 | **Lista melhor:** ordenação por título, atualização, categoria e status; colunas de nível e "Featured"; badge "Missing image" quando o thumbnail não existe; paginação a partir de 50 itens; os filtros ficam na URL | P1 | CA13 |
| RF15 | **Visão de cobertura** (`/admin/coverage`): matriz categoria × nível e categoria × tipo com as contagens de publicadas e rascunhos, em destaque onde houver < 3. Clicar numa célula abre a lista filtrada ou "Create with AI" já preenchido | P2 | CA14 |
| RF16 | **Imagens faltando:** o painel lista as atividades sem imagem com o prompt pronto (gerado a partir do `alt` + `content/prompts/image-style.md`) e o nome do arquivo para `npm run images:import`. Upload direto pelo painel fica fora da v1 (ver "O que não inclui") | P1 | CA15 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Regras do Firestore: `revisions` com leitura e escrita só para admin; nenhum campo novo (`editedInPanelAt`, revisões) visível ou gravável por não-admins | P0 | CA16 |
| RNF02 | Sem serviços pagos: tudo funciona no plano Spark (sem Cloud Functions nem Storage) | P0 | |
| RNF03 | Limites: atividade ≤ 200 KB (`MAX_ACTIVITY_BYTES`); `catalog/index` ≤ 900 KB (margem do limite de 1 MiB), com aviso no painel acima de 80%. Acima de ~1.500 atividades, o índice precisará ser dividido (fica para o futuro) | P0 | CA17 |
| RNF04 | Acessibilidade do editor: reordenar também por teclado (botões ↑ ↓, não só arrastar), todos os campos com label, erros ligados por `aria-describedby`, foco gerenciado ao adicionar ou remover itens | P0 | CA02 |
| RNF05 | Desempenho: o editor abre uma atividade de 100 perguntas em < 1 s e digitar não trava (pré-visualização com debounce de 300 ms); a lista com 500 atividades filtra em < 100 ms | P1 | |
| RNF06 | Custo do Firestore: a gravação faz 1 escrita da atividade, 1 revisão e 1 `catalog/index`; as ações em lote usam `writeBatch` (até 500 por lote) | P1 | CA12 |

### Dependências técnicas

- [FEAT] Painel admin de conteúdo (`SDD/DONE/2026-09-30_painel-admin-de-conteudo.md`): lista, editor, `catalog/index`, claim `admin`.
- Esquemas Zod dos 5 tipos (`src/lib/activities/schema/`) e o validador com caminhos de erro.
- Guia de geração `content/prompts/activities.md`, com um template por tipo validado por `tests/unit/activities/guide.test.ts`.
- `scripts/seed.ts` e `src/lib/activities/seed-writer.ts` (mudam com o RF09).
- Lista de imagens existentes: um manifest gerado no build (`getPublicImagePaths`) e publicado como JSON estático para a galeria.

### Recursos necessários

- Chave do Admin SDK do PO para `npm run content:pull` (já existe em `~/.config/fun-english/admin-key.json`).
- Biblioteca de arrastar e soltar acessível (ex.: `@dnd-kit/sortable`) ou só os botões ↑ ↓ (decidir em D02).

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado um quiz novo em branco, quando adiciono 3 perguntas com 4 alternativas cada pelo formulário, marco a correta de cada uma e publico, então a atividade aparece no catálogo e joga corretamente, sem que eu tenha aberto a aba JSON. _(PR 2)_
- [x] **CA02:** Dado um quiz com uma pergunta sem alternativa correta, quando olho o editor, então vejo "Mark one option as correct" ao lado daquela pergunta, o resumo de erros leva até ela e "Publish" fica desabilitado; ao marcar a correta, a aba JSON mostra `"correct": true` naquela alternativa. _(PR 2)_
- [x] **CA03:** Dado o item "She goes to school every day." no Completar lacunas, quando seleciono "goes" e clico "Make blank" e adiciono a alternativa "walks", então o texto vira `She [[goes|walks]] to school every day.` e a pré-visualização mostra a lacuna. _(PR 2)_
- [x] **CA04:** Dado um Quiz Board com 3 categorias, quando clico "Add category" e "Add row", então surge a 4ª coluna e uma linha com o próximo valor (400) em todas as categorias, com campos vazios marcados como erro até serem preenchidos. _(PR 2)_
- [x] **CA05:** Dado uma pergunta, quando colo `https://www.youtube.com/watch?v=YE7VzlLtp-4&t=30` como mídia e defino fim em 45 s, então o `videoId`, o início 30 e o fim 45 são preenchidos e a pré-visualização toca só esse trecho. _(PR 2)_
- [x] **CA06:** Dado o editor aberto num desktop, quando mudo o texto de uma alternativa, então a pré-visualização ao lado reflete a mudança em até 1 s; com "Phone" ativo, ela aparece com 375 px de largura. _(PR 2)_
- [x] **CA07:** Dado "Create with AI" com tipo Flashcards, Vocabulary, Beginner, tema "weather", 12 itens, quando copio o prompt, colo numa IA e colo o JSON devolvido, então ele é validado e vira um rascunho `origin: "ai"`, `reviewStatus: "pending"`; se o JSON for inválido, vejo os erros e nada é salvo. _(PR 3)_
- [x] **CA08:** Dado uma atividade que editei no painel depois do último seed, quando alguém roda `npm run seed -- --production`, então ela não é alterada e aparece em "skipped (edited in the admin panel)"; com `--force` e confirmação, é sobrescrita. _(PR 1)_
- [x] **CA09:** Dado 40 atividades no Firestore, quando rodo `npm run content:pull`, então tenho 40 arquivos válidos em `content/activities/` (passam em `npm run seed:check`) e o `git diff` mostra só o que mudou. _(PR 1)_
- [x] **CA10:** Dado uma atividade salva 3 vezes, quando abro "History" e escolho a 1ª versão e clico "Restore", então o conteúdo volta ao da 1ª versão, uma 4ª revisão "Restored from …" é criada e o catálogo reflete a mudança. _(PR 3)_
- [x] **CA11:** Dado a mesma atividade aberta em duas abas, quando salvo na aba A e depois tento salvar na aba B, então a aba B avisa "Someone saved this activity after you opened it" com "Reload their version" e "Overwrite", e nada é sobrescrito sem escolha. _(PR 1)_
- [x] **CA12:** Dado 5 atividades selecionadas na lista, quando clico "Publish", então as 5 ficam publicadas com uma única reconstrução do `catalog/index`. _(PR 3)_
- [x] **CA13:** Dado uma atividade cujo thumbnail não existe em `/public`, quando vejo a lista, então ela mostra o badge "Missing image". _(PR 3)_
- [x] **CA14:** Dado a categoria Listening sem atividades Advanced, quando abro `/admin/coverage`, então a célula Listening × Advanced aparece destacada com 0 e clicar nela abre "Create with AI" já com Listening e Advanced. _(PR 3)_
- [x] **CA15:** Dado 3 atividades sem imagem, quando abro "Missing images", então vejo as 3 com o nome do arquivo e o prompt pronto para copiar. _(PR 3)_
- [x] **CA16 (negativo):** Dado um professor sem a claim `admin`, quando tenta ler `activities/{id}/revisions` ou gravar `editedInPanelAt` pelo SDK, então as regras negam. _(PR 3)_
- [x] **CA17 (limite):** Dado uma atividade que passaria de 200 KB ao salvar, quando clico "Save", então vejo "This activity is too large (max 200 KB)" e nada é gravado. _(PR 3)_

## O que a atividade não inclui

- **Upload de imagens pelo painel:** motivo: exige Firebase Storage (plano Blaze) ou um serviço externo. Na v1, as imagens seguem pelo repositório (`npm run images:import`) ou por URL `https://`.
- **Geração automática por API de IA dentro do site:** motivo: exige chave paga e backend. O "copy prompt" (RF08) cobre o fluxo sem custo.
- **Papéis diferentes (editor × publicador) e fluxo de aprovação:** motivo: hoje há um único admin.
- **Edição colaborativa em tempo real:** motivo: a detecção de conflito (RF12) basta para poucos admins.
- **Novos tipos de atividade:** motivo: cada tipo novo tem a sua spec. O editor estruturado deve ser extensível por tipo (um componente de editor registrado ao lado do plugin do player).

### Considerado para o futuro (P2)

- Upload de imagens com o plano Blaze ou serviço externo gratuito.
- Botão "Generate with AI" pela API (Claude), quando houver orçamento e backend.
- Agendamento de publicação ("publish on date").
- Comentários de revisão por item e papel "editor".
- Dividir o `catalog/index` em vários documentos acima de ~1.500 atividades.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | A fonte da verdade passa a ser o Firestore (com `content:pull` como backup no git) ou continua sendo o repositório? | PO | Sim | **Firestore** (decisão do PO em 2026-10-01), com o painel como lugar de edição e `content:pull` periódico para backup e histórico no git |
| D02 | Reordenar com arrastar (nova dependência `@dnd-kit`) ou só com botões ↑ ↓? | Dev/PO | Não | Botões ↑ ↓ na v1 (acessíveis e sem dependência); arrastar fica como melhoria |
| D03 | Quantas revisões guardar por atividade? | PO | Não | 20 (`MAX_REVISIONS`) |
| D04 | Ordem de entrega? | PO | Não | **3 PRs** (decisão do PO em 2026-10-01): (1) RF09–RF10 (proteção e backup) + RF12; (2) editores estruturados RF01–RF07; (3) RF08, RF11, RF13–RF16 |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Quiz do zero | e2e (emulador) | CA01 | Criar 3 perguntas pelo formulário e publicar | Aparece no catálogo e joga |
| CT02 | Erro junto ao campo | componente | CA02 | Remover a correta | Mensagem no campo; Publish desabilitado; JSON sincronizado |
| CT03 | Make blank | componente | CA03 | Selecionar palavra + Make blank + alternativa | `[[goes\|walks]]` |
| CT04 | Quiz Board | componente | CA04 | Add category / Add row | Grade 4 × n com valores |
| CT05 | Link do YouTube | unit + componente | CA05 | Colar URLs (watch, youtu.be, shorts, `t=`) | `videoId`/início corretos |
| CT06 | Pré-visualização | e2e | CA06 | Editar texto | Preview atualizado ≤ 1 s |
| CT07 | Create with AI | e2e | CA07 | Colar JSON válido e inválido | Rascunho / erros |
| CT08 | Seed protegido | integração (emulador) | CA08 | Editar no painel, rodar o seed com e sem `--force` | Skipped / sobrescrito |
| CT09 | content:pull | integração (emulador) | CA09 | Pull e `seed:check` | Arquivos válidos |
| CT10 | Histórico | e2e | CA10 | 3 saves + Restore | Conteúdo restaurado; 4ª revisão |
| CT11 | Conflito | e2e | CA11 | Duas abas | Aviso; nada sobrescrito |
| CT12 | Lote | e2e | CA12 | Publicar 5 | 1 rebuild do índice |
| CT13 | Missing image | componente | CA13 | Thumbnail inexistente | Badge |
| CT14 | Cobertura | componente | CA14 | Dados com lacunas | Célula destacada; link |
| CT15 | Imagens faltando | componente | CA15 | 3 sem imagem | Lista com prompts |
| CT16 | Regras | integração (emulador) | CA16 | Professor lendo revisões | Negado |
| CT17 | Tamanho | unit | CA17 | Atividade > 200 KB | Erro; nada gravado |

## URL Complementar

- Documentação técnica: https://firebase.google.com/docs/firestore/manage-data/transactions (batch writes) · https://firebase.google.com/docs/firestore/quotas (limite de 1 MiB por documento) · https://docs.dndkit.com/presets/sortable
- Protótipo / mockup: N/A: seguir o visual do editor atual (`/admin/edit`).
- Discussões relacionadas: Pedido do PO (2026-10-01): "o usuário admin poder alterar as atividades todas, e até criar novas para que o site possa crescer em atividades e também ter uma melhor gestão e edição".
- Referências de design: N/A.
- Requisitos originais: `SDD/DONE/2026-09-30_painel-admin-de-conteudo.md` (P2 "Editores visuais ricos por tipo").
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
