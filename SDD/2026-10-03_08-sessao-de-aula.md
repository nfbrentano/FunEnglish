# [FEAT] Sessão de aula (Classroom Session) com barra lateral fixa

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-03 · **Atualizada em:** 2026-10-03  
> **Ordem de implementação:** 08 (sequência 00 a 11) · **Depende de:** 00 a 07 · **Por quê nesta posição:** Integra as ferramentas e publica o resumo; a sala ao vivo (09) a estende para os aparelhos dos alunos; o registro de atividades é usado pela spec 11

## Detalhes da Atividade

- **O que precisa ser feito:** Criar o conceito de **sessão de aula**. O professor inicia a sessão de uma turma e o site abre uma **barra lateral fixa** com as ferramentas da aula (cronômetro, lousa, sorteador, notas rápidas e lista de presença), enquanto as atividades seguem no centro da tela. Ao encerrar, é gerado um **resumo da aula**, salvo no painel do professor e publicado no portal de cada aluno presente.
- **Problema e evidência:** Durante a aula, o professor alterna entre o Fun English, um timer de outro site, uma lousa (Jamboard, Miro) e um caderno para anotar erros. Essa troca de abas aparece na tela projetada e quebra o ritmo. Depois da aula, o que foi feito se perde.
- **Impacto de não fazer:** As ferramentas de aula ao vivo (timer, lousa, sorteador) ficariam soltas, e as anotações não alimentariam o acompanhamento do aluno, que é o principal diferencial.
- **Para quem é destinado:** Professor de ESL logado, conduzindo aula presencial (projetor) ou online (compartilhando a tela).
- **História de usuário:** Como professor, quero iniciar uma sessão para a turma e ter cronômetro, lousa, sorteio e anotações ao lado das atividades, para conduzir a aula sem trocar de aba e terminar com um resumo pronto.
- **Como saberemos que deu certo:** Iniciar a sessão em ≤ 2 cliques a partir do dashboard; 0 dados privados (notas não compartilhadas) visíveis com o modo projeção ativo; resumo gerado em < 2 s ao encerrar.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Botão "Start class" no card da turma e na página da turma. Ao iniciar, cria `users/{uid}/sessions/{sessionId}` `{ classId, startedAt, status: "active" }` | P0 | CA01 |
| RF02 | Barra lateral fixa à direita (recolhível para uma faixa de ícones) que permanece aberta ao navegar entre catálogo, categoria e player, inclusive em tela cheia | P0 | CA02 |
| RF03 | Abas da barra: Timer, Board, Picker, Notes, Students. O conteúdo de cada uma vem das specs específicas; esta spec entrega o contêiner, as abas e o estado da sessão | P0 | CA02 |
| RF04 | Lista de presença: todos os alunos da turma começam como presentes, com opção de marcar ausência. Os ausentes não entram no sorteio nem recebem o resumo | P0 | CA03 |
| RF05 | Registro automático das atividades abertas durante a sessão (id, título, horário), reaproveitando o ponto que hoje grava "Recently played" | P0 | CA04 |
| RF06 | **Modo projeção** (alternável): esconde notas privadas, e-mails e qualquer dado não compartilhado. Fica ativo por padrão ao entrar em tela cheia | P0 | CA05 |
| RF07 | "End class": abre a revisão do resumo (duração, presentes, atividades, palavras novas, notas por aluno e texto da lousa), permite editar e então confirmar | P0 | CA06 |
| RF08 | Ao confirmar: a sessão fica `status: "ended"`; as notas marcadas como compartilhadas e as palavras vão para cada aluno presente; o resumo aparece em "Past classes" na página da turma. Cada aluno presente recebe o **resumo inteiro da aula** (data, duração, atividades, palavras, texto da lousa e notas da turma toda) em `students/{id}/classes/{sessionId}`, mais as notas compartilhadas dele. As notas individuais de outros colegas nunca entram no resumo de um aluno | P0 | CA06, CA07, CA11 |
| RF09 | Sessão sobrevive a recarregar a página e a fechar a aba: ao voltar ao site, aparece "Resume class 'Teens B1'?" | P0 | CA08 |
| RF10 | Só uma sessão ativa por professor; iniciar outra pede para encerrar ou descartar a atual | P1 | CA09 |
| RF11 | Sessão ativa há mais de 6 h sem interação é encerrada automaticamente como rascunho, sem publicar nada, por uma Function agendada (a cada 1 h) | P1 | |
| RF12 | Atalhos de teclado: `T` timer, `B` board, `P` picker, `N` notes e `[` para recolher a barra (desativados quando o foco está em um campo de texto) | P2 | |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Estado da sessão em um provider React no layout raiz. Escritas no Firestore com debounce (≤ 1 escrita a cada 5 s por campo), com cópia local para recuperação | P0 | CA08 |
| RNF02 | A barra não cobre a área útil do player: em telas ≥ 1280 px o conteúdo encolhe; abaixo disso a barra fica sobreposta e recolhida por padrão | P0 | CA02 |
| RNF03 | Acessível: abas com `role="tablist"`, foco visível e navegável só por teclado (WCAG AA) | P0 | |
| RNF04 | O site continua `output: "export"`; a lógica de servidor (encerramento automático e publicação no portal) fica em Cloud Functions (spec 00) | P0 | |
| RNF05 | A barra não aparece no modo aluno (`?mode=student`) nem para usuários não logados | P0 | CA10 |

