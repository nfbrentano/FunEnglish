# [FEAT] Prompts e upload de imagens pelo painel admin

> **Status:** Em andamento
> **Autor:** Natanael Brentano · **Revisor:** Natanael Brentano · **Criada em:** 2026-10-02 · **Atualizada em:** 2026-10-02

## Detalhes da Atividade

- **O que precisa ser feito:**
  - Guardar o **prompt de geração** de cada imagem **dentro do JSON da atividade**, ao lado de `src` e `alt`.
  - Permitir que o admin, no próprio painel, **gere o prompt** (a partir do `alt` e do guia de estilo), **copie** o prompt e **envie o arquivo** da imagem.
  - O envio **commita a imagem no repositório** pela API do GitHub (decisão do PO em 2026-10-02). O deploy automático a publica no Hosting.
  - Os 59 prompts que hoje ficam em `content/prompts/images/**/*.txt` passam para os JSONs.
- **Problema e evidência:**
  - Hoje o fluxo de uma imagem passa por 5 lugares: ler o prompt num `.txt` do repositório (ou na página "Missing images"), gerar a imagem numa ferramenta de IA, salvar com um nome exato, rodar `npm run images:import` no terminal e commitar.
  - O prompt fica separado da atividade. Uma atividade criada no painel (ex.: "Greetings and Introductions") nem tem prompt.
  - "Travel Vocabulary" ficou em rascunho porque as 11 imagens não existem e não há como enviá-las pelo site.
- **Impacto de não fazer:** atividades com imagem dependem do terminal e do repositório, o que trava o crescimento do acervo pelo painel (objetivo da spec `SDD/DONE/2026-10-01_gestao-completa-de-atividades.md`).
- **Para quem é destinado:** Admin de conteúdo.
- **História de usuário:** Como admin, quero ver o prompt de cada imagem na própria atividade, copiá-lo para a IA e enviar a imagem gerada ali mesmo, para publicar atividades com imagens sem usar o terminal.
- **Como saberemos que deu certo:**
  - Uma imagem nova é enviada em ≤ 3 cliques (Copy prompt → gerar na IA → Upload) e aparece no site em ≤ 5 min.
  - 100% das imagens do acervo têm `prompt` no JSON.
  - 0 tokens do GitHub gravados no Firestore ou no repositório.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Campo opcional `prompt` (texto, até 2.000 caracteres) em toda imagem do esquema (`thumbnail`, `media` de imagem, frente de flashcard e imagem de cartão). O player e o `catalog/index` ignoram o campo | P0 | CA01 |
| RF02 | Migração: script `npm run images:migrate-prompts` lê cada `content/prompts/images/<slug>/<name>.txt`, grava o prompt na imagem correspondente (casando pelo `src`) **no Firestore** (fonte da verdade) e nos JSONs locais, e lista o que não casou. Depois disso a pasta `content/prompts/images/` deixa de ser necessária | P0 | CA02 |
| RF03 | No editor, cada imagem (thumbnail e imagens do conteúdo) ganha: campo **Image prompt**, botão **Write prompt from alt** (`alt` + o estilo de `content/prompts/image-style.md`), botão **Copy prompt** e botão **Upload image** | P0 | CA03 |
| RF04 | **Upload:** o arquivo escolhido (PNG, JPG, WebP ou AVIF) é processado **no navegador**. O thumbnail é recortado para 1280×800 (16:10); as outras imagens são reduzidas a até 1600 px de largura. Depois é convertido para WebP, baixando a qualidade até ficar ≤ 200 KB, com as mesmas regras de `npm run images:import`. Se não conseguir ≤ 200 KB, o upload é recusado com uma mensagem | P0 | CA04, CA09 |
| RF05 | O WebP é **commitado** em `public/images/activities/<slug>/<name>.webp` pela API do GitHub (Git Data API: blobs, tree, commit e ref, a mesma de RF06), na branch `main`, com a mensagem `content(images): <slug>/<name> (via admin panel)`. O `src` da imagem é preenchido com esse caminho se estiver vazio. A atividade não é salva automaticamente: o admin salva como de costume | P0 | CA04 |
| RF06 | **Enviar várias de uma vez:** em "Missing images", a opção "Upload several" aceita vários arquivos nomeados `<slug>--<name>.png` (o mesmo padrão de `images:import`) e faz **um único commit** com todos (Git Data API: blobs + tree + commit) | P1 | CA05 |
| RF07 | Depois do commit, a imagem aparece no editor na hora (pré-visualização local), com o aviso "Uploaded. It goes live after the next deploy (~3 min)" e um link para acompanhar o deploy no GitHub Actions | P0 | CA04 |
| RF08 | **Conexão com o GitHub:** em `/admin/settings`, o admin cola um *fine-grained personal access token* com acesso **só** ao repositório `nfbrentano/FunEnglish` e só à permissão **Contents: Read and write**. Há instruções passo a passo com link para criar o token. O painel testa o token (lê o repositório) e mostra "Connected as <login>". O token fica **só no navegador** desse admin (`localStorage`), com o botão "Disconnect" | P0 | CA06, CA07 |
| RF09 | "Missing images" usa o `prompt` do JSON quando existir (senão gera a partir do `alt`) e ganha **Upload** por imagem | P0 | CA08 |
| RF10 | A checagem do teste de conteúdo (cada imagem tem prompt) passa a olhar o campo `prompt` do JSON; as imagens enviadas pelo painel continuam passando no `tests/unit/activities/images.test.ts` (WebP, ≤ 200 KB, 16:10) | P1 | CA09 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | O token do GitHub nunca sai do navegador do admin, exceto para `api.github.com`. Ele não vai para o Firestore, para logs nem para o repositório, e não é mostrado depois de salvo (só "Connected as <login>") | P0 | CA07 |
| RNF02 | Escopo mínimo do token: um repositório, só "Contents". As instruções dizem para escolher uma expiração (ex.: 90 dias) | P0 | CA06 |
| RNF03 | Sem custo e sem serviço novo: plano Spark; Hosting serve as imagens do build | P0 | |
| RNF04 | Processamento de imagem no navegador (Canvas/`OffscreenCanvas`), sem biblioteca pesada nova; um upload de 4 MB processa em < 3 s num notebook comum | P1 | |
| RNF05 | Acessibilidade: botões com nome; progresso do upload anunciado (`role="status"`); erros com texto (token inválido, sem permissão, arquivo grande demais, rede) | P0 | CA07, CA09 |

