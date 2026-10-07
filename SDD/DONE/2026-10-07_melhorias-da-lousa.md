# [FEAT] Melhorias da Lousa: seleção livre, ponteiro laser, páginas e recursos para aula de inglês

> **Status:** Em andamento (Bloco A)
> **Autor:** AI · **Revisor:** Natanael Brentano · **Criada em:** 2026-10-07 · **Atualizada em:** 2026-10-07

## Detalhes da Atividade

- **O que precisa ser feito:** evoluir a lousa (`/lousa` e aba Board da sessão de aula) com um pacote de melhorias pensado em como o professor de inglês realmente usa o quadro: explicar apontando, reorganizar o que já escreveu, preparar páginas antes da aula e trabalhar vocabulário e pronúncia direto no quadro.
- **Problema e evidência:** levantamento feito sobre o código atual (`src/lib/board/*`, `src/components/board/*`, `src/components/live/interactive-whiteboard.tsx`):
  - **Histórico some ao trocar de página:** `switchPage`, `addPage` e `deletePage` zeram as pilhas de desfazer/refazer (`use-whiteboard.ts`). Se o professor volta para a página 1 e apaga algo sem querer, não consegue desfazer.
  - **Traços não podem ser movidos:** a ferramenta "Selecionar" só move/redimensiona texto e imagem (`updateItemPosition` ignora `stroke`). Para reorganizar um desenho, o professor precisa apagar e refazer.
  - **Seleção é de um item por vez:** `selectedItemId` é um único id; não há seleção múltipla, copiar/colar ou duplicar itens.
  - **Não há como "apontar" sem riscar:** ao compartilhar a tela no Meet/Zoom, o professor usa caneta para circular e depois apaga, sujando o histórico.
  - **Páginas são só "anterior/próxima":** não há miniaturas, duplicar ou reordenar páginas (limite atual de 10, `MAX_PAGES`).
  - **Texto sem formatação:** caixa de texto tem `fontSize` fixo em 24 e uma única cor; não dá para destacar a palavra-alvo.
  - **Exportação só da página atual em PNG** (`downloadBoardPageAsPng`).
  - **Fundos genéricos:** só `white`, `grid` e `lines`; nada voltado a aula de idioma (linha do tempo dos tempos verbais, tabela de conjugação, T-chart).
  - Itens já apontados como futuro nas specs anteriores: ponteiro laser e múltiplas páginas (`2026-10-06_lousa-interativa.md`), zoom/pan e superfícies extras (`2026-10-06_redesign-ux-ui-lousa.md`), templates (`2026-10-06_atalho-lousa.md`).
- **Impacto de não fazer:** o professor continua gastando tempo de aula apagando e redesenhando, perde trabalho ao trocar de página e recorre a outras ferramentas (Miro, Jamboard, Google Slides) para preparar material, enfraquecendo a lousa como ferramenta central da aula.
- **Para quem é destinado:** professor de inglês logado, conduzindo aula 1:1 ou em turma (presencial com projetor ou online com compartilhamento de tela). Aluno é beneficiado indiretamente (vê a lousa projetada / PNG no resumo).
- **História de usuário:** Como professor de inglês, quero apontar, reorganizar e reaproveitar o que está no quadro sem apagar e refazer, para manter o ritmo da aula e focar no conteúdo.
- **Como saberemos que deu certo:**
  - Desfazer funciona em qualquer página depois de trocar de página (0 perdas de histórico nos testes e2e).
  - Mover um grupo de traços + texto em no máximo 2 gestos (laço + arrastar).
  - Apontar com o laser sem gerar nenhum item novo na página nem entrada no histórico.
  - Desempenho: arrastar uma seleção de 200 traços mantém ≥ 50 fps em notebook médio.

## Requisitos da Atividade

### Requisitos funcionais

