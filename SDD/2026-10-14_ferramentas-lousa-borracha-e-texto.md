# [FEAT] Lousa: borracha de traço inteiro como padrão e comandos de formatação de texto

> **Status:** Em revisão
> **Autor:** AI · **Revisor:** Natanael Brentano · **Criada em:** 2026-10-14 · **Atualizada em:** 2026-10-14

## Detalhes da Atividade

- **O que precisa ser feito:** melhorar duas ferramentas da lousa usadas o tempo todo durante a aula:
  1. **Borracha:** um clique (ou um arraste) sobre um traço apaga **o traço inteiro**, tanto na lousa principal (`/lousa` e aba Board da sessão) quanto na lousa ao vivo (sala ao vivo).
  2. **Texto:** comandos para alterar a caixa de texto já criada: diminuir/aumentar fonte (A− / A+), tamanhos pré-definidos (S / M / L / XL), cor, negrito, aplicados a um ou vários textos selecionados de uma vez.
- **Problema e evidência:** levantamento no código atual:
  - **A borracha de traço existe, mas está escondida.** `eraserMode = "object"` já está implementado em `src/lib/board/use-whiteboard.ts` (`collectEraseAt`, `finishDrawing`). Porém o padrão é `"area"`, e para trocar o professor precisa clicar de novo no botão da borracha já ativo (abre um popover) ou saber o atalho `⇧E`. Na prática, a borracha "risca" a área em vez de remover o traço, e o professor apaga aos pedaços.
  - **A lousa ao vivo só tem borracha de área.** `src/components/live/interactive-whiteboard.tsx` grava a borracha como um traço `destination-out` no RTDB. O traço original continua salvo e cada passada da borracha soma mais um traço sincronizado.
  - **O texto não pode ser formatado.** `addTextBox` cria toda caixa com `fontSize: 24` fixo e a cor ativa no momento. Não existe controle para mudar tamanho, cor ou peso depois de criar a caixa. É o RF09 da spec `SDD/2026-10-07_melhorias-da-lousa.md`, que ficou pendente e passa a ser coberto por esta spec.
- **Impacto de não fazer:** o professor gasta tempo de aula apagando aos pedaços e recriando textos para mudar o tamanho. Não consegue destacar a palavra-alvo (maior, em negrito, em outra cor), que é o uso mais comum do quadro numa aula de inglês. Na sala ao vivo, o histórico de traços cresce sem necessidade.
- **Para quem é destinado:** professor de inglês logado, conduzindo aula 1:1 ou em turma (projetor, compartilhamento de tela ou sala ao vivo). O aluno se beneficia indiretamente porque vê o quadro mais legível.
- **História de usuário:** Como professor de inglês, quero apagar um traço inteiro com um clique e ajustar tamanho, cor e destaque dos textos já escritos, para corrigir e destacar o conteúdo do quadro sem quebrar o ritmo da aula.
- **Como saberemos que deu certo:**
  - Apagar um traço = **1 clique** (hoje são vários arrastes ou a troca de modo escondida).
  - Mudar o tamanho de um texto existente em **≤ 2 cliques** (selecionar + A+ ou tamanho).
  - **1 único "Desfazer"** reverte cada ação de borracha ou de formatação.
  - 0 erros no console ao abrir lousas salvas antes desta entrega.

## Requisitos da Atividade

### Requisitos funcionais

#### Bloco A: Borracha de traço inteiro

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | **Borracha de traço como padrão (lousa principal):** com a borracha ativa, clicar sobre um traço, texto ou imagem remove o item inteiro; arrastar remove todos os itens tocados no gesto. Durante o gesto, os itens tocados aparecem esmaecidos e são removidos ao soltar, gerando **uma** entrada no histórico. | P0 | CA01, CA02 |
| RF02 | **Escolha do modo continua disponível:** o popover da borracha oferece "Erase whole strokes" (primeira opção, padrão) e "Erase area"; `⇧E` alterna os modos. O ícone do botão indica o modo ativo. | P0 | CA03 |
| RF03 | **Modo lembrado:** o modo da borracha escolhido fica salvo no navegador (`localStorage`), como a posição do dock, e vale para as duas lousas. | P1 | CA03 |
| RF04 | **Borracha de traço na lousa ao vivo:** na sala ao vivo, o professor com a borracha no modo "traço" remove o traço inteiro com clique ou arraste. A remoção é sincronizada para todos os participantes numa **única** escrita atômica no RTDB, e nenhum traço de borracha é criado. O modo "área" continua funcionando como hoje. | P0 | CA04, CA05 |

