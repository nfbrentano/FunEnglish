# [FEAT] Motor de atividades (player base e arquitetura de plugins)

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Criar a página `/play/[slug]` e o "shell" comum a todos os tipos de atividade: tela de introdução (título, categoria, nível, instruções, botão "Start"), área de jogo onde é carregado o componente do tipo (quiz, flashcards etc.), barra de progresso, placar, tela final ("Results") com "Play again", modo tela cheia, modo apresentação (projetor) e student mode. Os tipos são plugins registrados em um registro central.
- **Problema e evidência:** As atividades do site de referência são jogos e exercícios interativos variados (Jeopardy, quizzes, lacunas, flashcards, cartões com imagem). Sem um shell comum, cada tipo reimplementaria progresso, pontuação, tela cheia e resultado.
- **Impacto de não fazer:** Nenhuma atividade pode ser jogada; os tipos ficam inconsistentes entre si.
- **Para quem é destinado:** Professor (projetando em sala) e aluno (no próprio dispositivo).
- **História de usuário:** Como professor, quero abrir uma atividade e projetá-la em tela cheia com controles grandes e claros, para conduzir a aula com a turma.
- **Como saberemos que deu certo:** Adicionar um novo tipo de atividade exige apenas 1 componente + 1 esquema + 1 registro, sem alterar o shell; player interativo em < 2 s em 4G.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Rota `/play/[slug]` que carrega a atividade publicada, valida o `content` com o esquema do tipo e renderiza o plugin correspondente | P0 | CA01, CA07 |
| RF02 | Registro de plugins: `{ type, schema, Component, supportsScoring, supportsTeams, label }` | P0 | CA02 |
| RF03 | Contrato do plugin: recebe `content`, `settings` e callbacks `onProgress(current,total)`, `onScore(delta)`, `onComplete(result)` | P0 | CA02 |
| RF04 | Tela de intro com título, categoria, nível, instruções (do conteúdo ou padrão do tipo) e botão "Start" | P0 | CA01 |
| RF05 | Barra superior do player: progresso "3 / 10", placar (se o tipo pontua), botões Restart, Fullscreen, Favorite, Share e Exit | P0 | CA03 |
| RF06 | Tela final "Results" com pontuação/acertos, tempo total e botões "Play again" e "Back to activities" | P0 | CA04 |
| RF07 | Modo tela cheia (Fullscreen API) e fontes/controles ampliados em modo apresentação (≥ 1280 px ou tela cheia) | P0 | CA05 |
| RF08 | Configurações pré-jogo opcionais por tipo: embaralhar itens, número de equipes (1–6), timer por pergunta (off/10/20/30/60 s) | P1 | CA06 |
| RF09 | Suporte a `?mode=student` (ver spec Compartilhar) | P0 | |
| RF10 | Registro em "Recently played" para usuários logados ao clicar em Start (fora do student mode) | P1 | | _(implementado junto com a spec do Dashboard)_
| RF11 | Atalhos de teclado comuns: Espaço/Enter = próximo, ←/→ = navegar, F = fullscreen, Esc = sair de fullscreen | P1 | CA08 |
| RF12 | Utilitário de áudio via Web Speech API (`speak(text, lang='en-US')`) disponível aos plugins para pronúncia | P1 | CA09 |
| RF13 | Embed do YouTube (componente `YouTubeClip` com `videoId`, `start`, `end`, via IFrame Player API e `youtube-nocookie.com`) disponível aos plugins | P1 | CA10 |
| RF15 | Páginas `/play/[slug]` geradas no build para as atividades publicadas. Atividades publicadas depois do último build abrem por um **shell do player**: uma regra de rewrite do Firebase Hosting envia `/play/**` sem arquivo correspondente para esse shell, que lê o slug da URL e busca a atividade no Firestore | P0 | CA13 |
| RF14 | Fallback do `YouTubeClip`: se o vídeo não permitir embed ou estiver indisponível (erros 100/101/150 da API), exibir "This clip can't be played here" com link "Watch on YouTube" (abrindo no minuto certo), sem quebrar a atividade | P1 | CA12 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Cada plugin carregado sob demanda (code splitting por tipo) | P0 | |
| RNF02 | Player utilizável de 360 px (celular do aluno) a 1920 px (projetor) | P0 | CA05 |
| RNF03 | Alvos de toque ≥ 44×44 px; texto de conteúdo ≥ 24 px em modo apresentação | P0 | CA05 |
| RNF04 | Estado da partida em memória; recarregar a página reinicia a atividade (sem persistência) | P0 | |
| RNF05 | Conteúdo inválido nunca quebra a página inteira: error boundary por plugin | P0 | CA07 |

### Dependências técnicas

- [FEAT] Modelo de dados de atividades (esquemas por tipo).
- [UI] Layout base.
- Plugins: specs de Quiz, Flashcards, Completar lacunas, Jeopardy e Cartões de conversa.

### Recursos necessários

