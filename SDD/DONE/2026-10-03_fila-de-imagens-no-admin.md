# [FEAT] Fila de imagens no painel: anexar várias e enviar todas de uma vez

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-03 · **Atualizada em:** 2026-10-06

## Detalhes da Atividade

- **O que precisa ser feito:** Na página **Missing images** (`/admin/images`), o "Upload" de cada item deixa de enviar na hora: a imagem escolhida vai para uma **fila local**, guardada no navegador e mantida se a página for recarregada. O botão **"Send all (N)"** envia todas as imagens da fila **num único commit**, gerando um único deploy.
- **Problema e evidência:**
  - Hoje cada "Upload" faz um commit em `main` e dispara um deploy: houve 9 commits `content(images): … (via admin panel)` desde 2026-10-02, um por imagem.
  - Ainda faltam 48 miniaturas de atividades publicadas, além das imagens de conteúdo.
  - O botão "Upload several", que já existe, envia vários arquivos num commit, mas só aceita arquivos renomeados como `<slug>--<nome>.png`, o que é trabalhoso ao gerar imagem por imagem.
  - Se a aba fechar no meio do trabalho, nada fica guardado.
- **Impacto de não fazer:** dezenas de deploys seguidos (fila no GitHub Actions e risco de builds concorrentes), trabalho perdido ao recarregar a página e um fluxo lento para completar as 48 miniaturas.
- **Para quem é destinado:** Admin/PO, que gera as imagens com IA a partir dos prompts e as envia pelo painel.
- **História de usuário:** Como admin, quero anexar as imagens uma a uma conforme as gero, revisar a fila e enviar todas de uma vez, para fazer um único commit e um único deploy sem perder o que já anexei.
- **Como saberemos que deu certo:** 48 imagens enviadas em **1 commit** e 1 deploy; a fila sobrevive a recarregar a página e a fechar o navegador; 0 imagens perdidas ou enviadas em duplicidade.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | O botão "Upload" de cada item passa a se chamar **"Attach"**: converte a imagem para WebP com as mesmas regras de hoje (`toWebp`, `kindForSrc`: miniatura recortada em 960×600, ≤ 200 KB) e a adiciona à fila, sem falar com o GitHub | P0 | CA01 |
| RF02 | Item anexado mostra a prévia da imagem já processada, o selo "Queued" e as ações **"Replace"** e **"Remove"** | P0 | CA01, CA04 |
| RF03 | Barra fixa no topo da lista com "N images queued · X KB", o botão **"Send all (N)"** e o botão "Clear queue" (com confirmação). "Send all" fica desabilitado com a fila vazia | P0 | CA02 |
| RF04 | "Send all" envia todas as imagens da fila num **único commit** em `main`, com a mensagem `content(images): N images (slug-a, slug-b, …) (via admin panel)`, reaproveitando `commitFiles` | P0 | CA02 |
| RF05 | Progresso do envio: "Processing… / Uploading 12 of 48… / Committing…"; ao concluir, link para o commit e para o deploy (`ACTIONS_URL`), como hoje | P0 | CA02 |
| RF06 | Depois do commit bem-sucedido, a fila é esvaziada e os itens enviados aparecem como "Uploaded — live after the deploy", com a prévia | P0 | CA02 |
| RF07 | **Falha no envio** (rede, token, limite do GitHub): a fila **não** é apagada; aparece o erro e o botão "Try again". Nenhum commit parcial é criado (o commit só acontece depois que todos os blobs foram criados) | P0 | CA05 |
| RF08 | A fila persiste no navegador: recarregar a página ou reabrir o navegador mostra os mesmos itens anexados com as prévias | P0 | CA03 |
| RF09 | Item da fila que deixou de faltar (outra pessoa já enviou a imagem e o deploy saiu) aparece como "Already on the site" e é excluído do envio, com opção de remover | P1 | CA06 |
| RF10 | "Upload several" (seleção múltipla por nome de arquivo) continua existindo, mas passa a **adicionar à fila** em vez de enviar na hora | P1 | CA07 |
| RF11 | Filtro "Show: All / Missing / Queued" e "Thumbnails only", para focar nas 48 miniaturas | P2 | |
| RF12 | Ao tentar sair da página com itens na fila, aparece o aviso do navegador ("You have N images not sent yet"), reaproveitando `use-unsaved-changes` | P1 | CA08 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | **Armazenamento em IndexedDB**, e não no `localStorage`. O `localStorage` guarda só texto e tem limite de ~5 MB por site: 48 miniaturas de até 200 KB, em base64, passariam de 12 MB. O IndexedDB guarda o `Blob` WebP direto, sem base64, com cota de centenas de MB. Banco `fun-english-admin`, store `image-queue`, chave = `src`. Sem nova dependência (API nativa) ou, no máximo, `idb-keyval` (< 1 KB) | P0 | CA03 |
| RNF02 | Guarda-se a imagem **já processada** (WebP final), não o original: a fila ocupa menos espaço e o envio não reprocessa nada | P0 | |
| RNF03 | Limites da fila: até 200 itens e 40 MB; acima disso, "Queue is full — send what you have first" | P1 | CA09 |
| RNF04 | Envio dos blobs ao GitHub com **concorrência limitada** (4 por vez) e uma nova tentativa com espera crescente em respostas 403/429 (limite secundário da API), em vez do `Promise.all` sem limite de hoje | P0 | CA05 |
| RNF05 | Todo acesso ao IndexedDB fica em `try/catch`: no modo privado ou com armazenamento bloqueado, a página funciona sem persistência e mostra o aviso "Your queue won't survive a reload in this browser" | P0 | CA10 |
| RNF06 | O token do GitHub continua só no `localStorage` deste navegador (comportamento atual); a fila não guarda o token nem dados de usuário | P0 | |
| RNF07 | Um único commit, com até 200 arquivos, é feito com a Git Data API (blobs → tree → commit → ref), mantendo a nova tentativa que já existe se a `main` mudar no meio | P0 | CA02 |