#### Bloco B: Comandos de texto (lousa principal)

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF05 | **Barra de formatação de texto:** quando a seleção tem pelo menos uma caixa de texto (inclusive durante a edição), aparece uma barra flutuante no topo central da lousa com: A−, S / M / L / XL, A+, Negrito e as 6 cores da lousa. A barra some quando nenhum texto está selecionado. | P0 | CA06, CA10 |
| RF06 | **Aumentar/diminuir fonte:** A+ e A− (e `⌘/Ctrl ⇧ >` e `⌘/Ctrl ⇧ <`) sobem ou descem um passo na escala `12, 14, 16, 18, 20, 24, 28, 32, 36, 44, 56, 72, 96`, sem passar dos limites. Um tamanho fora da escala vai para o próximo valor da escala na direção pedida. | P0 | CA06 |
| RF07 | **Tamanhos pré-definidos:** S = 18, M = 24, L = 36, XL = 56 (coordenadas da página 1280×720). O botão do tamanho atual fica marcado quando todos os textos selecionados têm o mesmo valor. | P0 | CA07 |
| RF08 | **Cor do texto depois de criado:** escolher uma cor na barra muda a cor dos textos selecionados sem trocar a ferramenta ativa nem mudar a cor da caneta. | P0 | CA08 |
| RF09 | **Negrito:** botão B e `⌘/Ctrl + B` alternam o negrito. Se algum texto selecionado não estiver em negrito, todos ficam em negrito; caso contrário, todos perdem o negrito. O negrito aparece na tela, no PNG, no PDF e no PNG gerado ao encerrar a sessão. | P0 | CA09 |
| RF10 | **Vários textos de uma vez:** os comandos valem para todas as caixas de texto da seleção (laço ou `Shift + clique`). Traços e imagens selecionados juntos não são alterados. Cada comando gera **uma** entrada no histórico. | P0 | CA07 |
| RF11 | **Atalhos durante a edição:** `⌘/Ctrl + B` e `⌘/Ctrl ⇧ > / <` funcionam também enquanto o professor digita na caixa, sem perder o foco nem o cursor. | P1 | CA11 |
| RF12 | **Novas caixas herdam o último estilo:** a próxima caixa de texto criada usa o último tamanho, negrito e cor de texto aplicados pela barra. | P1 | CA12 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | **Compatibilidade:** lousas salvas antes desta entrega (`fun-english:whiteboard:*`) abrem sem erro. O campo `bold` é opcional no `BoardTextBox`, e a ausência dele equivale a sem negrito. | P0 | CA13 |
| RNF02 | **Acessibilidade:** todos os novos controles têm `aria-label` em inglês (em `strings.ts`), tooltip com atalho, foco visível e são acessíveis por `Tab`. Negrito e tamanhos usam `aria-pressed`; cores usam `role="radiogroup"`. | P0 | CA14 |
| RNF03 | **Sem regra nova no RTDB:** a remoção de traços na sala ao vivo usa a permissão de escrita do professor que já existe em `liveRooms/$code` (`database.rules.json` não muda). Aluno continua sem conseguir apagar. | P0 | CA05 |
| RNF04 | **Desempenho:** a detecção de traços tocados pela borracha não deixa o arraste travar visivelmente numa página com 200 traços (≥ 50 fps, Chrome, notebook médio). | P1 | CA02 |
| RNF05 | **Entrada:** funciona com mouse, caneta e toque. Os botões da barra de texto não tiram o foco do textarea em edição. | P1 | CA11 |

### Dependências técnicas

- `src/lib/board/types.ts`: `bold?: boolean` em `BoardTextBox`; constantes `BOARD_TEXT_SIZES`, `BOARD_FONT_SCALE`, `DEFAULT_ERASER_MODE`.
- `src/lib/board/hit-test.ts`: extrair `strokeContainsPoint` (reaproveitado pela lousa ao vivo); função `stepFontSize`.
- `src/lib/board/preferences.ts`: preferência do modo da borracha (`useEraserMode` / `setEraserModePreference`).
- `src/lib/board/use-whiteboard.ts`: modo da borracha vindo da preferência; `updateSelectedTexts`, `stepSelectedFontSize`, `setSelectedTextSize`, `setSelectedTextColor`, `toggleSelectedTextBold`; estilo ativo de texto para novas caixas.
- `src/lib/board/board-persistence.ts`: `drawText` aplica peso 700 quando `bold`.
- `src/components/board/board-ui.tsx`: novos `EraserModePicker` (compartilhado) e `TextFormatBar`.
- `src/components/board/classroom-board.tsx` e `board-canvas.tsx`: barra de texto, atalhos, `fontWeight` no overlay e atalhos no textarea.
- `src/components/live/interactive-whiteboard.tsx` + novo `src/lib/live/whiteboard-hit-test.ts` (`findLiveStrokesAt`); remoção via `update(ref(db, "liveRooms/{code}/drawings"), { [id]: null })`.
- `src/lib/strings.ts`: novas strings da barra de texto.

