# [UI] Redesign de UX/UI da Lousa: visual moderno e adaptado aos temas

> **Status:** Em validação (implementada; faltam os testes manuais listados em "Notas da implementação")
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-06 · **Atualizada em:** 2026-10-06
> **Substitui visualmente:** a UI entregue em `SDD/DONE/2026-10-03_07-lousa-virtual.md`, `SDD/DONE/2026-10-06_lousa-interativa.md` e `SDD/DONE/2026-10-06_atalho-lousa.md`. As funcionalidades dessas specs continuam valendo; esta muda só a aparência, a organização dos controles e o comportamento visual nos temas.

## Detalhes da Atividade

- **O que precisa ser feito:** Redesenhar a interface da lousa (`/lousa`, aba Board da sessão e lousa da sala ao vivo) para que pareça uma ferramenta atual, no nível de tldraw, Excalidraw e FigJam: área de desenho ocupando o espaço, controles em barras flutuantes compactas, estilo (cor e espessura) em popover, superfície da lousa e cores de tinta que se adaptam aos temas `dark`, `light` e `sepia` do site, e uma linguagem visual única entre a lousa local e a lousa ao vivo.
- **Problema e evidência:** O professor relatou que a lousa "parece muito retrô, anos 90" e que, ao trocar o tema do site, ela "não se adapta e fica muito feia", principalmente em dark mode. A análise do código confirma as causas:
  1. **Tokens de cor inexistentes.** `classroom-board.tsx` usa `bg-surface`, `bg-surface-raised`, `border-border`, `text-fg-muted`, `text-danger` e `bg-danger/*` (cerca de 70 ocorrências), mas nenhum deles existe em `src/styles/theme.css`, que só define `primary`, `secondary`, `elevated`, `fg`, `fg-secondary`, `muted`, `accent`, `accent-muted`, `border-subtle`, `border-strong`, `error` e `success`. Essas classes não geram CSS: a barra fica transparente, os botões perdem o hover e as bordas caem no padrão do Tailwind v4 (`currentColor`), o que desenha linhas claras e grossas no dark mode.
  2. **Cores fixas que ignoram o tema.** O canvas é `bg-white` e é pintado com `#ffffff`; as linhas do quadriculado e do pautado são `#e2e8f0` e `#cbd5e1` (`board-persistence.ts`); a caixa de texto usa `bg-white/95`, `border-blue-400` e `bg-blue-600`; o aviso de palavras enviadas usa `emerald-*`; a lousa ao vivo (`interactive-whiteboard.tsx`) usa `bg-white`, `bg-neutral-100` e `text-red-600`. No dark mode aparece um retângulo branco estourado no meio de uma página preta, com azul e verde que não pertencem à marca (o acento é dourado).
  3. **Contraste ruim no botão ativo.** A ferramenta ativa é `bg-accent text-white`. No dark mode o acento é `#c5a880`, e o branco sobre ele fica em torno de 2:1, abaixo do mínimo de 3:1 para componentes (WCAG 1.4.11). O `Button` primário do projeto já resolve isso com `text-primary`.
  4. **Borracha que pinta de branco.** A borracha desenha com `BOARD_WHITE` em vez de apagar. Em qualquer superfície que não seja branca ela deixa manchas brancas, e no PNG exportado também.
  5. **Paleta pensada só para fundo branco.** A primeira cor (`#1e293b`, "preto") some numa lousa escura, e não há uma cor de tinta que se inverta com o tema.
  6. **Toolbar "de Paint".** São cerca de 25 controles numa única faixa com `flex-wrap`: ferramentas, 3 espessuras, 6 cores, desfazer/refazer, limpar, 3 fundos com texto, paginação, enviar palavras, exportar e expandir. Em notebooks a faixa quebra em 2 ou 3 linhas desalinhadas. Os botões têm cerca de 28 px, abaixo do alvo de toque de 44 px num iPad.
  7. **Canvas distorcido e borrado.** O canvas tem 1280×720 fixos e é esticado com `w-full h-full`, o que deforma a proporção quando o contêiner não é 16:9. Ele também ignora `devicePixelRatio`, então o traço fica borrado em telas Retina.
  8. **Duas lousas com visuais diferentes.** A lousa local (canvas nativo) e a lousa ao vivo (Konva) têm barras, cores e comportamentos diferentes. Ao abrir a sala ao vivo, o professor vê de repente outra ferramenta.
  9. **Idioma misturado.** O cabeçalho de `/lousa` está em português ("Lousa Digital", "Conectar com Alunos (Live)"), escrito direto no componente, e a lousa usa `strings.whiteboard` em inglês.
  10. **Modais e avisos improvisados.** Três modais escritos à mão, sem foco preso nem retorno do foco, e um aviso de sucesso que empurra o canvas para baixo e causa salto de layout.