- Mockups do shell (intro, jogo, resultado) em desktop/projetor e mobile.
- Sons curtos de acerto/erro (licença livre), opcionais.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado uma atividade publicada do tipo quiz, quando acesso `/play/[slug]`, então vejo a intro com título, categoria, nível e instruções; e ao clicar "Start" o quiz começa.
- [x] **CA02:** Dado um plugin de exemplo registrado (`type: "demo"`), quando crio uma atividade desse tipo, então ela roda no shell sem nenhuma alteração no código do shell.
- [x] **CA03:** Dado uma atividade de 10 itens em andamento, quando avanço para o 3º, então a barra mostra "3 / 10" e o placar atualizado.
- [x] **CA04:** Dado que concluo a atividade, quando o plugin chama `onComplete`, então vejo a tela Results com acertos, tempo e os botões "Play again" e "Back to activities"; "Play again" reinicia do zero.
- [x] **CA05:** Dado que clico "Fullscreen", quando a tela cheia ativa, então o player ocupa a tela toda com fontes ampliadas; Esc sai da tela cheia.
- [x] **CA06:** Dado um tipo que suporta equipes, quando escolho 3 equipes antes de começar, então o placar exibe 3 pontuações independentes.
- [x] **CA07 (erro):** Dado uma atividade com `content` inválido, quando a abro, então vejo "This activity couldn't be loaded" com link para o catálogo, e o erro é registrado no console, sem tela branca.
- [x] **CA08:** Dado o player em foco, quando pressiono → ou Espaço, então avanço para o próximo item (em tipos que têm navegação sequencial).
- [x] **CA09:** Dado um item com botão de áudio, quando clico nele, então o navegador pronuncia o texto em inglês (en-US); em navegador sem suporte, o botão fica oculto.
- [x] **CA10:** Dado um item com clipe do YouTube (`start: 30, end: 45`), quando dou play, então o vídeo toca apenas do segundo 30 ao 45.
- [x] **CA11 (negativo):** Dado uma atividade `draft` ou slug inexistente, quando acesso `/play/[slug]`, então vejo "Activity not found" e nenhuma informação da atividade. _(No site estático, essas URLs caem no shell do player pela regra de rewrite do Hosting; a mensagem aparece com status HTTP 200 e `noindex`, e não 404. Os rascunhos continuam protegidos pelas regras do Firestore.)_
- [x] **CA13:** Dado uma atividade publicada pelo painel depois do último build, quando acesso `/play/[slug]`, então o shell do player carrega a atividade do Firestore e ela funciona normalmente; um slug inexistente continua mostrando 404.
- [x] **CA12 (erro):** Dado um item com um vídeo do YouTube que bloqueia embed, quando o player tenta tocar, então aparece "This clip can't be played here" com o link "Watch on YouTube" apontando para `?t={start}`, e o resto da atividade continua funcionando.

## O que a atividade não inclui

- Os tipos de atividade em si: motivo: cada um tem spec própria.
- Salvar progresso parcial para continuar depois: motivo: prematuro.
- Multiplayer em tempo real (alunos respondendo pelo celular, estilo Kahoot): motivo: complexo demais agora.
- Editor visual de atividades: motivo: ver spec do Painel admin.

### Considerado para o futuro (P2)

- Modo "live" com alunos respondendo pelo celular (Firestore em tempo real).
- Persistência de resultados para relatórios do professor.
- Novos tipos: Wheel of Fortune, Family Feud, Taboo, Scattergories, "Who wants to be a millionaire", ordenar frases, caça-palavras.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Sons de acerto/erro ligados por padrão? | Design | Não | Adiado: a v1 não tem sons (faltam assets livres); o feedback é visual e textual |
| D02 | Quais tipos compõem a v1? | PO | Não | Quiz, Flashcards, Completar lacunas, Quiz Board e Cartões de conversa; o Quiz já está no registro, os outros entram com suas specs |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Intro e start | e2e | CA01 | Abrir quiz e clicar Start | Quiz renderizado |
| CT02 | Plugin demo | integração | CA02 | Registrar plugin demo e renderizar | Funciona sem mudar o shell |
| CT03 | Progresso | componente | CA03 | Plugin chama `onProgress(3,10)` | "3 / 10" |
| CT04 | Resultados e replay | e2e | CA04 | Concluir e clicar Play again | Resultado exibido; reinício limpo |
| CT05 | Fullscreen | manual | CA05 | Clicar Fullscreen, Esc | Entra e sai |
| CT06 | Equipes | componente | CA06 | 3 equipes | 3 placares |
| CT07 | Conteúdo inválido | integração | CA07 | Seed com content quebrado | Mensagem amigável |
| CT08 | Teclado | e2e | CA08 | Pressionar → | Próximo item |
| CT09 | TTS | manual | CA09 | Clicar áudio no Chrome/Safari | Pronúncia en-US |
| CT10 | Clipe do YouTube | manual | CA10 | Tocar clipe 30–45 s | Para no 45 s |
| CT11 | 404 | e2e | CA11 | Slug inexistente e draft | 404 |
| CT13 | Atividade sem página estática | e2e (emulador de Hosting) | CA13 | Publicar no emulador sem rebuild e abrir `/play/novo` | Atividade carrega pelo shell |
| CT12 | Embed bloqueado | componente | CA12 | Mock da IFrame API disparando `onError(150)` | Fallback com link correto |

## URL Complementar

- Documentação técnica: https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API · https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API · https://developers.google.com/youtube/iframe_api_reference
- Protótipo / mockup:
- Discussões relacionadas: Decisão: motor de atividades próprio (não usar embeds de terceiros).
- Referências de design: https://www.coolenglish.org/activities (tipos de jogos do acervo)
- Requisitos originais: Pedido de criar um site semelhante ao Cool English.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