### Dependências técnicas

- Painel admin e editores estruturados (`SDD/DONE/2026-10-01_gestao-completa-de-atividades.md`): `ImageFields` em `src/components/admin/content/media-editor.tsx`, a página "Missing images".
- Esquema `imageSchema` (`src/lib/activities/schema/common.ts`).
- Workflow `deploy.yml` (push na `main` → build → Hosting; `concurrency: deploy-live` mantém no máximo um deploy pendente).
- `npm run images:import` (as mesmas regras de tamanho e nomes de arquivo).

### Recursos necessários

- O PO cria o *fine-grained token* no GitHub (Settings → Developer settings → Fine-grained tokens), com as instruções do painel.
- Chave do Admin SDK para rodar a migração (RF02) em produção.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado uma imagem com `prompt` no JSON, quando a atividade é validada, publicada e jogada, então ela é aceita e o player e o catálogo funcionam como antes; um `prompt` com mais de 2.000 caracteres é recusado.
- [x] **CA02:** Dado os 59 prompts em `content/prompts/images/`, quando rodo `npm run images:migrate-prompts`, então cada imagem correspondente no Firestore e nos JSONs passa a ter o `prompt` daquele arquivo, e o script lista os arquivos que não casaram com nenhuma imagem.
- [x] **CA03:** Dado o thumbnail com `alt` "A sun and a cloud with rain on a map" e prompt vazio, quando clico "Write prompt from alt", então o campo recebe "A sun and a cloud with rain on a map. Flat vector illustration…" (o estilo do guia), e "Copy prompt" o copia.
- [ ] **CA04:** Dado que estou conectado ao GitHub, quando escolho um PNG de 3000×2000 em "Upload image" do thumbnail de `travel-vocabulary`, então é criado um commit com `public/images/activities/travel-vocabulary/thumb.webp` em 1280×800, ≤ 200 KB; o editor mostra a imagem e o aviso do deploy; e, após o deploy, a imagem aparece no site. _(Automatizado com a API do GitHub simulada; pendente: CT11, o primeiro upload real com o token do PO)_
- [x] **CA05:** Dado 11 arquivos `travel-vocabulary--<name>.png`, quando uso "Upload several", então um único commit traz os 11 WebP e "Missing images" deixa de listá-los após o deploy.
- [x] **CA06:** Dado `/admin/settings`, quando colo um token válido, então vejo "Connected as nfbrentano"; com um token sem acesso ao repositório, vejo "This token can't write to nfbrentano/FunEnglish" e nada é salvo.
- [x] **CA07 (negativo):** Dado um token salvo, quando inspeciono o Firestore, o repositório e as requisições para outros domínios, então o token não aparece em nenhum deles; e outro admin, em outro navegador, não está conectado.
- [x] **CA08:** Dado uma imagem faltando com `prompt` no JSON, quando abro "Missing images", então vejo esse prompt (e não o gerado pelo `alt`) e um botão "Upload" que envia o arquivo para o caminho certo.
- [x] **CA09 (limite):** Dado uma imagem que não fica ≤ 200 KB nem com a qualidade mínima, quando faço o upload, então vejo "This image is too detailed to fit in 200 KB. Try a simpler image." e nenhum commit é feito.
- [x] **CA10 (erro):** Dado que não estou conectado ao GitHub, quando clico "Upload image", então vejo "Connect GitHub to upload images" com link para `/admin/settings`.