### Dependências técnicas

- [FEAT] Turmas e alunos.
- O conteúdo das abas vem de [FEAT] Cronômetro visual, [FEAT] Lousa virtual, [FEAT] Sorteador de alunos e grupos e [FEAT] Notas e erros do aluno. A sessão pode ser entregue antes, com abas desabilitadas e marcadas "Coming soon".
- [CHORE] Infraestrutura do plano Blaze (spec 00): Function agendada (RF11).
- O resumo publicado no aluno depende de [FEAT] Portal do aluno e [FEAT] Banco de vocabulário do aluno. Sem eles, o resumo fica só no painel do professor.
- `src/lib/history` (gancho do "Recently played").

### Recursos necessários

- Mockup da barra lateral (expandida, recolhida e em tela cheia) e da tela de resumo.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado a turma "Teens B1" com 8 alunos, quando clico em "Start class", então a barra lateral abre com o nome da turma, o relógio da sessão em 00:00 e a aba Students com 8 presentes.
- [ ] **CA02:** Dado uma sessão ativa, quando navego do catálogo para uma atividade e a coloco em tela cheia, então a barra continua visível (ou recolhida em ícones) com o mesmo estado.
- [ ] **CA03:** Dado que marquei "Ana" como ausente, quando abro o sorteador, então "Ana" não aparece entre os nomes.
- [ ] **CA04:** Dado que abri as atividades X e Y durante a sessão, quando clico em "End class", então o resumo lista X e Y na ordem em que foram abertas, com horário.
- [ ] **CA05 (negativo):** Dado que escrevi uma nota privada sobre "Ana" e ativei o modo projeção, quando olho a barra e a tela, então nenhuma nota privada nem e-mail de aluno aparece.
- [ ] **CA06:** Dado que estou na revisão do resumo, quando removo uma nota e confirmo, então a sessão fica encerrada, a nota removida não é publicada e o resumo aparece em "Past classes".
- [ ] **CA07:** Dado que "Ana" estava presente e "Bruno" ausente, quando confirmo o encerramento, então só "Ana" recebe as palavras e as notas compartilhadas da aula.
- [ ] **CA08 (erro):** Dado uma sessão ativa, quando recarrego a página ou fico offline e volto, então aparece "Resume class 'Teens B1'?" e, ao retomar, o timer da sessão, a lousa e as notas estão como antes.
- [ ] **CA09 (limite):** Dado uma sessão ativa, quando tento iniciar outra turma, então um modal pede para encerrar ou descartar a sessão atual antes.
- [ ] **CA11 (negativo):** Dado uma aula com nota compartilhada para "Ana" e outra para "Bruno", quando "Ana" abre o resumo dessa aula no portal, então vê o resumo inteiro (atividades, palavras, lousa e notas da turma) e a nota dela, mas não a nota de "Bruno".
- [ ] **CA10 (negativo):** Dado uma sessão ativa, quando um aluno abre o link de compartilhamento (`?mode=student`) no mesmo navegador, então a barra lateral não é exibida.