### Dependências técnicas

- `src/components/admin/missing-images-view.tsx` (UI), `src/lib/admin/use-image-upload.ts` (separar "processar" de "enviar"), `src/lib/admin/github.ts` (`commitFiles` com concorrência limitada), `src/lib/admin/image-processing.ts`, `src/lib/admin/use-unsaved-changes.ts`.
- Textos em `src/lib/strings.ts` (`strings.admin.upload` e `strings.admin.images`).
- Spec concluída `SDD/DONE/2026-10-02_imagens-pelo-painel.md` (fluxo atual de envio).

### Recursos necessários

- Token do GitHub já configurado no painel (Settings), como hoje.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado o item "reading-science-news / thumb" em Missing images, quando clico em "Attach" e escolho um PNG de 1536×1024, então vejo a prévia recortada em 16:10, o selo "Queued" e "1 image queued" na barra, e **nenhum** commit é feito.
- [x] **CA02:** Dado 3 imagens na fila, quando clico em "Send all (3)", então vejo o progresso, é criado **1 commit** em `main` com os 3 arquivos em `public/images/activities/…`, a mensagem cita os 3 slugs, a fila fica vazia e os 3 itens aparecem como "Uploaded — live after the deploy".
- [x] **CA03:** Dado 5 imagens na fila, quando recarrego a página (ou fecho e reabro o navegador), então os 5 itens continuam na fila com as prévias.
- [x] **CA04:** Dado um item na fila, quando clico em "Replace" e escolho outra imagem, então a prévia muda e a fila continua com 1 item para esse arquivo; e "Remove" o tira da fila.
- [x] **CA05 (erro):** Dado 10 imagens na fila, quando o envio falha (sem rede ou GitHub responde erro), então aparece a mensagem de erro com "Try again", as 10 imagens continuam na fila e nenhum commit é criado em `main`.
- [x] **CA06 (limite):** Dado um item na fila cuja imagem já está no site após um deploy, quando abro a página, então o item aparece como "Already on the site" e não entra no "Send all".
- [x] **CA07:** Dado que escolho 4 arquivos com "Upload several", sendo 3 com nome válido e 1 com nome desconhecido, quando confirmo, então os 3 válidos entram na fila (sem enviar) e o desconhecido aparece em "Skipped".
- [x] **CA08:** Dado 2 imagens na fila, quando tento fechar a aba ou sair da página, então o navegador pede confirmação.
- [x] **CA09 (limite):** Dado uma fila com 200 itens, quando tento anexar mais um, então vejo "Queue is full — send what you have first" e o item não é adicionado.
- [x] **CA10 (negativo):** Dado um navegador em modo privado com o IndexedDB bloqueado, quando anexo imagens, então a fila funciona na sessão atual, aparece o aviso de que não sobreviverá a recarregar, e não há erro no console.
- [x] **CA11 (negativo):** Dado o token do GitHub não configurado, quando clico em "Send all", então vejo o aviso para conectar o GitHub (como hoje), e a fila permanece intacta.

