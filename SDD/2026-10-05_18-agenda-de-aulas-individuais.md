# [FEAT] Agenda de aulas individuais (horário fixo e semana)

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-05 · **Atualizada em:** 2026-10-05
> **Ordem de implementação:** 18 · **Depende de:** 17 · **Por quê nesta posição:** Precisa do aluno individual e da aula 1:1 (spec 17); alimenta os créditos da spec 19
> **Specs relacionadas:** 20 (agendamento pelo aluno e confirmação). Aulas criadas pelo professor nesta agenda ficam como **propostas** até o aluno confirmar (aceitar ou entrar na aula), e só então consomem crédito

## Detalhes da Atividade

- **O que precisa ser feito:** Cadastrar o **horário fixo** de cada aluno (ex.: "Ana — terças e quintas, 19h, 60 min, online") e mostrar a **agenda da semana** e as **aulas de hoje** no dashboard, com remarcação, cancelamento e aula extra. Cada aula da agenda tem o botão "Start lesson", que abre a aula 1:1 já ligada àquele horário.
- **Problema e evidência:** Com aulas sempre 1:1, o professor organiza a semana por horário de aluno. Hoje o produto não guarda horário nenhum; isso fica em agenda de papel, Google Calendar ou WhatsApp, separado do histórico das aulas.
- **Impacto de não fazer:** O professor não vê no produto "quem tenho hoje"; faltas e remarcações não ficam registradas, e a spec 19 (créditos) não tem como saber quais aulas aconteceram, faltaram ou foram canceladas.
- **Para quem é destinado:** Professor particular com aulas 1:1 recorrentes.
- **História de usuário:** Como professor particular, quero ver minha semana com o horário de cada aluno e começar a aula pela agenda, para não depender de outra ferramenta e registrar faltas e remarcações.
- **Como saberemos que deu certo:** Cadastrar o horário fixo de um aluno em < 30 s; ao abrir o dashboard, ver as aulas de hoje sem nenhum clique; remarcar uma aula em ≤ 3 cliques.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Horário fixo por aluno: um ou mais horários semanais (dia da semana, hora de início, duração 15–180 min, modalidade), com data de início e fim opcional | P0 | CA01 |
| RF02 | Bloco "Today" no topo do dashboard: aulas de hoje em ordem de horário, com aluno, hora, modalidade, status e "Start lesson" / "Open meeting" | P0 | CA02 |
| RF03 | Página "Schedule" com a visão da semana (colunas por dia; lista no celular) e navegação entre semanas | P0 | CA03 |
| RF04 | Ações por ocorrência: remarcar (nova data/hora só daquela aula), cancelar (motivo: by student / by teacher / holiday), marcar falta (no-show) e "Add extra lesson" avulsa | P0 | CA04, CA05, CA06 |
| RF05 | "Start lesson" pela agenda liga a sessão 1:1 à ocorrência; ao encerrar, a ocorrência fica "Done" com a duração real | P0 | CA07 |
| RF06 | Aula de hoje que não foi iniciada nem marcada aparece como "Needs update" depois do horário de término, pedindo Done / No-show / Cancelled | P1 | CA08 |
| RF07 | Alerta de conflito ao cadastrar ou remarcar em horário sobreposto a outra aula | P1 | CA09 |
| RF08 | Pausar o aluno (status Paused, spec 17) suspende as ocorrências futuras; voltar a Active as retoma | P1 | CA10 |
| RF09 | Na página do aluno: próxima aula e lista de ocorrências passadas com status (Done, No-show, Cancelled, Rescheduled) | P0 | CA11 |
| RF10 | Exportar a agenda como arquivo `.ics` (assinatura de calendário) para Google/Apple Calendar | P2 | — |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Regra recorrente em `students/{id}/schedule/{ruleId}` `{ weekday (0–6), startTime "HH:mm", durationMin, mode, validFrom, validUntil? }`; ocorrências **calculadas no cliente** a partir das regras | P0 | CA01 |
| RNF02 | Só ocorrências com exceção ou registro viram documento: `users/{uid}/lessons/{lessonId}` `{ studentId, studentName, ruleId?, originalStart?, start, durationMin, mode, status: "scheduled" \| "done" \| "no-show" \| "cancelled", cancelReason?, sessionId?, extra: boolean }`; id determinístico `ruleId_yyyy-mm-dd` evita duplicar. Os campos de confirmação (`bookedBy`, `confirmation`, `confirmedVia`, `joinedAt`) são definidos na spec 20 | P0 | CA04, CA07 |
| RNF03 | Datas e horas no fuso do professor (`America/Sao_Paulo` padrão, configurável); armazenar em UTC; testar a virada de horário de verão | P0 | CA12 |
| RNF04 | Regras do Firestore: só o professor lê e escreve `schedule` e `lessons` diretamente; o aluno (`portalUid`) vê e age sobre as **próprias** aulas apenas pelas Cloud Functions da spec 20 | P0 | CA13 |
| RNF05 | O cálculo de ocorrências (`expandSchedule(rules, exceptions, range)`) é função pura em `src/lib/schedule/` com testes de unidade | P0 | CA03 |
| RNF06 | Visão da semana carrega em < 1 s com 40 alunos ativos (consulta de `lessons` por intervalo com índice `teacher + start`) | P1 | |

### Dependências técnicas

- Spec 17 (aluno individual, aula 1:1, `ClassroomSession.studentId`).
- `src/lib/session/*` para ligar `sessionId` ↔ `lessonId`.
- Spec 19 consome os status das ocorrências (Done/No-show descontam crédito conforme a política).
- `firestore.rules`, `firestore.indexes.json`.