## O que a atividade não inclui

- **Gerar a imagem por API dentro do site:** motivo: exige chave paga de uma API de imagens e backend. O fluxo continua sendo copiar o prompt para a ferramenta de IA preferida.
- **Firebase Storage ou Cloudinary:** motivo: decisão do PO pelo commit no GitHub (gratuito, versionado, sem serviço novo).
- **Apagar imagens pelo painel:** motivo: raro e arriscado; a remoção continua pelo repositório.
- **Recorte manual (escolher a área do thumbnail):** motivo: o recorte central de `images:import` basta na v1.

### Considerado para o futuro (P2)

- Recorte manual do thumbnail com pré-visualização.
- Abrir a ferramenta de IA já com o prompt (link profundo), onde houver suporte.
- Geração por API quando houver orçamento.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Onde fazer o upload sem o plano Blaze? | PO | Sim | Commit no GitHub pela API (decisão do PO em 2026-10-02) |
| D02 | Commitar direto na `main` ou abrir um PR por imagem? | PO/Dev | Não | Direto na `main` (aprovado pelo PO em 2026-10-02): o deploy é automático e os testes de imagem (formato, tamanho, proporção) continuam valendo, pois o painel gera exatamente esse formato |
| D03 | Manter `content/prompts/images/*.txt` depois da migração? | PO/Dev | Não | Remover após migrar (aprovado pelo PO em 2026-10-02). Os testes deixam de exigir `.txt`, para um upload pelo painel nunca travar o deploy |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Esquema com prompt | unit | CA01 | Validar imagem com e sem `prompt`; prompt > 2.000 | Aceita / recusa |
| CT02 | Migração | integração (emulador) | CA02 | Rodar o script com 3 `.txt`, um sem imagem | 2 prompts gravados; 1 listado |
| CT03 | Prompt a partir do alt | componente | CA03 | Clicar "Write prompt from alt" | Texto = alt + estilo |
| CT04 | Processamento | unit (canvas simulado) | CA04, CA09 | Imagem 3000×2000 → thumb; imagem impossível | 1280×800 ≤ 200 KB / erro |
| CT05 | Commit de 1 arquivo | e2e (API do GitHub simulada) | CA04 | Upload no editor | Um commit com `public/images/...` (blob em base64); `src` preenchido |
| CT06 | Commit de vários | e2e (API simulada) | CA05 | Upload several com 3 arquivos | 3 blobs, 1 tree, 1 commit, ref atualizada |
| CT07 | Conexão | e2e (API simulada) | CA06 | Token válido / sem permissão | "Connected as" / erro; nada salvo |
| CT08 | Token não vaza | e2e | CA07 | Monitorar requisições e Firestore após conectar | Token só em `api.github.com` |
| CT09 | Missing images | e2e | CA08 | Imagem com prompt no JSON | Prompt do JSON exibido; upload no caminho certo |
| CT10 | Sem conexão | componente | CA10 | Upload sem token | Mensagem com link |
| CT11 | Ponta a ponta real | manual | CA04 | Upload real com o token do PO | Commit no GitHub; imagem no site após deploy |

## URL Complementar

- Documentação técnica: https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents · https://docs.github.com/en/rest/git/trees · https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token · https://firebase.google.com/pricing
- Protótipo / mockup: N/A: segue o editor atual (`/admin/edit`, `ImageFields`).
- Discussões relacionadas: Pedido do PO (2026-10-02): "vincular o prompt para gerar a imagem no próprio painel admin para já fazer upload dela" e "criar um prompt da imagem no json e deixar anexado".
- Referências de design: N/A.
- Requisitos originais: `SDD/DONE/2026-10-01_gestao-completa-de-atividades.md` (P2 "Upload de imagens") e `SDD/2026-09-30_conteudo-inicial-gerado-por-ia.md` (RF07, prompts por imagem).
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