### Recursos necessários

- Revisão do PO sobre os valores de tamanho e a herança de estilo (D01, D02).
- Duas abas/contas (professor e aluno) para validar a sincronização da sala ao vivo.
- Tablet ou caneta para validar RNF05 (opcional).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que há 3 traços na página da lousa principal, quando clico uma vez sobre um deles com a borracha (modo padrão), então só esse traço some por inteiro e um único "Desfazer" o restaura.
- [ ] **CA02:** Dado que a borracha está no modo traço, quando arrasto cruzando 2 traços, então os 2 ficam esmaecidos durante o gesto e somem ao soltar, e um único "Desfazer" restaura ambos.
- [ ] **CA03:** Dado que troquei a borracha para "Erase area" pelo popover (ou por `⇧E`), quando recarrego a página, então a borracha continua no modo área e o ícone indica esse modo.
- [ ] **CA04:** Dado que estou na sala ao vivo como professor e o aluno está conectado, quando clico sobre um traço com a borracha no modo traço, então o traço some na minha tela e na do aluno, e nenhum traço de borracha é gravado em `liveRooms/{code}/drawings`.
- [ ] **CA05 (negativo):** Dado que sou aluno na sala ao vivo, quando tento interagir com a lousa, então não vejo a borracha e não consigo remover traços (a regra do RTDB rejeita a escrita).
- [ ] **CA06:** Dado que uma caixa de texto com fonte 24 está selecionada, quando clico em A+ (ou pressiono `⌘⇧>`), então a fonte passa para 28, e um "Desfazer" volta para 24.
- [ ] **CA07:** Dado que selecionei 2 textos e 1 traço pelo laço, quando escolho "L", então os 2 textos ficam com fonte 36, o traço não muda e um único "Desfazer" reverte os dois textos.
- [ ] **CA08:** Dado que um texto preto está selecionado e a ferramenta ativa é "Selecionar", quando escolho vermelho na barra de texto, então o texto fica vermelho, a ferramenta continua "Selecionar" e a cor da caneta não muda.
- [ ] **CA09:** Dado que apliquei negrito a um texto, quando recarrego a página e exporto PNG, então o texto aparece em negrito na tela e no PNG.
- [ ] **CA10 (negativo):** Dado que nenhuma caixa de texto está selecionada (ou só traços estão selecionados), quando olho a lousa, então a barra de formatação de texto não aparece.
- [ ] **CA11:** Dado que estou digitando numa caixa de texto, quando pressiono `⌘B` e depois clico em A+ na barra, então o texto fica em negrito e maior, e o cursor continua na caixa, sem fechar a edição.
- [ ] **CA12:** Dado que apliquei tamanho XL e negrito a um texto, quando crio uma nova caixa de texto, então ela já nasce com fonte 56 e em negrito.
- [ ] **CA13:** Dado que existe no `localStorage` uma lousa salva antes desta entrega (textos sem `bold`), quando abro `/lousa`, então todos os textos aparecem normais (sem negrito) e não há erro no console.
- [ ] **CA14:** Dado que navego só com teclado, quando pressiono `Tab` até a barra de texto, então cada controle recebe foco visível e tem nome acessível em inglês.
- [ ] **CA15 (limite):** Dado que um texto está com fonte 96, quando clico em A+, então o tamanho continua 96 e nenhuma entrada nova é criada no histórico.

## O que a atividade não inclui

- Formatação parcial dentro da caixa (negrito ou cor em só uma palavra): motivo: exige rich text e muda o modelo de dados; complexo demais agora.
- Itálico, sublinhado, alinhamento e troca de família da fonte: motivo: baixo impacto para o uso em aula; pode entrar depois na mesma barra.
- Caixas de texto e barra de formatação na lousa ao vivo: motivo: a lousa ao vivo (Konva + RTDB) não tem texto; depende da unificação dos motores (outra iniciativa).
- Borracha de traço removendo os "cortes" feitos pela borracha de área: motivo: os cortes continuam fora do alcance da borracha de traço (comportamento atual de `itemContainsPoint`), para não apagar sem querer a correção de outro traço.
- Desfazer na lousa ao vivo: motivo: ela não tem histórico hoje; outra iniciativa.

### Considerado para o futuro (P2)