## O que a atividade não inclui

- Gerar as imagens com IA dentro do painel: motivo: outra iniciativa; continua o fluxo de copiar o prompt e gerar fora.
- Fila compartilhada entre navegadores ou admins: motivo: exigiria guardar as imagens no servidor (Storage); a fila é por navegador.
- Fila para as imagens do editor de atividade (`image-fields.tsx`): motivo: o editor envia junto com a edição; pode reaproveitar o mesmo módulo depois.
- Mudar o pipeline de deploy (GitHub Actions): motivo: fora do escopo; o ganho vem de fazer 1 commit em vez de N.

### Considerado para o futuro (P2)

- Usar a mesma fila no editor de atividades.
- Arrastar e soltar várias imagens na lista, associando cada uma ao item pelo nome ou pela posição.
- Filtros da RF11.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Manter um "Upload now" por item (envio imediato) além do "Attach"? | PO | Não | Sugestão: não; com 1 item na fila, "Send all (1)" faz o mesmo |
| D02 | Usar a API nativa do IndexedDB ou a dependência `idb-keyval` (< 1 KB)? | Dev | Não | Sugestão: `idb-keyval`, código mais simples |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Anexar sem commit | unit (fetch mockado) + e2e | CA01 | Attach | Item na fila; 0 chamadas ao GitHub |
| CT02 | Enviar tudo em 1 commit | unit (`commitFiles` com fetch mockado) | CA02 | 3 itens → Send all | 3 blobs, 1 tree, 1 commit, 1 PATCH ref; fila vazia |
| CT03 | Persistência | unit (`fake-indexeddb`) + manual | CA03 | Gravar, recarregar o módulo, ler | Mesmos itens e blobs |
| CT04 | Replace / Remove | unit | CA04 | Substituir e remover | 1 entrada por `src`; remoção ok |
| CT05 | Falha sem commit parcial | unit | CA05 | Blob 7 falha | Nenhum PATCH ref; fila intacta |
| CT06 | Já no site | unit | CA06 | `src` presente em `imagePaths` | Excluído do envio |
| CT07 | Upload several vai para a fila | e2e | CA07 | 4 arquivos | 3 na fila; 1 em Skipped |
| CT08 | Aviso ao sair | e2e | CA08 | Fechar a aba com fila | `beforeunload` disparado |
| CT09 | Fila cheia | unit | CA09 | 201º item | Recusado com mensagem |
| CT10 | IndexedDB bloqueado | unit (mock que lança) | CA10 | Anexar | Funciona em memória + aviso |
| CT11 | Sem token | unit | CA11 | Send all sem token | Aviso; fila intacta |
| CT12 | Concorrência limitada | unit | RNF04 | 20 blobs, 403 no 5º | Máx. 4 simultâneos; nova tentativa ok |

## URL Complementar

- Documentação técnica: `SDD/DONE/2026-10-02_imagens-pelo-painel.md`; `src/lib/admin/github.ts`; MDN IndexedDB API.
- Protótipo / mockup: N/A, ajuste na página existente `/admin/images`.
- Discussões relacionadas: Levantamento de 2026-10-03: 48 de 78 atividades publicadas sem miniatura.
- Referências de design: N/A.
- Requisitos originais: Pedido do PO (2026-10-03): "carregar no local storage todas e ter um botão pra enviar ao mesmo tempo todas imagens anexadas".
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