#### Bloco A: Base de edição (P0)

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | **Histórico por página:** cada página mantém sua própria pilha de desfazer/refazer (até `MAX_UNDO_STEPS`); trocar, adicionar ou excluir outra página não apaga o histórico das demais. Alterar o fundo da página também entra no histórico. | P0 | CA01, CA02 |
| RF02 | **Seleção por laço e múltipla:** na ferramenta "Selecionar", arrastar em área vazia desenha um laço (ou retângulo) que seleciona todos os itens (traços, textos, imagens) cujo contorno intersecta a área; `Shift + clique` adiciona/remove itens da seleção. | P0 | CA03 |
| RF03 | **Mover e excluir traços e grupos:** a seleção (um ou vários itens, incluindo traços) pode ser arrastada como bloco e excluída com `Delete`/`Backspace`, gerando **uma** entrada no histórico por gesto. | P0 | CA03, CA04 |
| RF04 | **Copiar, colar e duplicar:** `Ctrl/Cmd + C`, `Ctrl/Cmd + V` e `Ctrl/Cmd + D` copiam, colam (com deslocamento de 20 px) e duplicam a seleção, inclusive entre páginas da mesma lousa. Colar imagem da área de transferência continua funcionando como hoje. | P0 | CA05 |
| RF05 | **Ponteiro laser:** nova ferramenta (atalho `L`) que desenha um rastro vermelho temporário que some em ~1,5 s após o fim do gesto. Não cria item, não entra no histórico, não é salvo nem exportado. | P0 | CA06 |

#### Bloco B: Páginas (P1)

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF06 | **Painel de páginas com miniaturas:** abrir uma faixa com miniaturas de todas as páginas; clicar navega para a página. | P1 | CA07 |
| RF07 | **Duplicar e reordenar páginas:** duplicar a página atual (respeitando `MAX_PAGES`) e reordenar arrastando a miniatura. | P1 | CA07, CA08 |
| RF08 | **Exportar todas as páginas:** além do PNG da página atual, exportar todas as páginas em um único PDF (uma página por folha, superfície clara). | P1 | CA09 |

#### Bloco C: Recursos para aula de inglês (P1)

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF09 | **Formatação de texto:** na caixa de texto selecionada, escolher tamanho (P/M/G/XG), negrito e cor por caixa; o tamanho e a cor podem ser alterados depois de criada. | P1 | CA10 |
| RF10 | **Formas básicas:** linha, seta, retângulo e elipse (atalho `S` alterna), com a cor e espessura ativas; `Shift` mantém proporção/ângulo de 45°. Setas são usadas para ligar palavra ↔ significado e sinalizar transformações gramaticais. | P1 | CA11 |
| RF11 | **Fundos/templates de idioma:** novos fundos selecionáveis por página: "Linha do tempo" (past / present / future), "Tabela de conjugação" (I, you, he/she/it, we, they), "T-chart" (duas colunas) e "Pauta de caligrafia" (4 linhas). São desenhados como fundo (não editáveis/apagáveis) e aparecem no PNG/PDF. | P1 | CA12 |
| RF12 | **Ouvir pronúncia:** com uma caixa de texto selecionada, botão "Listen" lê o texto em inglês (en-US) usando a Web Speech API do navegador. Se o navegador não suportar, o botão fica oculto. | P1 | CA13, CA14 |
| RF13 | **Cortina de revelação:** ferramenta que cobre a página com uma cortina opaca que o professor arrasta para revelar o conteúdo aos poucos (respostas de exercício, vocabulário). Não altera os itens; some ao trocar de página ou ao desligar a ferramenta. | P1 | CA15 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Arrastar uma seleção com até 200 traços mantém ≥ 50 fps (Chrome, notebook médio, sem throttling). | P0 | CA03 |
| RNF02 | Compatibilidade com lousas já salvas no `localStorage` (`fun-english:whiteboard:*`): dados antigos abrem sem erro; novos tipos de item (forma) e novos fundos são aditivos no `BoardItem`/`BoardBackground`. | P0 | CA16 |
| RNF03 | Todas as novas ferramentas acessíveis por teclado, com `aria-label` e tooltip com atalho, seguindo o padrão do dock atual (`board-ui.tsx`); textos da interface em inglês em `strings.ts` (D01 da spec de redesign). | P0 | CA17 |
| RNF04 | O rastro do laser e a cortina não são persistidos nem incluídos no PNG/PDF nem no PNG gerado ao encerrar a sessão. | P0 | CA06, CA15 |
| RNF05 | Funciona com mouse, caneta (pointer events com pressão ignorada) e toque em tablet. | P1 | CA18 |
| RNF06 | PDF de 10 páginas gerado em < 5 s no cliente, sem envio para servidor. | P1 | CA09 |