- **Impacto de não fazer:** A lousa é projetada para a turma ou compartilhada no Meet/Zoom, então a aparência dela é a aparência do Fun English na frente dos alunos. Com o visual atual o professor tende a voltar para Jamboard, Miro ou Excalidraw, e a lousa (e o envio de vocabulário que depende dela) deixa de ser usada. Quem usa o tema escuro, que é o padrão do site, tem a pior experiência.
- **Para quem é destinado:** Professor que conduz aula presencial projetada ou aula online com tela compartilhada, em notebook ou iPad com caneta, em qualquer um dos temas. Secundariamente, o aluno que acompanha a lousa ao vivo.
- **História de usuário:** Como professor, quero uma lousa limpa e moderna que combine com o tema que eu escolhi, com as ferramentas à mão sem poluir a tela, para explicar o conteúdo com segurança na frente da turma.
- **Como saberemos que deu certo:**
  - 0 classes de cor que não existem no tema e 0 cores hexadecimais fixas nos componentes da lousa (fora da definição de tokens). Verificável por teste automatizado.
  - Nos 3 temas, todo texto da interface com contraste ≥ 4,5:1 e todo ícone ou borda de controle com ≥ 3:1 (axe/Lighthouse sem violações de contraste).
  - Barra de ferramentas em 1 linha a partir de 1024 px de largura, e área de desenho ocupando ≥ 85% da altura útil em `/lousa`.
  - Trocar o tema com a lousa aberta atualiza superfície, grade e tinta padrão em < 100 ms, sem recarregar a página e sem perder conteúdo.
  - Em teste de uso com o professor, ele desenha, troca de cor e espessura, apaga, escreve um texto e exporta sem precisar de explicação.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | **Layout de tela cheia com barras flutuantes.** O canvas ocupa toda a área da lousa. Os controles ficam em "ilhas" flutuantes sobre ele, com fundo `elevated`, borda `border-subtle`, cantos de 12–16 px e sombra suave: (a) **dock de ferramentas**, por padrão **vertical e colado à esquerda**, centralizado na altura (padrão Miro), ou horizontal no topo (RF17); (b) **ações** no canto superior direito (desfazer, refazer, menu "Mais", expandir); (c) **páginas** no canto inferior direito; (d) **status e sala ao vivo** no canto superior esquerdo. Nenhuma ilha fica na borda inferior, para não disputar espaço com a barra do Meet/Zoom ao compartilhar a tela. | P0 | CA01, CA02 |
