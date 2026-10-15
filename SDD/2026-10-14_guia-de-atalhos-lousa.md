# [FEAT] Guia e modal de atalhos da lousa na aplicação

> **Status:** Em andamento
> **Autor:** AI · **Revisor:** Natanael Brentano · **Criada em:** 2026-10-14 · **Atualizada em:** 2026-10-14

## Detalhes da Atividade

- **O que precisa ser feito:** pontuar e exibir o guia de atalhos e ferramentas diretamente na aplicação da lousa (`/lousa` e aba Board de sessão), para que os professores consigam aprender, descobrir e consultar facilmente os comandos enquanto preparam ou ministram suas aulas:
  1. **Acesso visual via botão de ajuda (<kbd>?</kbd>):** adicionar um botão de ajuda na barra de ferramentas / cabeçalho da lousa e como opção ("Atalhos do teclado / Keyboard shortcuts") no menu de opções `···` (*More*).
  2. **Atalho de teclado <kbd>?</kbd> (<kbd>Shift</kbd> + <kbd>/</kbd>):** abrir e fechar o guia de atalhos ao pressionar a tecla de interrogação no teclado a qualquer momento (fora da edição de texto).
  3. **Modal / Painel de Atalhos completo:** janela com design limpo, responsivo e categorizado por abas/seções:
     - **Texto e Letra:** atalhos para aumentar/diminuir fonte (<kbd>⌘⇧&gt;</kbd> / <kbd>⌘⇧&lt;</kbd> ou <kbd>Ctrl+Shift+&gt;</kbd> / <kbd>&lt;</kbd>), negrito (<kbd>⌘B</kbd> / <kbd>Ctrl+B</kbd>), tamanhos S/M/L/XL e paleta de cores.
     - **Ferramentas:** seleção (<kbd>V</kbd>), caneta (<kbd>P</kbd>), marca-texto (<kbd>H</kbd>), borracha (<kbd>E</kbd>), alternar traço inteiro / área (<kbd>⇧E</kbd>), texto (<kbd>T</kbd>) e laser (<kbd>L</kbd>).
     - **Cores e Traço:** números <kbd>1</kbd> a <kbd>6</kbd> para cores, <kbd>[</kbd> e <kbd>]</kbd> para espessura do traço.
     - **Geral e Histórico:** desfazer (<kbd>⌘Z</kbd>), refazer (<kbd>⌘⇧Z</kbd> / <kbd>⌘Y</kbd>), copiar/colar (<kbd>⌘C</kbd> / <kbd>⌘V</kbd>), duplicar (<kbd>⌘D</kbd>), apagar (<kbd>Del</kbd> / <kbd>Backspace</kbd>).
  4. **Dica contextual atualizada:** atualizar o texto de atalhos da tela vazia da lousa (`s.emptyShortcuts`) para incluir o atalho <kbd>?</kbd> de ajuda.
- **Problema e evidência:**
  - A lousa possui atalhos muito úteis (aumentar/diminuir fonte, negrito, alternar borracha de traço com <kbd>⇧E</kbd>, espessura com colchetes, cores com 1-6), mas os professores não sabem que esses comandos existem porque não há um ponto de consulta dentro da interface.
  - A única dica na lousa vazia cita apenas `P pen · T text · E eraser · Ctrl+V paste`, sem menção aos comandos de texto, borracha de objeto ou demais atalhos.
- **Impacto de não fazer:** os professores continuam sem conhecer recursos produtivos que poupam tempo em sala de aula, precisando perguntar ao suporte ou perdendo agilidade com cliques repetidos.
- **Para quem é destinado:** professores de inglês conduzindo aulas ou preparando o quadro interativo.
- **História de usuário:** Como professor de inglês usando a lousa, quero poder consultar rapidamente os atalhos de teclado e recursos na própria tela, para aprender e memorizar os comandos sem interromper o fluxo da minha aula.
- **Como saberemos que deu certo:**
  - O guia pode ser aberto com **1 clique** (no botão de ajuda `?` ou no menu `···`) ou com **1 toque no teclado** (<kbd>?</kbd>).
  - O modal exibe claramente a tecla adaptada à plataforma do usuário (Mac vs Windows: `⌘` vs `Ctrl`).
  - É possível fechar o modal pressionando <kbd>Esc</kbd>, clicando no `X` ou clicando fora do modal.
  - 0 erros de regressão no console e em testes existentes.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Adicionar botão de atalhos/ajuda (<kbd>?</kbd>) na interface da lousa e item no menu `···` (*More*). | P0 | CA01, CA02 |