## O que a atividade não inclui

- Envio do resumo por e-mail: motivo: decisão do PO (2026-10-03), ainda não faz sentido; o resumo vai para o portal e há o botão "Copy summary" para colar no WhatsApp.
- Sincronização em tempo real com os aparelhos dos alunos: motivo: coberta pela spec 09 (Sala ao vivo). Esta spec atende a aula presencial (projetor) e a aula online por compartilhamento de tela no Meet/Zoom, por isso o modo projeção (RF06) também precisa ser ligado ao compartilhar a tela.
- Sessão para aluno avulso sem turma: motivo: uma turma com 1 aluno resolve o caso de aula particular.
- Relatórios agregados de várias sessões: motivo: prematuro.

### Considerado para o futuro (P2)

- Envio do resumo por e-mail aos alunos (adiado em 2026-10-03; ver spec 00).
- Sala ao vivo: ver spec 09; o modelo `sessions/{id}` deve guardar o código da sala (`liveRoomCode`).
- Planejamento de aula: a sessão já começa com uma fila de atividades escolhidas.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Barra à direita ou à esquerda? Em tela cheia, faixa flutuante ou overlay? | Design | Não | |
| D02 | O resumo da aula aparece no portal de forma integral ou só as partes de cada aluno (notas e palavras)? | PO | Não | Integral (2026-10-03), exceto as notas individuais dos colegas (RF08) |
| D03 | O modo projeção deve ser ativado automaticamente ao compartilhar a tela (API `getDisplayMedia` não informa isso)? | Dev | Não | Sugestão: ligado por padrão com toggle visível |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Iniciar sessão | e2e (emulador) | CA01 | Start class em turma com 8 alunos | Barra aberta, 8 presentes |
| CT02 | Persistência na navegação | e2e | CA02 | Navegar catálogo → player → tela cheia | Barra presente com o mesmo estado |
| CT03 | Ausência e sorteio | unit | CA03 | Marcar ausente e pedir a lista de sorteio | Ausente excluído |
| CT04 | Registro de atividades | integração | CA04 | Abrir X e Y | `activitiesPlayed` em ordem |
| CT05 | Modo projeção | e2e + manual | CA05 | Nota privada + toggle | Nenhum texto privado no DOM visível |
| CT06 | Revisar e encerrar | e2e | CA06 | Remover nota e confirmar | `status: ended`; nota não publicada |
| CT07 | Só presentes recebem | integração | CA07 | Encerrar com 1 ausente | Docs criados só para presentes |
| CT08 | Recuperação | e2e | CA08 | Recarregar no meio da sessão | Prompt "Resume class" e estado restaurado |
| CT09 | Sessão única | e2e | CA09 | Iniciar segunda turma | Modal de conflito |
| CT10 | Modo aluno | e2e | CA10 | Abrir link de aluno com sessão ativa | Sem barra |
| CT11 | Resumo sem notas de colegas | integração | CA11 | Encerrar com notas para 2 alunos | Doc de cada aluno sem a nota do outro |

## URL Complementar

- Documentação técnica: `src/components/player/activity-player.tsx` (gancho de histórico); `src/lib/student-mode.ts`.
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: N/A.
- Requisitos originais: "Pulo do gato: Classroom Session" (ideias de 2026-10-03).
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