| RF02 | **Dock de ferramentas enxuto.** O dock mostra só as ferramentas: Selecionar (V), Caneta (P), Marca-texto (H), Borracha (E), Texto (T) e um botão de **estilo** com um disco mostrando a cor e a espessura atuais. Cada botão tem tooltip com nome e atalho, exibido do lado oposto à borda onde o dock está. A ferramenta ativa usa `bg-accent text-primary` (o mesmo padrão do `Button` primário) e `aria-pressed="true"`. | P0 | CA02, CA07 |
| RF03 | **Popover de estilo.** Ao clicar no disco de estilo abre um popover ancorado no dock (à direita dele com o dock à esquerda, abaixo dele com o dock no topo) com as cores de tinta (RF05) e 3 espessuras com prévia real do traço. A escolha vale para caneta e texto; o marca-texto usa a mesma cor com transparência. Fecha com Esc, com clique fora ou ao começar a desenhar. | P0 | CA03 |
| RF04 | **Superfície da lousa por tema.** A lousa tem a opção "Superfície" com os valores **Automática** (padrão, segue o tema do site), **Clara** e **Escura**. Na Automática: tema `dark` usa grafite escuro (não preto puro, ex.: `#16171a`) e os temas `light` e `sepia` usam a mesma superfície clara neutra. Grade e pauta usam a cor de linha da superfície com contraste baixo, sem disputar com a tinta. A preferência é do professor (salva localmente) e não fica gravada na página. | P0 | CA04, CA05 |
| RF05 | **Tinta semântica.** As cores de tinta passam a ser chaves (`ink`, `red`, `blue`, `green`, `amber`, `violet`) resolvidas para hex conforme a superfície. `ink` é quase preto na superfície clara e quase branco na escura, e as demais têm uma versão clara e uma escura, cada uma com contraste ≥ 3:1 sobre a própria superfície. Itens já salvos com hex antigo são mapeados para a chave mais próxima ao carregar (`#1e293b` → `ink`, `#ef4444` → `red`, etc.); hex desconhecido é desenhado como está. | P0 | CA05, CA06 |
| RF06 | **Borracha real com dois modos.** A borracha apaga de verdade, em vez de pintar de branco, e funciona igual em qualquer superfície e no PNG exportado. Ela tem dois modos, escolhidos num popover ao clicar de novo no botão da borracha (ou com Shift+E): **Área** (padrão; apaga só por onde passa, via `globalCompositeOperation = "destination-out"` ou camada separada) e **Traço inteiro** (tocar ou arrastar sobre um traço, caixa de texto ou imagem remove o item todo, com destaque do item antes de soltar). O ícone do botão indica o modo ativo, e cada apagamento é desfeito com Ctrl/Cmd+Z. | P0 | CA06, CA20 |
| RF07 | **Menu "Mais".** Ações secundárias saem da barra principal e vão para um menu no canto superior direito: Fundo (Liso / Quadriculado / Pautado, com miniatura), Superfície (RF04), Posição da barra (RF17), Exportar PNG, Enviar palavras aos alunos e Limpar página (em vermelho `error`, com confirmação). "Enviar palavras" também aparece como botão de destaque quando há caixas de texto com conteúdo. | P0 | CA02, CA08 |
| RF08 | **Paginação compacta.** A ilha de páginas mostra "‹ 2 / 5 › +". Clicar no número abre uma tira de miniaturas das páginas, com opção de excluir a página (com confirmação). O botão "+" some quando chega ao limite de 10 páginas. | P1 | CA09 |
| RF09 | **Diálogos e avisos do design system.** Os três modais (limpar, excluir página, enviar palavras) usam um componente `Dialog` único em `components/ui/` com foco preso, Esc para fechar e retorno do foco ao botão de origem. Os avisos de sucesso e erro usam o `toast` já existente em `components/ui/toast.tsx`, flutuando sobre a lousa, sem empurrar o canvas. | P0 | CA10 |
| RF10 | **Estado vazio e retorno visual.** Página vazia mostra no centro uma dica discreta ("Desenhe, digite ou cole uma imagem", com os atalhos), que some no primeiro traço. O cursor mostra um círculo do tamanho real da caneta ou da borracha. A ilha de status mostra "Salvando…" / "Salvo" conforme a persistência. | P1 | CA11 |
| RF11 | **Caixa de texto e imagem no tema.** Seleção, alças de redimensionar e rótulo de arrastar usam `accent` (não azul fixo). O texto em edição fica sobre a própria superfície da lousa, sem caixa branca. | P0 | CA05 |
| RF12 | **Atalhos de teclado.** V, P, H, E, T para ferramentas; 1–6 para as cores; `[` e `]` para espessura; Ctrl/Cmd+Z e Ctrl/Cmd+Shift+Z para desfazer e refazer; Delete para apagar o item selecionado; Esc para fechar popover, diálogo ou sair do modo expandido. Nenhum atalho dispara enquanto uma caixa de texto está em edição. | P1 | CA07 |
| RF13 | **Cabeçalho de `/lousa` integrado.** O cabeçalho separado da página sai. "Voltar ao Dashboard", o título e o botão da sala ao vivo passam para a ilha superior esquerda da própria lousa, que fica com a altura total disponível abaixo do `SiteHeader`. Com a sala ao vivo ativa, a ilha mostra um selo "Ao vivo · CÓDIGO" com ponto pulsante (sem pulsar quando `prefers-reduced-motion`). | P0 | CA01 |
| RF14 | **Mesma linguagem na lousa ao vivo.** `interactive-whiteboard.tsx` passa a usar os mesmos tokens, a mesma superfície, o mesmo dock e a mesma tinta semântica da lousa local. Os traços sincronizados guardam a chave de cor, então o aluno vê a tinta adaptada ao tema dele. | P1 | CA12 |
| RF15 | **Responsivo e toque.** Abaixo de 768 px o dock fica sempre horizontal no topo (ignora a preferência de RF17, sem apagá-la), com as 5 ferramentas e o estilo; as ilhas de páginas e de ações se juntam numa só no canto superior direito. Todos os controles têm área de toque ≥ 44×44 px em telas de toque (`pointer: coarse`) e ≥ 36×36 px com mouse. | P0 | CA13 |
| RF16 | **Textos pelo `strings.ts`, em inglês.** Todo texto da lousa, inclusive o cabeçalho de `/lousa` hoje escrito à mão em português, vem de `strings.whiteboard`, em inglês (D01). | P1 | CA14 |
| RF17 | **Escolher a posição da barra.** O professor escolhe onde fica o dock de ferramentas: **Esquerda** (padrão, vertical) ou **Topo** (horizontal, centralizado entre as ilhas superiores). A escolha fica em "Mais → Posição da barra" e num botão pequeno de alternar no fim do próprio dock (ícone de layout, tooltip "Move toolbar to top/left"). A troca anima o dock para a nova borda em ≤ 150 ms, mantém ferramenta, cor e espessura, e fica salva localmente (`localStorage`, com fallback silencioso), valendo para `/lousa`, aba Board e lousa ao vivo. | P1 | CA19 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | **Só tokens do tema.** Os componentes da lousa (`components/board/*`, `interactive-whiteboard.tsx`, `whiteboard-page-view.tsx`) usam apenas utilitários mapeados em `src/styles/theme.css`. As cores de superfície e tinta viram tokens novos no próprio `theme.css` (ex.: `--board-surface`, `--board-grid`, `--board-ink`, `--board-red`…), definidos para `dark`, `light` e `sepia`, e o canvas os lê com `getComputedStyle`. Proibido: `bg-white`, `bg-neutral-*`, `blue-*`, `emerald-*`, `red-*`, `text-white` e hex literal nesses arquivos. | P0 | CA15 |
| RNF02 | **Contraste WCAG 2.2 AA** nos 3 temas: texto ≥ 4,5:1, ícones, bordas de controle e anel de foco ≥ 3:1, tinta sobre a superfície ≥ 3:1. Foco visível com `focus-visible:ring-2 ring-accent` em todo controle. | P0 | CA16 |
| RNF03 | **Canvas nítido e sem distorção.** O sistema de coordenadas lógico continua 1280×720 (compatível com o que já está salvo e com o PNG exportado). A página é exibida em 16:9 com escala "contain", centralizada, com o espaço que sobra preenchido pelo fundo `secondary`, e o buffer do canvas é multiplicado por `devicePixelRatio` (limite 2). | P0 | CA17 |
| RNF04 | **Troca de tema ao vivo.** A lousa assina `subscribeToTheme` (`src/lib/theme.ts`) e redesenha ao trocar o tema, em < 100 ms numa página com 500 traços, sem recarregar e sem alterar os dados salvos. | P0 | CA04 |
| RNF05 | **Movimento.** Popovers e ilhas animam opacidade e escala em ≤ 150 ms usando `--transition-fast`; nada anima quando `prefers-reduced-motion: reduce`. | P1 | |
| RNF06 | **Acessibilidade do dock.** O dock é `role="toolbar"` com `aria-label` e navegação por setas (roving tabindex). Popovers e menus seguem os padrões ARIA de menu/dialog. | P1 | CA07 |
| RNF07 | **Sem regressão de peso.** Não adicionar biblioteca de UI. Popover, menu e diálogo são componentes próprios em `components/ui/`, ou o elemento nativo `<dialog>`/Popover API. A lousa continua carregada sob demanda (`dynamic import`). | P0 | |
| RNF08 | **Exportação previsível.** O "Exportar PNG" manual usa a superfície escolhida no momento. O PNG gerado ao encerrar a sessão (resumo e portal do aluno) usa **sempre a superfície clara**, com a tinta na versão clara, seja qual for o tema do professor (D02). Os dois têm fundo opaco. | P1 | CA18, CA21 |