- Formatação rica por trecho (o campo `bold` opcional não impede migrar para spans depois).
- Levar texto e barra de formatação para a lousa ao vivo após unificar os motores (o `EraserModePicker` e o `strokeContainsPoint` já ficam compartilhados).
- Ajuste fino de tamanho por valor numérico ou slider.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Os tamanhos S/M/L/XL = 18/24/36/56 e a escala do A−/A+ estão adequados para projetor? | PO | Não | Proposta atual; ajustar depois do teste manual se necessário |
| D02 | Novas caixas devem herdar o último estilo aplicado (RF12)? | PO | Não | Proposta: sim |
| D03 | O modo da borracha deve ser lembrado por navegador (RF03) ou sempre começar em "traço"? | PO | Não | Proposta: lembrar |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Clique único apaga traço inteiro | unit (`use-whiteboard`) | CA01 | 3 traços; `startDrawing` + `finishDrawing` no mesmo ponto com borracha padrão; `undo` | Só o traço tocado sai; `undo` restaura |
| CT02 | Arraste apaga vários traços | unit | CA02 | 2 traços; `startDrawing`, `continueDrawing` cruzando ambos, `finishDrawing` | `pendingEraseIds` com 2 ids durante o gesto; 2 removidos; 1 `undo` restaura |
| CT03 | Modo da borracha persiste | unit (`preferences`) | CA03 | `setEraserModePreference("area")`, remontar hook | `eraserMode === "area"` |
| CT04 | Hit-test da lousa ao vivo | unit (`whiteboard-hit-test`) | CA04 | Traços com `points` planos; pontos dentro, fora e sobre traço de borracha | Retorna só traços de caneta tocados |
| CT05 | Remoção sincronizada na sala ao vivo | manual (2 abas) | CA04 | Professor apaga traço com clique | Some nas duas abas; nó removido do RTDB |
| CT06 | Aluno não apaga | manual / emulador | CA05 | Como aluno, tentar `update` em `drawings` | Escrita negada; sem borracha na UI |
| CT07 | `stepFontSize` | unit | CA06, CA15 | 24→+1, 96→+1, 12→−1, 25→+1, 25→−1 | 28, 96, 12, 28, 24 |
| CT08 | Tamanho em seleção mista | unit | CA07 | Selecionar 2 textos + 1 traço; `setSelectedTextSize("l")`; `undo` | Textos 36, traço intacto; 1 `undo` reverte |
| CT09 | Cor do texto sem trocar ferramenta | integração (`classroom-board`) | CA08 | Selecionar texto; clicar vermelho na barra | Texto vermelho; `activeTool` e `activeColor` inalterados |
| CT10 | Negrito persiste e é exportado | unit (`board-persistence`) | CA09 | Texto com `bold: true`; salvar/carregar; mock de `ctx` em `drawText` | `bold` mantido; `ctx.font` começa com `700` |
| CT11 | Barra só com texto selecionado | integração | CA10 | Sem seleção; só traço selecionado; texto selecionado | Barra visível apenas no último caso |
| CT12 | Atalhos durante a edição | integração | CA11 | Editar texto; `⌘B`; clicar A+ | Negrito + fonte maior; textarea continua focado |
| CT13 | Herança de estilo | unit | CA12 | Aplicar XL + negrito; `addTextBox` | Nova caixa com 56 e `bold: true` |
| CT14 | Lousa antiga | unit | CA13 | Carregar JSON salvo sem `bold` | Carrega sem erro; textos sem negrito |
| CT15 | Acessibilidade da barra | manual / a11y | CA14 | Navegar com `Tab`; inspecionar nomes | Foco visível; `aria-label` em todos |

## URL Complementar

- Documentação técnica: [`src/lib/board/use-whiteboard.ts`](../src/lib/board/use-whiteboard.ts), [`src/lib/board/hit-test.ts`](../src/lib/board/hit-test.ts), [`src/components/board/classroom-board.tsx`](../src/components/board/classroom-board.tsx), [`src/components/live/interactive-whiteboard.tsx`](../src/components/live/interactive-whiteboard.tsx), [`database.rules.json`](../database.rules.json)
- Protótipo / mockup: barra de texto `[A−] [S][M][L][XL] [A+] │ [B] │ ● ● ● ● ● ●` no topo central, no mesmo estilo de ilha do dock
- Discussões relacionadas: `SDD/2026-10-07_melhorias-da-lousa.md` (RF09 coberto aqui); `SDD/DONE/2026-10-06_redesign-ux-ui-lousa.md` (borracha de traço, RF06)
- Referências de design: Excalidraw (borracha de objeto), Google Jamboard (barra de texto contextual), tldraw
- Requisitos originais: pedido do PO em 2026-10-14 ("melhoria das ferramentas da lousa, borracha que ao clicar apaga todo traço, e comandos como alterar, aumentar fonte")
- Issue / PR relacionado: a preencher com o PR desta spec