### Dependências técnicas

- `src/lib/board/use-whiteboard.ts`: estado de seleção passa de `selectedItemId` para `selectedItemIds: string[]`; pilhas de histórico passam a ser indexadas por id da página.
- `src/lib/board/types.ts`: novos tipos `BoardShape` (`line | arrow | rect | ellipse`), novos valores de `BoardBackground`, campos opcionais `bold` em `BoardTextBox`; nova `BoardTool` `laser | shape | reveal`.
- `src/lib/board/hit-test.ts`: interseção de laço/retângulo com traços, textos, imagens e formas.
- `src/lib/board/board-persistence.ts`: renderização de formas e novos fundos em `renderBoardPageToCanvas` (usado por PNG, PDF e resumo da sessão).
- `src/components/board/board-canvas.tsx`, `classroom-board.tsx`, `board-ui.tsx`: novas ferramentas no dock, atalhos de teclado (`L`, `S`, `Ctrl/Cmd + C/V/D`), painel de páginas.
- Biblioteca para PDF no cliente (sugestão: `jspdf`, ver D02).
- Web Speech API (`window.speechSynthesis`), sem dependência nova.

### Recursos necessários

- Revisão do PO sobre prioridades (Dúvidas D01 a D04).
- Referência visual dos templates de idioma (pode ser gerada pelo time de design ou rascunho do PO).
- Tablet ou caneta para validar RNF05.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que desenhei na página 1 e fui para a página 2, quando volto para a página 1 e clico em "Desfazer", então o último traço da página 1 é removido.
- [ ] **CA02:** Dado que mudei o fundo da página para "grid", quando clico em "Desfazer", então o fundo volta ao anterior.
- [ ] **CA03:** Dado que a página tem 3 traços e 1 texto, quando uso "Selecionar" e arrasto um laço sobre todos e depois arrasto a seleção, então os 4 itens se movem juntos e um único "Desfazer" os devolve à posição original.
- [ ] **CA04:** Dado que selecionei 2 traços, quando pressiono `Delete`, então os dois somem e um único "Desfazer" restaura ambos.
- [ ] **CA05:** Dado que selecionei um texto na página 1, quando pressiono `Ctrl/Cmd + C`, vou para a página 2 e pressiono `Ctrl/Cmd + V`, então uma cópia do texto aparece na página 2 e a página 1 não muda.
- [ ] **CA06:** Dado que a ferramenta laser está ativa, quando desenho um rastro, então o rastro aparece e some em ~1,5 s, o botão "Desfazer" não muda de estado, a página não ganha itens e o PNG exportado não contém o rastro.
- [ ] **CA07:** Dado que a lousa tem 3 páginas, quando abro o painel de páginas, então vejo 3 miniaturas e clicar na terceira me leva à página 3.
- [ ] **CA08:** Dado que já existem 10 páginas, quando tento duplicar uma página, então a ação fica desabilitada com tooltip informando o limite, e nenhuma página é criada.
- [ ] **CA09:** Dado que a lousa tem 4 páginas, quando clico em "Export all (PDF)", então baixo um PDF com 4 folhas na ordem das páginas, com superfície clara.
- [ ] **CA10:** Dado que tenho uma caixa de texto selecionada, quando escolho tamanho "XG" e negrito, então o texto é exibido maior e em negrito e a formatação persiste após recarregar a página.
- [ ] **CA11:** Dado que a ferramenta de forma "seta" está ativa, quando arrasto de um ponto a outro, então uma seta é criada com a cor ativa e pode ser selecionada, movida e apagada como os demais itens.
- [ ] **CA12:** Dado que escolho o fundo "Linha do tempo", quando desenho por cima e uso a borracha, então o fundo permanece intacto e aparece no PNG exportado.
- [ ] **CA13:** Dado que selecionei uma caixa com o texto "thought", quando clico em "Listen", então o navegador pronuncia a palavra em inglês.
- [ ] **CA14:** Dado que o navegador não suporta `speechSynthesis`, quando seleciono uma caixa de texto, então o botão "Listen" não é exibido e nenhum erro aparece no console.
- [ ] **CA15:** Dado que a cortina está ativa sobre uma página com respostas, quando arrasto a borda da cortina para baixo, então o conteúdo é revelado progressivamente, e ao desligar a ferramenta nenhum item foi alterado.
- [ ] **CA16:** Dado que existe uma lousa salva antes desta entrega no `localStorage`, quando abro `/lousa`, então todas as páginas e itens antigos aparecem sem erro.
- [ ] **CA17:** Dado que navego só com teclado, quando pressiono `Tab` pelo dock, então todas as novas ferramentas recebem foco visível e têm nome acessível em inglês.
- [ ] **CA18:** Dado que uso um tablet com toque, quando faço um laço com o dedo na ferramenta "Selecionar", então os itens são selecionados e a página não rola.
- [ ] **CA19 (negativo):** Dado que estou na sala ao vivo (`interactive-whiteboard.tsx`), quando abro a lousa, então nenhuma das novas ferramentas aparece ali e a sincronização com os alunos continua funcionando como hoje.