### Dependências técnicas

- Tokens e temas: `src/styles/theme.css`, `src/lib/theme.ts` (`subscribeToTheme`, `resolveTheme`).
- Componentes da lousa: `src/components/board/classroom-board.tsx`, `board-canvas.tsx`, `whiteboard-page-view.tsx`; `src/components/live/interactive-whiteboard.tsx`.
- Renderização e persistência: `src/lib/board/board-persistence.ts` (`renderBoardPageToCanvas`), `src/lib/board/use-whiteboard.ts`, `src/lib/board/types.ts` (`BOARD_COLORS`, `BOARD_WHITE`).
- UI compartilhada: `src/components/ui/button.tsx`, `toast.tsx`; novos `dialog.tsx`, `popover.tsx` e `menu.tsx` em `components/ui/`.
- Textos: `src/lib/strings.ts` (`strings.whiteboard`).
- Página de vitrine `src/app/dev/ui/page.dev.tsx` para revisar os componentes novos nos 3 temas.

### Recursos necessários

- Mockup (Figma ou captura de protótipo) das ilhas flutuantes nos temas dark, light e sepia, aprovado pelo PO antes da implementação.
- Tabela final das cores de superfície e tinta por tema, com os contrastes medidos.
- Ícones do `lucide-react` (já instalado).
- Um iPad ou tablet com caneta para validar toque e alvos de 44 px.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado um professor em `/lousa` num notebook de 1366×768, quando a página carrega, então a lousa ocupa toda a altura abaixo do `SiteHeader`, sem cabeçalho separado, e "Voltar", título e "Sala ao vivo" aparecem na ilha superior esquerda.
- [x] **CA02:** Dado a lousa aberta com largura ≥ 1024 px e sem preferência salva, quando observo os controles, então o dock de ferramentas fica vertical, colado à esquerda e centralizado na altura; nenhuma ilha fica na borda inferior; e fundo, superfície, exportar, enviar palavras e limpar ficam dentro do menu "Mais", não no dock.
- [x] **CA03:** Dado a caneta ativa, quando abro o disco de estilo, escolho vermelho e a espessura grossa, então o popover fecha ao começar a desenhar, o traço sai vermelho e grosso, e o disco passa a mostrar vermelho e grosso.
- [x] **CA04:** Dado a lousa com conteúdo e a superfície em "Automática", quando troco o tema do site de light para dark pelo seletor de tema, então em menos de 100 ms a superfície fica grafite, a grade escurece e a tinta `ink` fica clara, sem recarregar e sem perder nenhum item.
- [x] **CA05:** Dado o site em dark mode, quando abro a lousa, então não há nenhuma área branca (canvas, caixa de texto em edição, barra, modal ou aviso), e seleção e alças usam a cor de acento dourada.
- [x] **CA06:** Dado uma página salva antes desta mudança, com traços em `#1e293b` e uma área apagada com a borracha antiga, quando a abro na superfície escura, então os traços `#1e293b` aparecem claros (mapeados para `ink`) e novos usos da borracha apagam sem deixar mancha branca.
- [x] **CA07:** Dado a lousa com foco, quando pressiono E, depois `]` e depois Ctrl/Cmd+Z, então a borracha fica ativa com o botão `aria-pressed="true"`, a espessura aumenta um nível e o último item é desfeito; e, com uma caixa de texto em edição, digitar "e" escreve a letra e não troca de ferramenta.
- [x] **CA08:** Dado o menu "Mais" aberto, quando escolho "Limpar página", então um diálogo de confirmação aparece e só limpa ao confirmar; Cancelar e Esc não alteram a página.
- [x] **CA09:** Dado 3 páginas, quando clico em "2 / 3", então aparece a tira de miniaturas e clicar na miniatura 1 leva à página 1 com o conteúdo intacto; com 10 páginas, o botão "+" não aparece.
- [ ] **CA10:** Dado o diálogo "Enviar palavras aos alunos" aberto pelo teclado, quando navego com Tab, então o foco não sai do diálogo; ao confirmar, um toast "N palavras enviadas" aparece sobre a lousa sem mover o canvas, e o foco volta ao botão que abriu o diálogo.
- [x] **CA11:** Dado uma página vazia, quando a lousa abre, então a dica central aparece; quando faço o primeiro traço, ela some; e a ilha de status mostra "Salvando…" e depois "Salvo".
- [ ] **CA12:** Dado o professor em tema light e um aluno em tema dark na mesma sala ao vivo, quando o professor desenha com `ink`, então o professor vê traço escuro em superfície clara e o aluno vê traço claro em superfície escura, com o mesmo dock e estilo visual nas duas lousas.
- [ ] **CA13:** Dado um iPad (largura < 768 px ou `pointer: coarse`), quando abro a lousa, então nenhum controle fica cortado ou quebra em várias linhas, todo alvo de toque mede ≥ 44×44 px, e desenhar com a caneta não rola nem dá zoom na página.
- [x] **CA14:** Dado a página `/lousa`, quando procuro textos escritos direto no JSX de `whiteboard-page-view.tsx` e `classroom-board.tsx`, então não encontro nenhum: todos vêm de `strings.whiteboard`, num único idioma.
- [x] **CA15 (negativo):** Dado o código da lousa, quando o teste de tokens roda, então ele falha se encontrar `bg-surface`, `border-border`, `text-fg-muted`, `danger`, `bg-white`, `neutral-`, `blue-`, `emerald-`, `red-`, `text-white` ou um hex literal fora da definição de tokens; e passa no código entregue.
- [ ] **CA16:** Dado cada tema (dark, light, sepia), quando rodo axe na página `/lousa` com o menu "Mais" e o popover de estilo abertos, então não há violações de contraste nem de nome acessível.
- [ ] **CA17 (limite):** Dado uma janela de 1600×600 (mais larga que 16:9) numa tela Retina, quando desenho um círculo, então ele aparece redondo (não oval), com borda nítida, e a página fica centralizada com faixas laterais na cor `secondary`.
- [x] **CA18:** Dado a superfície escura, quando exporto a página como PNG, então o arquivo tem fundo opaco na cor da superfície e a tinta com as cores da superfície escura, e nenhuma área apagada fica branca ou transparente.
- [x] **CA19:** Dado o dock à esquerda, quando clico no botão de alternar posição no fim do dock, então ele vai para o topo, horizontal, mantendo ferramenta, cor e espessura; quando recarrego a página ou abro a aba Board, ele continua no topo; e com a janela abaixo de 768 px ele fica no topo, voltando à esquerda ao alargar a janela se essa for a preferência salva.
- [x] **CA20:** Dado um traço longo e uma caixa de texto na página, quando ativo a borracha no modo "Traço inteiro" e toco no meio do traço, então o traço inteiro some (a caixa de texto não); no modo "Área", só a parte por onde passei some; e Ctrl/Cmd+Z restaura o que foi apagado nos dois modos.
- [x] **CA21:** Dado o professor em tema dark com superfície escura, quando encerra a sessão, então o PNG anexado ao resumo e mostrado no portal do aluno tem fundo claro e tinta `ink` escura.

