# [FEAT] Cronômetro e timer visual para a aula

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-03 · **Atualizada em:** 2026-10-03  
> **Ordem de implementação:** 05 (sequência 00 a 11) · **Depende de:** — (componente isolado) · **Por quê nesta posição:** Plugado na aba Timer pela spec 08

## Detalhes da Atividade

- **O que precisa ser feito:** Criar um **timer regressivo** e um **cronômetro** grandes e legíveis à distância, para controlar o tempo de jogos em equipe, rodadas de conversação e exercícios. Ficam na aba "Timer" da sessão de aula e em um modo "tela cheia" para projeção.
- **Problema e evidência:** O player já tem um timer por atividade (opção `supports.timer` no intro), mas ele só existe dentro de uma atividade. Para "2 minutos de conversa em dupla" ou "30 s por equipe", o professor abre outro site de timer.
- **Impacto de não fazer:** O professor continua trocando de aba; a gamificação perde força sem uma contagem visível para todos.
- **Para quem é destinado:** Professor conduzindo aula projetada ou com tela compartilhada.
- **História de usuário:** Como professor, quero disparar um timer grande com um clique, para que a turma veja quanto tempo resta e a atividade fique mais dinâmica.
- **Como saberemos que deu certo:** Iniciar um timer predefinido em 1 clique; desvio menor que 1 s em 10 minutos, mesmo com a aba em segundo plano.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Modo **Countdown** com predefinições (30 s, 1, 2, 3, 5 e 10 min) e tempo personalizado (mm:ss, até 99:59) | P0 | CA01 |
| RF02 | Modo **Stopwatch** com iniciar, pausar, retomar e zerar | P0 | CA02 |
| RF03 | Botões de ajuste rápido durante a contagem: "+30 s" e "−30 s" | P1 | CA03 |
| RF04 | Ao chegar a zero: alerta visual (piscar e mudar de cor) e sonoro (som curto, com botão de mudo). Nos últimos 10 s o número muda de cor | P0 | CA04 |
| RF05 | Botão "Big screen": o timer ocupa a tela inteira em overlay, com contraste alto. `Esc` ou clique fecha | P0 | CA05 |
| RF06 | Minitimer sempre visível no cabeçalho da barra lateral enquanto houver contagem, mesmo com outra aba da barra aberta | P1 | CA06 |
| RF07 | Modo **Rounds**: N rodadas de X min, com contagem da rodada atual ("Round 2/4") e intervalo opcional, para rodadas de equipes | P2 | |
| RF08 | Barra de progresso circular ou linear, além dos números | P1 | CA01 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | O tempo é calculado a partir de `Date.now()` de referência, e não pela soma de ticks, para não atrasar com a aba em segundo plano | P0 | CA07 |
| RNF02 | Números legíveis a 5 m em um projetor: ≥ 20 vh no modo Big screen; contraste ≥ 7:1 | P0 | |
| RNF03 | O alerta de fim não depende só de cor: há texto "Time's up!" e som (WCAG 1.4.1) | P0 | CA04 |
| RNF04 | O som respeita a política de autoplay: o contexto de áudio é criado no clique de "Start" | P0 | CA04 |
| RNF05 | O componente funciona fora da sessão (exportado de `src/components/ui`) para ser reaproveitado | P1 | |

### Dependências técnicas

- [FEAT] Sessão de aula (contêiner da aba e estado persistido). O componente pode ser entregue antes e testado na galeria `/dev/ui`.
- Verificar se o timer do player (`supports.timer`) pode reaproveitar o mesmo hook de tempo.

### Recursos necessários

- Arquivo de som curto e livre de direitos (≤ 30 KB) em `public/`.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado a aba Timer aberta, quando clico na predefinição "2 min", então a contagem começa em 02:00 e diminui a cada segundo, com a barra de progresso acompanhando.
- [ ] **CA02:** Dado o modo Stopwatch, quando inicio, pauso em 00:15, espero 10 s e retomo, então a contagem continua de 00:15.
- [ ] **CA03:** Dado um countdown em 00:40, quando clico em "+30 s", então o tempo passa para 01:10 sem reiniciar.
- [ ] **CA04:** Dado um countdown chegando a zero, quando ele termina, então a tela mostra "Time's up!" piscando e toca um som; com o mudo ativo, só o alerta visual aparece.
- [ ] **CA05:** Dado um countdown ativo, quando clico em "Big screen", então o timer ocupa a tela inteira e `Esc` volta ao estado anterior sem parar a contagem.
- [ ] **CA06:** Dado um countdown ativo, quando troco para a aba Board da barra, então o minitimer continua visível no cabeçalho.
- [ ] **CA07 (limite):** Dado um countdown de 10 min, quando deixo a aba do navegador em segundo plano por 5 min e volto, então o tempo restante está correto, com erro menor que 1 s.
- [ ] **CA08 (negativo):** Dado que digito "120:00" ou "abc" no tempo personalizado, quando tento iniciar, então o botão Start fica desabilitado e aparece a mensagem "Enter a time up to 99:59".

## O que a atividade não inclui

- Timer sincronizado nos dispositivos dos alunos: motivo: coberto pela spec 09 (Sala ao vivo), que reaproveita este componente.
- Vários timers ao mesmo tempo (um por equipe): motivo: baixo impacto; o modo Rounds cobre o caso de turnos.
- Escolha de sons ou músicas de fundo: motivo: baixo impacto.

### Considerado para o futuro (P2)

- Modo Rounds (RF07).
- Timer por equipe integrado ao placar do quiz-board.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O timer interno do player deve ser substituído por este componente? | Dev | Não | Sugestão: unificar o hook de tempo e manter a UI de cada um |
| D02 | Qual som usar no fim (sino, apito)? | Design | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Predefinição | unit (fake timers) | CA01 | Iniciar 2 min e avançar 1 s | 01:59 |
| CT02 | Pausa e retomada | unit | CA02 | Pausar, avançar 10 s e retomar | Mantém 00:15 |
| CT03 | Ajuste +30 s | unit | CA03 | Somar 30 s em 00:40 | 01:10 |
| CT04 | Fim da contagem | e2e + manual (som) | CA04 | Countdown de 3 s | "Time's up!" e som; mudo silencia |
| CT05 | Big screen | e2e | CA05 | Abrir e fechar com Esc | Overlay abre e fecha; contagem continua |
| CT06 | Minitimer | e2e | CA06 | Trocar de aba da barra | Minitimer visível |
| CT07 | Segundo plano | unit (mock de `Date.now`) | CA07 | Saltar 5 min de relógio | Tempo restante correto |
| CT08 | Entrada inválida | unit | CA08 | "120:00", "abc" | Start desabilitado e mensagem |

## URL Complementar

- Documentação técnica: `src/components/player/player-intro.tsx` (opção de timer existente).
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: Classroomscreen (timer) como referência de legibilidade.
- Requisitos originais: "Cronômetro/Timer Visual" (ideias de 2026-10-03).
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