## O que a atividade não inclui

- Unificar o motor da lousa local com a lousa ao vivo (Konva + RTDB): motivo: complexo demais agora; já listado como P2 na spec de redesign.
- Colaboração/co-autoria de alunos na lousa: motivo: outra iniciativa (depende da unificação acima).
- Salvar lousas na nuvem / biblioteca de lousas do professor: motivo: exige modelo de dados e regras no Firestore; outra iniciativa.
- Reconhecimento de escrita à mão (OCR): motivo: complexo demais agora.
- Zoom e pan (canvas infinito): motivo: muda o sistema de coordenadas de todos os itens; melhor tratado isoladamente (P2).
- Gravação e playback dos traços: motivo: prematuro.

### Considerado para o futuro (P2)

- Zoom/pan com a página 16:9 como "quadro de exportação" (o novo modelo de seleção deve operar em coordenadas da página, não da tela).
- Templates salvos pelo professor e biblioteca na nuvem (o formato de página deve continuar serializável como JSON simples).
- Inserir cartões de vocabulário/imagens das atividades do catálogo direto na lousa.
- Levar laser, formas e seleção para a lousa ao vivo após a unificação dos motores.
- Superfícies "quadro verde" e "lousa preta".

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Entregar tudo em um PR ou dividir em 3 entregas (Bloco A, B, C)? Sugestão: 3 PRs, começando pelo Bloco A. | PO | Sim | 3 PRs, começando pelo Bloco A (2026-10-07). |
| D02 | Aceitamos adicionar `jspdf` (~100 KB gz, carregado sob demanda) para o PDF, ou preferimos gerar várias PNGs em um `.zip`? | Dev/PO | Não | `jspdf` carregado sob demanda (2026-10-07). |
| D03 | A seleção livre deve ser laço (forma livre) ou retângulo? Sugestão: retângulo no MVP, laço como P2. | Design | Não | Retângulo no MVP; laço livre como P2 (2026-10-07). |
| D04 | Quais templates de idioma são prioritários além dos 4 propostos (ex.: "Wh- questions", "Venn")? | PO | Não | |
| D05 | A voz do "Listen" deve ser en-US fixa ou permitir en-GB? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Histórico por página | unit (`use-whiteboard`) | CA01 | Adicionar traço na pág. 1, `addPage`, `switchPage(0)`, `undo` | Pág. 1 sem o traço; pág. 2 intacta |
| CT02 | Fundo entra no histórico | unit | CA02 | `setBackground("grid")`, `undo` | Fundo volta a `white` |
| CT03 | Interseção de retângulo/laço | unit (`hit-test`) | CA03 | Itens dentro, fora e cruzando a borda | Só itens que intersectam são retornados |
| CT04 | Mover grupo com um histórico | e2e (Playwright) | CA03 | Desenhar 3 traços + texto, selecionar, arrastar, desfazer | Posições restauradas com um único desfazer |
| CT05 | Excluir seleção múltipla | unit | CA04 | Selecionar 2 ids, excluir, desfazer | Ambos restaurados |
| CT06 | Copiar/colar entre páginas | e2e | CA05 | Copiar texto pág. 1, colar pág. 2 | Cópia com novo id na pág. 2 |
| CT07 | Laser não persiste | e2e | CA06 | Ativar laser, desenhar, aguardar 2 s, exportar PNG | `canUndo` inalterado; nenhum item novo; PNG sem rastro |
| CT08 | Miniaturas e navegação | e2e | CA07 | Criar 3 páginas, abrir painel, clicar na 3ª | Página 3 ativa |
| CT09 | Limite de páginas ao duplicar | unit | CA08 | 10 páginas, chamar `duplicatePage` | Continua com 10; botão desabilitado |
| CT10 | Exportar PDF | manual | CA09 | 4 páginas, exportar | PDF com 4 folhas em ordem |
| CT11 | Formatação de texto persiste | e2e | CA10 | Formatar, recarregar | Formatação mantida |
| CT12 | Criar e apagar seta | e2e | CA11 | Ferramenta seta, arrastar, selecionar, `Delete` | Seta criada e removida |
| CT13 | Fundo de idioma não é apagado | e2e | CA12 | Fundo "Linha do tempo", borracha por cima, exportar | Fundo intacto no canvas e no PNG |
| CT14 | Listen com suporte | manual | CA13 | Selecionar "thought", clicar Listen | Áudio em inglês |
| CT15 | Listen sem suporte | unit | CA14 | Mock sem `speechSynthesis` | Botão oculto; sem erro |
| CT16 | Cortina revela sem alterar | manual | CA15 | Ativar, arrastar, desativar | Itens idênticos ao estado anterior |
| CT17 | Compatibilidade com dados antigos | unit (`board-persistence`) | CA16 | Carregar JSON salvo no formato anterior | Carrega sem erro, mesmos itens |
| CT18 | Acessibilidade do dock | manual / a11y | CA17 | Navegar com `Tab`, verificar nomes | Foco visível e `aria-label` em todas |
| CT19 | Laço por toque | manual (tablet) | CA18 | Laço com o dedo | Seleção feita, sem rolagem |
| CT20 | Lousa ao vivo inalterada | e2e | CA19 | Abrir sala ao vivo, desenhar | Sem ferramentas novas; sincronização ok |

## URL Complementar

- Documentação técnica: [`src/lib/board/use-whiteboard.ts`](../src/lib/board/use-whiteboard.ts), [`src/lib/board/types.ts`](../src/lib/board/types.ts), [`src/components/board/classroom-board.tsx`](../src/components/board/classroom-board.tsx)
- Protótipo / mockup: N/A (a definir após revisão do PO)
- Discussões relacionadas: specs anteriores da lousa em `SDD/DONE/`: `2026-10-03_07-lousa-virtual.md`, `2026-10-06_lousa-interativa.md`, `2026-10-06_redesign-ux-ui-lousa.md`, `2026-10-06_atalho-lousa.md`
- Referências de design: Excalidraw (seleção e formas), tldraw (laser), Miro (painel de páginas), Explain Everything (cortina de revelação)
- Requisitos originais: pedido do PO em 2026-10-07 ("sugerir melhoria na lousa pensando nas features da lousa")
- Issue / PR relacionado: a preencher com o PR desta spec