| RF02 | Suportar abertura e fechamento do guia pelo atalho <kbd>?</kbd> (Shift + `/`), exceto quando focado em campo de texto. | P0 | CA03 |
| RF03 | Modal de atalhos categorizado (Texto, Ferramentas, Traço/Cores, Navegação/Histórico) com tags de teclas estilizadas (<kbd>kbd</kbd>). | P0 | CA04, CA05 |
| RF04 | Detecção do sistema operacional para mostrar <kbd>⌘</kbd> no macOS ou <kbd>Ctrl</kbd> no Windows/Linux. | P1 | CA06 |
| RF05 | Fechamento acessível via tecla <kbd>Esc</kbd>, botão de fechar e clique no backdrop. | P0 | CA07 |
| RF06 | Atualizar mensagem da lousa vazia (`s.emptyShortcuts`) informando o atalho de ajuda <kbd>?</kbd>. | P1 | CA08 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | O modal deve ser responsivo e legível tanto em telas grandes quanto em tablets/laptops pequenos. | P0 | CA04 |
| RNF02 | O modal não deve perder estado nem causar rerenderizações pesadas do canvas da lousa ao abrir/fechar. | P0 | CA05 |
| RNF03 | Seguir os padrões visuais existentes da lousa (tokens de cores, tipografia, cantos arredondados, backdrop blur). | P0 | CA04 |
| RNF04 | Internacionalização: todas as strings devem residir em `src/lib/strings.ts`. | P0 | CA01, CA04 |

## Critérios de Aceitação / Entregas

- **CA01:** Dado que a lousa está aberta, quando o professor visualiza a barra superior / menu de opções, então há um botão ou opção para acessar os atalhos do teclado.
- **CA02:** Dado que o menu `···` (*More*) está aberto, quando o professor clica na opção de atalhos de teclado, então o modal de atalhos é aberto e o menu suspenso é fechado.
- **CA03:** Dado que o foco não está em uma caixa de texto ativa, quando o professor pressiona a tecla <kbd>?</kbd>, então o modal de atalhos se abre (ou se fecha se já estiver aberto).
- **CA04:** Dado que o modal de atalhos está aberto, quando o professor lê as seções, então constam claramente as instruções de aumentar/diminuir fonte (<kbd>A+</kbd>/<kbd>A−</kbd>), negrito (<kbd>B</kbd>), tamanhos S/M/L/XL, alternância da borracha (<kbd>⇧E</kbd>), espessura do traço e demais ferramentas.
- **CA05:** Dado que o modal de atalhos está aberto, quando o professor pressiona <kbd>Esc</kbd> ou clica fora, então o modal fecha sem interferir nos desenhos ou textos da lousa.
- **CA06:** Dado que o usuário está no Mac, então os atalhos são exibidos com o símbolo <kbd>⌘</kbd>; no Windows/Linux com <kbd>Ctrl</kbd>.
- **CA07:** Dado que a lousa está vazia, o texto informativo no centro do quadro indica o atalho <kbd>?</kbd> para ver a lista de atalhos.

## O que a atividade não inclui

- Criação de tutorial guiado passo a passo interativo (tour guiado ou onboarding tipo intro.js).
- Configuração personalizada de atalhos pelo usuário (remapeamento de teclas).

## Sugestões de casos de teste

- **CT01:** Renderizar a lousa e verificar que o botão de ajuda / atalhos está presente no cabeçalho ou menu.
- **CT02:** Clicar no botão e verificar que o diálogo de atalhos abre com todas as seções (Texto, Ferramentas, Cores, etc.).
- **CT03:** Pressionar a tecla <kbd>?</kbd> e verificar que o modal abre; pressionar <kbd>Esc</kbd> e verificar que fecha.
- **CT04:** Digitar texto em uma caixa de texto da lousa e pressionar <kbd>?</kbd>; garantir que a interrogação é digitada no texto e o modal NÃO abre.
- **CT05:** Verificar que os atalhos mostram `⌘` no Mac e `Ctrl` nos demais sistemas.

## URL Complementar

- N/A