## Notas da implementação (2026-10-06)

**Entregue:** `src/lib/board/ink.ts` (superfícies e tinta semântica), `src/lib/board/preferences.ts` (superfície e posição da barra), `src/lib/board/hit-test.ts` (borracha de traço inteiro), `src/components/board/board-ui.tsx` (ilhas, dock, botões com tooltip, seletor de tinta), `src/components/ui/dialog.tsx` e `popover.tsx`, e a reescrita de `classroom-board.tsx`, `board-canvas.tsx`, `whiteboard-page-view.tsx` e `interactive-whiteboard.tsx`. Página de revisão só em dev: `/dev/lousa`. Testes novos em `tests/unit/board/board-redesign.test.tsx`.

**Desvios em relação ao texto da spec:**
- RNF01: as cores da superfície e da tinta ficam em `src/lib/board/ink.ts`, não em `theme.css`. O PNG precisa delas fora do CSS (o PNG do resumo é sempre claro, seja qual for o tema), e manter uma fonte só evita duas paletas divergentes. Os componentes continuam sem nenhum hex, garantido pelo teste CT14.
- RF09: os avisos de sucesso e erro flutuam dentro da própria lousa, em vez de usar o `toast` global. O toast global fica atrás da lousa expandida e da tela cheia da sessão.
- RF06: o traço inteiro é apagado ao soltar; enquanto arrasta, os itens tocados ficam esmaecidos (o "destaque antes de soltar").
- Corrigido junto: o texto aparecia duas vezes (no canvas e no overlay); agora o canvas da tela desenha só traços, e o texto é desenhado no canvas apenas no PNG, com a mesma quebra de linha do overlay. Caixas de texto deixadas vazias são removidas.
- CA21: hoje nenhum fluxo envia o PNG da lousa ao encerrar a sessão (o portal mostra só o texto). A regra "sempre clara" foi garantida na função `exportBoardPageToBlob`, que é clara por padrão, e vale quando esse envio for implementado.