### Recursos necessários

- Mockup do bloco "Today", da semana (desktop e celular) e do modal de remarcação.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado "Ana", quando cadastro "terça e quinta, 19:00, 60 min, Online", então as próximas terças e quintas aparecem na agenda com "Ana 19:00–20:00".
- [ ] **CA02:** Dado que hoje é terça, quando abro o dashboard, então o bloco "Today" mostra "Ana 19:00 · Online" com "Start lesson" e "Open meeting".
- [ ] **CA03:** Dado 5 alunos com horários fixos, quando abro "Schedule" e vou para a semana seguinte, então vejo todas as aulas daquela semana nos dias e horas corretos.
- [ ] **CA04:** Dado a aula de quinta de "Ana", quando a remarco para sexta 18:00, então só essa aula muda; as quintas seguintes continuam às 19:00.
- [ ] **CA05:** Dado a aula de terça de "Ana", quando a cancelo com o motivo "Holiday", então ela aparece riscada como "Cancelled · Holiday" e não pode ser iniciada.
- [ ] **CA06:** Dado "Ana", quando adiciono uma aula extra no sábado 10:00, então ela aparece só naquele sábado marcada como "Extra".
- [ ] **CA07:** Dado a aula de hoje de "Ana", quando clico em "Start lesson" e depois encerro a aula, então a ocorrência fica "Done" com a duração real e o link para o resumo da aula.
- [ ] **CA08:** Dado uma aula de hoje às 19:00 que não foi iniciada, quando abro o dashboard às 20:30, então ela aparece como "Needs update" com as opções Done, No-show e Cancelled.
- [ ] **CA09:** Dado "Ana" às terças 19:00, quando cadastro "Bruno" às terças 19:30, então vejo o aviso "Overlaps with Ana (19:00–20:00)" e posso salvar mesmo assim.
- [ ] **CA10:** Dado que pausei "Bruno", quando abro a agenda, então as aulas futuras dele não aparecem; e ao reativá-lo elas voltam.
- [ ] **CA11:** Dado "Ana" com 1 aula Done, 1 No-show e 1 Cancelled, quando abro a página dela, então vejo a próxima aula e essas 3 com o status de cada uma.
- [ ] **CA12 (limite):** Dado o fuso `America/Sao_Paulo`, quando a agenda mostra uma semana com mudança de fuso (ou a virada do dia em UTC), então a aula das 22:00 continua no dia e na hora certos.
- [ ] **CA13 (negativo):** Dado o professor B ou "Ana" no portal, quando tentam ler `users/{uidA}/lessons` ou `students/{id}/schedule` pelo SDK, então recebem `permission-denied`.

## O que a atividade não inclui

- Sincronização em duas vias com Google Calendar: motivo: complexo demais agora (OAuth e webhooks); o `.ics` é P2.
- Agendamento feito pelo próprio aluno (escolher horário livre) e confirmação de aulas: motivo: detalhado na spec 20 (decisão do PO em 2026-10-05).
- Lembretes automáticos ao aluno (WhatsApp/e-mail): motivo: e-mail e mensagens automáticas estão adiados (spec 00).

### Considerado para o futuro (P2)

- Exportação/assinatura `.ics` (RF10).
- Lembrete ao aluno X horas antes da aula.
- Política de reposição (prazo para remarcar sem perder a aula), ligada à spec 19.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O aluno vê a próxima aula no portal? | PO | Não | Sim (2026-10-05): o aluno vê, agenda e confirma as próprias aulas pelo portal (spec 20) |
| D02 | Aula iniciada sem estar na agenda (aula "solta") cria uma ocorrência extra automaticamente? | PO | Não | Sugestão: sim, como "Extra" |
| D03 | Visão da semana começa no domingo ou na segunda? | design | Não | Sugestão: segunda |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Expandir regra | unit | CA01 | `expandSchedule` ter/qui 4 semanas | 8 ocorrências corretas |
| CT02 | Today | e2e (emulador, relógio fixo) | CA02 | Abrir dashboard numa terça | Ana 19:00 |
| CT03 | Semana | unit + e2e | CA03 | 5 regras, semana seguinte | Ocorrências corretas |
| CT04 | Remarcar | unit + e2e | CA04 | Exceção para 1 data | Só ela muda |
| CT05 | Cancelar | e2e | CA05 | Cancelar com motivo | Status e motivo |
| CT06 | Extra | unit | CA06 | Aula avulsa | Só no sábado |
| CT07 | Ligar sessão | integração | CA07 | Start → End | `status: done`, `sessionId` |
| CT08 | Needs update | unit (relógio fixo) | CA08 | Agora > término | Estado "Needs update" |
| CT09 | Conflito | unit | CA09 | Sobreposição | Aviso exibido |
| CT10 | Pausa | unit | CA10 | Aluno Paused | Sem ocorrências futuras |
| CT11 | Histórico no aluno | e2e | CA11 | 3 status | Lista correta |
| CT12 | Fuso | unit | CA12 | Datas na virada UTC | Dia e hora locais certos |
| CT13 | Regras | integração (rules) | CA13 | Leituras cruzadas | `permission-denied` |

## URL Complementar

- Documentação técnica: `SDD/2026-10-05_17-alunos-individuais-e-aula-1a1.md`; `SDD/DONE/2026-10-03_08-sessao-de-aula.md`.
- Protótipo / mockup:
- Discussões relacionadas: pedido do PO em 2026-10-05 (horário fixo e agenda da semana).
- Referências de design: RFC 5545 (iCalendar) para o P2 `.ics`.
- Requisitos originais:
- Issue / PR relacionado:
