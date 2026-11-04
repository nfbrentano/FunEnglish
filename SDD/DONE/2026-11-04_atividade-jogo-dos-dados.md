# [FEAT] Novo tipo de atividade: Jogo dos Dados 6x6 (Roll The Dice)

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-11-04 · **Atualizada em:** 2026-11-04
> **Referência original:** [Genially - A1-A2 My Life Everyday Verbs Roll The Dice](https://view.genially.com/684b2ec90b70e09e4a69b29f)

## Detalhes da Atividade

- **O que precisa ser feito:** Implementar um novo tipo de atividade interativa no catálogo (`roll-dice` / Jogo dos Dados) e publicar a atividade inicial de conversação "Everyday Verbs: Roll The Dice" (nível A1–A2) baseada no jogo de referência da Genially. O jogo consiste em um tabuleiro matricial 6×6 com 36 perguntas de conversação/rotina e 2 dados virtuais interativos (Dado 1 para a linha e Dado 2 para a coluna). Ao rolar os dados (ou tocar no tabuleiro), o sistema sorteia os valores, anima a rolagem dos dados com efeito sonoro realista, destaca visualmente a célula sorteada e abre a pergunta em um modal ampliado com suporte a leitura em voz alta (TTS) e cronômetro de fala opcional.
- **Problema e evidência:** Atualmente, as atividades da categoria Speaking contam principalmente com flashcards e cartões de discussão (`prompt-cards`), que possuem dinâmica linear ou sequencial simples. Não há uma dinâmica de jogo de tabuleiro em grade com aleatoriedade por dados, muito valorizada por professores em aulas dinâmicas em duplas ou grupos. O jogo de referência da Genially (`https://view.genially.com/684b2ec90b70e09e4a69b29f`) é amplamente utilizado por professores para engajar alunos dos níveis A1 e A2 no uso de verbos do dia a dia, mas rodar via iframe ou fora da plataforma Fun English impede o controle de progresso, a integração com o cronômetro, a sala ao vivo e o tema visual consistente.
- **Impacto de não fazer:** Professores precisam recorrer a ferramentas externas (Genially) para dinâmicas de tabuleiro com dados, saindo do ecossistema do Fun English; a categoria Speaking/Fun perde um formato lúdico com alto poder de engajamento em sala de aula.
- **Para quem é destinado:** Professores conduzindo aulas presenciais ou online (projetando em tela cheia na lousa/projetor ou na sala ao vivo) e alunos jogando em duplas ou praticando de forma autônoma.
- **História de usuário:** Como professor de inglês, quero projetar um jogo de tabuleiro com dois dados interativos e 36 perguntas em grade, para que meus alunos joguem em duplas ou em equipes, rolando os dados e praticando conversação de forma espontânea e divertida.
- **Como saberemos que deu certo:** O plugin `roll-dice` registrado no motor de atividades; a atividade "Everyday Verbs: Roll The Dice" com as 36 perguntas jogável com 0 erros de console no desktop e mobile; animação e som de rolagem fluidos; modal com pergunta ampliada legível a mais de 3 metros de distância.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | **Esquema de dados (`rollDiceContentSchema`):** Registrar o tipo `roll-dice` com schema contendo `instructions` (string com orientações), `grid` (matriz 6×6 ou lista de 36 itens com `row`: 1..6, `col`: 1..6, `question`: texto não vazio, `hint?`: texto opcional de vocabulário/apoio) e `options?` (ex.: `timerSeconds?`, `allowManualSelect?: boolean`). | P0 | CA01, CA09 |
| RF02 | **Dados interativos (Rolagem e Aleatoriedade):** Interface com 2 dados (Dado 1 = Linha, Dado 2 = Coluna) com faces 1 a 6. Botão de ação "Roll Dice" (Rolar Dados) e clique nos próprios dados para disparar a rolagem simultânea com animação e efeito sonoro. | P0 | CA02 |
| RF03 | **Destaque e Seleção da Célula:** Ao parar os dados nos valores $(R, C)$, a grade destaca a linha $R$, a coluna $C$ e a célula de interseção correspondente com efeito visual claro. | P0 | CA02, CA03 |
| RF04 | **Modal / Card Ampliado da Pergunta:** Abertura da pergunta selecionada em destaque/modal com tipografia grande (≥ 28px no desktop), facilitando leitura em projetores e dispositivos móveis, com botão de fechar (Esc ou clique fora) para voltar ao tabuleiro. | P0 | CA03 |
| RF05 | **Seleção Manual de Célula:** Permitir que o professor ou aluno clique diretamente em qualquer uma das 36 células do tabuleiro para abri-la sem necessidade de rolar os dados. | P0 | CA04 |
| RF06 | **Controle de Células Utilizadas (Histórico da Rodada):** Manter registro das células que já foram sorteadas/visitadas na partida, marcando-as visualmente (ex.: ícone de check e leve esmaecimento) com opção de "Reset Board" (Reiniciar Tabuleiro) na barra de ferramentas. | P1 | CA05 |
| RF07 | **Cronômetro de Fala Opcional:** Integração de timer de fala (off, 30s, 60s, 90s, 120s) na visualização da pergunta para limitar o tempo de resposta do aluno. | P1 | CA06 |
| RF08 | **Pronúncia em Áudio (TTS):** Botão de áudio para ler a pergunta em voz alta utilizando Web Speech API / TTS da plataforma. | P1 | CA07 |
| RF09 | **Conteúdo Inicial (Everyday Verbs):** Criar e validar no seed o arquivo de atividade `everyday-verbs-roll-the-dice.json` com as 36 perguntas fiéis ao jogo de referência da Genially (A1–A2, categoria `speaking`). | P0 | CA01, CA08 |
| RF10 | **Suporte a Modo Apresentação e Tela Cheia:** Compatibilidade com o shell do player existente, suporte ao modo fullscreen e layout sem rolagem vertical excessiva em resoluções 1080p e 720p. | P0 | CA08 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | **Arquitetura modular:** Registrar novo plugin em `src/components/player/plugins/roll-dice/`, schemas em `src/lib/activities/schema/content.ts` e `activity.ts`, e entrada code-split em `src/lib/player/registry.ts`. | P0 | CA01 |
| RNF02 | **Acessibilidade (a11y):** Operável 100% por teclado (tecla Space/Enter rola dados, setas navegam na grade, Esc fecha modal) com atributos `aria-live` anunciando o resultado dos dados sorteados. | P0 | CA10 |
| RNF03 | **Desempenho e Áudio:** O áudio da rolagem dos dados deve ser sintetizado via Web Audio API ou arquivo leve otimizado (< 30 KB), sem atraso perceptível (< 100 ms) ao clicar em rolar. | P0 | CA02 |
| RNF04 | **Responsividade:** Em telas desktop (> 1024px), o tabuleiro e os dados ficam lado a lado (estilo similar ao Genially); em telas menores (< 768px), os dados ficam fixos no topo/rodapé com a grade com rolagem horizontal/vertical suave e toque ≥ 44px. | P0 | CA11 |
| RNF05 | **Validação de Schema estrita:** Rejeitar no build e no seed JSONs que não possuam exatamente 36 perguntas (matriz 6×6 completa) ou que contenham perguntas vazias. | P0 | CA09 |

### Dependências técnicas

- **Motor de atividades:** `src/lib/player/registry.ts`, `src/lib/player/types.ts` e `src/components/player/activity-player.tsx`.
- **Esquemas Zod:** `src/lib/activities/schema/activity.ts` e `src/lib/activities/schema/content.ts`.
- **Sistema de áudio e TTS:** suporte existente em `src/components/player/` e Web Speech API.
- **Validação de Seed:** `src/lib/activities/validate.ts` e script `npm run seed:check`.

### Recursos necessários

- Efeito sonoro de dados rolando (áudio royalty-free ou gerador procedural Web Audio).
- Ícones das faces dos dados (1 a 6 pontos em SVG ou estilo pixel/vetor limpo).
- Banco inicial das 36 perguntas transcritas da referência Genially:
  - **Linha 1:**
    - (1,1): *"What do you always forget to buy at the shop?"*
    - (1,2): *"What food do you eat when you're sad?"*
    - (1,3): *"Name 3 things people like to watch, but you don’t."*
    - (1,4): *"Do you listen to music while you study or work?"*
    - (1,5): *"What do you like more: listening or talking?"*
    - (1,6): *"Do you need music to be happy?"*
  - **Linha 2:**
    - (2,1): *"What time do you usually get up on Sundays?"*
    - (2,2): *"Do you like buying things online or in a shop? Why?"*
    - (2,3): *"Mention 3 things people eat that you think are strange."*
    - (2,4): *"What do you listen to when you're cleaning?"*
    - (2,5): *"Mention 3 things you do every day, even if you don’t want to."*
    - (2,6): *"Do you sleep better in winter or summer?"*
  - **Linha 3:**
    - (3,1): *"What do you like to listen to on a long trip?"*
    - (3,2): *"Do you wake up with an alarm or by yourself?"*
    - (3,3): *"Mention 3 things you can buy with £1."*
    - (3,4): *"Do you like drinking tea or coffee more? Why?"*
    - (3,5): *"Do you like watching films with friends or alone?"*
    - (3,6): *"Mention 3 people you talk to every week."*
  - **Linha 4:**
    - (4,1): *"Name 3 ways to help someone at school/work."*
    - (4,2): *"Do you like talking on the phone? Why or why not?"*
    - (4,3): *"Do you get up early on holidays? Why or why not?"*
    - (4,4): *"What do you usually buy for your friends?"*
    - (4,5): *"What food do you eat too much of?"*
    - (4,6): *"What do you love to watch again and again?"*
  - **Linha 5:**
    - (5,1): *"Name 3 things you need to sleep well."*
    - (5,2): *"What do you want to do, but never have time for?"*
    - (5,3): *"What do you usually watch before going to bed?"*
    - (5,4): *"What do you usually drink when you're very tired?"*
    - (5,5): *"What do people often buy but don’t really need?"*
    - (5,6): *"What do you drink when you're happy?"*
  - **Linha 6:**
    - (6,1): *"What do you want to learn this year?"*
    - (6,2): *"What do you do when you can’t sleep?"*
    - (6,3): *"Do you talk to yourself? When?"*
    - (6,4): *"Mention 3 sounds you like listening to."*
    - (6,5): *"Name 3 things you never want to eat again."*
    - (6,6): *"What do you always need in your fridge?"*

---

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado um arquivo JSON de atividade com `type: "roll-dice"` e uma grade de 36 perguntas válidas, quando rodo `npm run seed:check`, então a validação passa com sucesso sem erros de schema.
- [x] **CA02:** Dado que abro a atividade no player, quando clico no botão "Roll Dice" (ou clico em um dos dados), então vejo a animação dos dois dados girando, escuto o efeito sonoro de rolagem e os dados param exibindo dois números entre 1 e 6.
- [x] **CA03:** Dado que os dados pararam em `Linha 3` e `Coluna 4`, quando a animação encerra, então a célula $(3,4)$ no tabuleiro é destacada e o modal abre exibindo o texto *"Do you like drinking tea or coffee more? Why?"* em fonte grande legível.
- [x] **CA04:** Dado o tabuleiro exibido na tela, quando o usuário clica manualmente na célula $(1,2)$, então o modal abre diretamente com a pergunta *"What food do you eat when you're sad?"*, sem necessidade de rolar os dados.
- [x] **CA05:** Dado que a pergunta $(3,4)$ foi sorteada e fechada, quando retorno ao tabuleiro, então a célula $(3,4)$ exibe um indicador visual de "visitada" (ex.: badge ou cor esmaecida) e o contador do jogo indica o total de perguntas visitadas (ex.: "1 / 36 answered").
- [x] **CA06:** Dado que o cronômetro de fala está configurado para 60 segundos, quando o modal da pergunta se abre e o timer é iniciado, então a contagem regressiva é exibida em destaque e emite um alerta visual/sonoro discreto ao término do tempo.
- [x] **CA07:** Dado o modal da pergunta aberto, quando clico no botão de áudio/pronúncia, então o texto da pergunta em inglês é reproduzido via sintetizador de voz (TTS).
- [x] **CA08:** Dado um projetor ou monitor widescreen 1080p em modo tela cheia, quando a atividade é carregada, então o painel dos dados (à esquerda) e a grade 6×6 (à direita) cabem completamente na viewport sem necessitar de rolagem de página vertical.
- [x] **CA09 (negativo):** Dado um arquivo JSON de `roll-dice` que contenha apenas 35 perguntas (ou pergunta com texto em branco), quando o seed ou validador Zod executa, então a atividade é rejeitada com mensagem de erro clara indicando a ausência da grade completa 6×6.
- [x] **CA10 (acessibilidade):** Dado o uso exclusivo de teclado, quando pressiono a tecla `Space` ou `Enter` com foco no botão de rolagem, os dados rolam; quando pressiono `Esc` com o modal aberto, o modal fecha e o foco retorna à grade.
- [x] **CA11 (responsividade mobile):** Dado um dispositivo móvel com largura de tela de 375px, quando a atividade é aberta, então o layout se adapta adequadamente com área de toque mínima de 44px e os textos permanecem legíveis.

---

## O que a atividade não inclui

- **Avaliação automática por voz da resposta do aluno (IA):** motivo: atividade de conversação livre / speaking em sala de aula; avaliação aberta sem gabarito pré-definido.
- **Modo multijogador competitivo com pontuação automática sincronizada em tempo real (WebSockets):** motivo: complexidade de rede excessiva para o escopo inicial; em sala o professor gerencia a dinâmica ou utiliza a Sala ao Vivo com controle pelo professor.
- **Grades arbitrárias diferentes de 6×6 (ex.: 4×4 ou 8×8):** motivo: a mecânica de 2 dados de 6 faces determina naturalmente uma grade cúbica exata de 6×6 (36 posições).

### Considerado para o futuro (P2)

- Modo de equipes com placar de pontos integrado (similar ao Quiz Board) para anotar quem respondeu cada pergunta.
- Suporte a dados especiais com outras categorias (ex.: 1 dado para Sujeito e 1 dado para Tempo Verbal).
- Geração automática de novos tabuleiros 6×6 temáticos via IA no painel administrativo a partir de um prompt (ex.: "Business English Meetings").

---

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O tabuleiro deve marcar células repetidas caso os dados caiam no mesmo número novamente? | PO / Design | Não | Sim, permite responder novamente ou exibir botão opcional "Re-roll" se a célula já foi utilizada. |
| D02 | O áudio da rolagem dos dados deve ter opção de mute? | Dev / Design | Não | Sim, respeita o controle global de som do player e possui botão de mudo rápido. |
| D03 | A atividade deve ser categorizada como `speaking` ou `fun`? | PO | Não | Sugestão: Categoria principal `speaking` com tag `fun` e `board-game`. |

---

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Validação do Schema Zod | Unit | CA01, CA09 | Validar payload com 36 perguntas vs payload com 35 perguntas | Sucesso no válido, erro no inválido com 35 |
| CT02 | Rolagem dos Dados e Intervalo | Unit / Integração | CA02 | Disparar 100 rolagens automáticas em teste | Todos os valores de $(R, C)$ situam-se estritamente entre 1 e 6 |
| CT03 | Sincronia de Destaque da Célula | E2E | CA03 | Clicar em rolar, esperar final da animação | Célula com `data-row=R` e `data-col=C` recebe classe ativa |
| CT04 | Abertura Manual de Pergunta | E2E | CA04 | Clicar diretamente na célula $(1,2)$ na grade | Modal abre com a pergunta esperada |
| CT05 | Estado de Célula Visitada | Integração | CA05 | Abrir pergunta e fechar modal | Célula ganha estado `visited` e contador incrementa |
| CT06 | Cronômetro de Fala | E2E | CA06 | Ativar timer de 30s no modal e aguardar término | Alerta visual de tempo esgotado é disparado |
| CT07 | Text-to-Speech (TTS) | Manual / E2E | CA07 | Clicar no ícone de volume do modal | Áudio com a pronúncia em inglês da pergunta é emitido |
| CT08 | Responsividade e Tela Cheia | Manual | CA08, CA11 | Testar em 1920×1080 e 375×667 | Interface utilizável sem cortes ou quebra de layout |
| CT09 | Navegação por Teclado | A11y / Manual | CA10 | Rolar dados com `Space`, fechar modal com `Esc` | Ações executadas com sucesso sem uso de mouse |

---

## URL Complementar

- Documentação técnica: `SDD/DONE/2026-09-30_motor-de-atividades.md`, `src/lib/activities/schema/activity.ts`, `src/lib/player/registry.ts`
- Protótipo / mockup: N/A
- Discussões relacionadas: Expansão de formatos de conversação do catálogo (Speaking & Fun)
- Referências de design: Jogo original da Genially: https://view.genially.com/684b2ec90b70e09e4a69b29f
- Requisitos originais: Solicitação do usuário para implementar o jogo Genially "A1-A2 My Life Everyday Verbs Roll The Dice" no site Fun English
- Issue / PR relacionado: N/A