- Correção pós-deploy: o botão "Expand board" encolhia a lousa para 2 px (as classes `relative` e `fixed` juntas, com `relative` vencendo). Corrigido, com teste de regressão.

**Validação pendente (manual):**
- CA10: confirmar a devolução do foco ao fechar com Esc numa aba visível. No painel de testes a aba estava em segundo plano, e nesse estado o Chromium não dispara o evento `close` do `<dialog>`.
- CA12: sala ao vivo com professor e aluno em temas diferentes (precisa do Firebase).
- CA13: iPad com caneta. A largura de celular (375 px) já foi conferida no navegador.
- CA16: rodar axe nos 3 temas.
- CA17: conferir a nitidez numa tela Retina em 1600×600.

## O que a atividade não inclui

- Trocar o motor de desenho (unificar canvas nativo e Konva numa única implementação): motivo: complexo demais agora; esta atividade unifica o visual (RF14) e o motor fica para outra spec.
- Novas ferramentas (formas, setas, laser pointer, stickers, co-autoria): motivo: são funcionalidades, não UI; já estão listadas como P2 em `SDD/DONE/2026-10-06_lousa-interativa.md`.
- Canvas infinito com zoom e pan: motivo: muda o modelo de dados (página 16:9 fixa) e o PNG do resumo; ver futuro.
- Mudar o tema global do site ou os tokens já existentes: motivo: outra iniciativa; aqui só se adicionam tokens `--board-*`.
- Alterar persistência, regras do Firebase ou formato de sincronização além de guardar a chave de cor: motivo: fora do escopo de UI.

### Considerado para o futuro (P2)

- Superfície "Quadro verde" (giz) e "Lousa preta" como opções extras de RF04: a lista de superfícies deve ser extensível.
- Canvas infinito com zoom e pan, mantendo a página 16:9 como "quadro de exportação".
- Paleta de tinta personalizada por professor.
- Mais posições para o dock (direita) e salvar a preferência na conta do professor em vez de só no navegador: RF17 deve guardar a posição como valor de uma lista, não como booleano.
- Unificação do motor de desenho entre lousa local e ao vivo.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Qual idioma da interface da lousa: inglês (como o resto de `strings.ts`) ou português (como o cabeçalho atual de `/lousa`)? | PO | Não | **Inglês** (2026-10-06), coerente com o restante do site e com a imersão no idioma. Ver RF16. |
| D02 | O PNG gerado ao encerrar a sessão (visto pelo aluno no portal) deve usar a superfície do professor ou sempre a clara? | PO | Não | **Sempre a clara** no PNG do resumo; o "Exportar PNG" manual usa a superfície atual (2026-10-06). Ver RNF08. |
| D03 | O dock fica embaixo (padrão tldraw/FigJam) ou à esquerda (padrão Excalidraw/Miro)? Embaixo pode competir com a barra do Meet/Zoom ao compartilhar tela. | Design/PO | Sim | **À esquerda como padrão (igual ao Miro)**, com opção para o professor mudar para o topo (2026-10-06). Ver RF01 e RF17. |
| D04 | A borracha deve apagar por área (pixel) ou o traço inteiro ao tocar (objeto)? | PO | Não | **Os dois já nesta entrega**, com "Área" como padrão (2026-10-06). Ver RF06. |
| D05 | No tema `sepia`, a superfície Automática deve ser creme (papel) ou clara neutra? | Design | Não | **Clara neutra**, igual ao tema light (2026-10-06). Ver RF04. |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Layout de `/lousa` | e2e (Playwright, 1366×768) | CA01, CA02 | Limpar o `localStorage`; abrir `/lousa`; medir a altura da lousa e a posição do dock | Lousa ≥ 85% da altura útil; dock vertical à esquerda; nada na borda inferior; ações secundárias só no menu "Mais" |
| CT02 | Popover de estilo | e2e | CA03 | Abrir estilo; escolher vermelho e grosso; desenhar | Popover fecha; traço vermelho grosso; disco atualizado |
| CT03 | Troca de tema ao vivo | e2e + medição de tempo | CA04, CA05 | Desenhar; trocar light → dark → sepia pelo seletor; medir o redesenho | Superfície e tinta mudam em < 100 ms; nenhum pixel `#ffffff` no dark (checagem por amostragem do canvas e dos estilos calculados) |
| CT04 | Migração de cor antiga | unit | CA06 | Passar `#1e293b`, `#ef4444` e `#123456` ao mapeador | `ink`, `red`, e `#123456` sem alteração |
| CT05 | Borracha real | unit (canvas) + manual | CA06, CA18 | Desenhar e apagar na superfície escura; exportar | Pixels apagados com a cor da superfície; sem branco |
| CT06 | Atalhos | e2e | CA07 | E, `]`, Ctrl+Z; depois editar texto e digitar "e" | Ferramenta, espessura e desfazer corretos; nada disparado durante a edição |
| CT07 | Limpar com confirmação | e2e | CA08 | Mais → Limpar → Cancelar; repetir e confirmar | Só limpa ao confirmar |
| CT08 | Páginas e miniaturas | e2e | CA09 | Criar 3 páginas; abrir a tira; ir à 1; criar até 10 | Conteúdo intacto; "+" some com 10 |
| CT09 | Diálogo acessível | e2e (teclado) | CA10 | Abrir "Enviar palavras" pelo teclado; Tab várias vezes; confirmar | Foco preso; toast sem salto de layout; foco devolvido |
| CT10 | Estado vazio e status | manual | CA11 | Abrir página nova; desenhar | Dica some; "Salvando…" → "Salvo" |
| CT11 | Ao vivo com temas diferentes | manual (2 navegadores) | CA12 | Professor em light, aluno em dark; desenhar com `ink` | Cada um vê a tinta adaptada ao próprio tema, com o mesmo visual |
| CT12 | Tablet | manual (iPad) + e2e (`mobile`, `hasTouch`) | CA13 | Abrir e desenhar com a caneta; medir os alvos | Alvos ≥ 44 px; sem rolagem nem zoom |
| CT13 | Textos centralizados | unit (varredura do JSX) ou revisão | CA14 | Procurar literais no JSX | Nenhum literal; tudo em `strings.whiteboard` |
| CT14 | Teste de tokens proibidos | unit (Vitest lendo os arquivos) | CA15 | Rodar no código entregue e num arquivo de exemplo com `bg-white` | Passa no entregue; falha no exemplo |
| CT15 | Contraste e acessibilidade | e2e (`@axe-core/playwright`) nos 3 temas | CA16 | Abrir menu e popover; rodar axe | 0 violações de contraste e de nome |
| CT16 | Proporção e nitidez | e2e (1600×600, `deviceScaleFactor: 2`) | CA17 | Desenhar um círculo; checar o tamanho do buffer | Círculo redondo; buffer = tamanho exibido × 2; faixas laterais `secondary` |
| CT17 | PNG na superfície escura | e2e (download) | CA18 | Exportar na superfície escura | Fundo opaco escuro; tinta correta |
| CT19 | Posição da barra | e2e | CA19 | Alternar para o topo; recarregar; abrir a aba Board; reduzir a janela para 700 px e voltar para 1366 px | Dock no topo após recarregar e na aba Board; topo em 700 px; volta ao topo (preferência) em 1366 px; ferramenta e cor mantidas |
| CT20 | Borracha nos dois modos | unit (remoção de itens) + e2e | CA20 | Modo "Traço inteiro": tocar num traço; modo "Área": passar sobre outro; desfazer os dois | Traço inteiro removido; só a área apagada no outro; desfazer restaura ambos |
| CT21 | PNG do resumo sempre claro | integração (emulador) | CA21 | Professor em dark com superfície escura encerra a sessão; abrir o resumo no portal | PNG com fundo claro e tinta escura |
| CT18 | Revisão visual | manual com capturas | todos | Capturar `/lousa`, aba Board e lousa ao vivo nos 3 temas, com o dock à esquerda e no topo, e comparar com o mockup aprovado | Visual igual ao mockup; nenhum elemento "anos 90" (bordas grossas, faixas cinza, cores fora da marca) |

## URL Complementar

- Documentação técnica: `src/styles/theme.css` (tokens), `src/lib/theme.ts` (temas), `SDD/DONE/2026-10-03_07-lousa-virtual.md`, `SDD/DONE/2026-10-06_lousa-interativa.md`, `SDD/DONE/2026-10-06_atalho-lousa.md`.
- Protótipo / mockup: a produzir (ver Recursos necessários).
- Discussões relacionadas: relato do professor de 2026-10-06: a lousa "parece muito retrô, anos 90" e "não se adapta" ao trocar o tema, principalmente em dark mode.
- Referências de design: Miro (dock vertical à esquerda), tldraw (popover de estilo), Excalidraw (ilhas flutuantes, tinta que inverte no tema escuro), FigJam (estado vazio e cursores), Apple Freeform (superfícies por tema). WCAG 2.2: 1.4.3 (contraste de texto), 1.4.11 (contraste de componentes), 2.5.8 (tamanho do alvo).
- Requisitos originais: "analisar a SDD sobre a lousa e melhorar ela pois parece muito retrô, anos 90, e se eu troco o tema do site ela não se adapta totalmente".
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
