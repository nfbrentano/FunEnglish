# [FEAT] Agendamento pelo aluno e confirmação de aulas

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-05 · **Atualizada em:** 2026-10-05
> **Ordem de implementação:** 20 · **Depende de:** 03, 17, 18, 19 · **Por quê nesta posição:** Usa a agenda (18) e o saldo de créditos (19); o aluno agenda pelo portal (03)

## Detalhes da Atividade

- **O que precisa ser feito:** Permitir que o **aluno agende as próprias aulas** pelo portal, escolhendo um horário livre na disponibilidade do professor e usando os créditos do pacote. O professor também pode agendar, mas a aula agendada por ele fica como **proposta**: só consome crédito se o aluno **aceitar** o agendamento ou se **entrar na aula confirmando** a presença.
- **Problema e evidência:** Decisão do PO (2026-10-05, D06 da spec 19): "o próprio aluno agenda, mas pode ter a opção do professor agendar e só gastar crédito do aluno se ele aceitar o agendamento ou se ele entrar na aula com a confirmação". Hoje o horário é combinado pelo WhatsApp e o professor registra tudo à mão.
- **Impacto de não fazer:** O professor vira a central de agendamento de todos os alunos; o crédito pode ser descontado de uma aula que o aluno nunca aceitou, gerando disputa.
- **Para quem é destinado:** Aluno com acesso ao portal (agenda, aceita, cancela, entra na aula) e professor particular (define a disponibilidade, propõe aulas, aprova).
- **História de usuário:** Como aluno, quero escolher o horário da minha próxima aula e usar meus créditos sozinho, para não depender de troca de mensagens. Como professor, quero propor aulas sem tirar crédito do aluno até ele concordar, para evitar cobranças contestadas.
- **Como saberemos que deu certo:** Aluno agenda uma aula em ≤ 4 toques e < 1 minuto; 0 aulas que consumiram crédito sem confirmação do aluno (agendou, aceitou ou entrou); 0 agendamentos duplicados no mesmo horário.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | **Disponibilidade do professor:** janelas semanais (ex.: seg–sex 08:00–12:00 e 18:00–22:00), bloqueios de datas (férias, feriados), intervalo entre aulas (0–30 min), antecedência mínima para agendar (padrão 12 h) e horizonte máximo (padrão 30 dias) | P0 | CA01 |
| RF02 | **Aluno agenda pelo portal:** "Book a lesson" mostra os horários livres (disponibilidade − aulas já marcadas − bloqueios), na duração padrão do aluno; o aluno escolhe e confirma | P0 | CA02 |
| RF03 | Agendar exige **crédito disponível** (saldo − aulas futuras confirmadas ≥ 1); sem crédito, o portal mostra "You have no lessons left — talk to your teacher" e não permite agendar | P0 | CA03 |
| RF04 | Opção do professor por aluno: agendamentos do aluno são **confirmados automaticamente** (padrão) ou ficam **aguardando aprovação** do professor | P1 | CA04 |
| RF05 | **Professor propõe uma aula** (avulsa ou série recorrente da spec 18): ela fica "Proposed" no portal do aluno com "Accept" / "Decline"; aceitar confirma (a série é aceita de uma vez, e cada aula pode ser recusada depois) | P0 | CA05, CA06 |
| RF06 | **Confirmação ao entrar:** no horário da aula (de 15 min antes até o fim), o portal mostra "Join lesson"; ao tocar, o aluno vê "Joining confirms this lesson and uses 1 credit" e, ao aceitar, a aula fica confirmada com `joinedAt` e o link da reunião é aberto (aula online) | P0 | CA07 |
| RF07 | **Regra de consumo** (aplica a política da spec 19 só a aulas confirmadas): aula confirmada (agendada pelo aluno, aceita ou com entrada confirmada) consome 1 crédito ao ser concluída ou em caso de falta; aula **proposta e não confirmada** nunca consome, nem como falta, e expira como "Not confirmed" após o horário | P0 | CA08, CA09 |
| RF08 | **Cancelamento pelo aluno** no portal: com ≥ 24 h, sem custo; com < 24 h, aviso "Cancelling now uses 1 credit" antes de confirmar (política da spec 19) | P0 | CA10 |
| RF09 | **Remarcação pelo aluno:** com ≥ 24 h, escolhe outro horário livre sem custo (a aula original é liberada); com < 24 h, segue a regra do cancelamento | P1 | CA11 |
| RF10 | Professor vê no dashboard as pendências: novos agendamentos (selo "New"), pedidos aguardando aprovação e propostas ainda não aceitas | P0 | CA12 |
| RF11 | Botão "Share via WhatsApp" na proposta: abre o WhatsApp do aluno com o link do portal para aceitar (sem envio automático) | P1 | CA13 |
| RF12 | Aula presencial: o "Join lesson" não abre link, só confirma a presença; o professor também pode marcar "Student confirmed in person" se o aluno não tiver o portal aberto | P1 | CA14 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Modelo: disponibilidade em `users/{uid}/availability/settings` `{ windows: [{ weekday, start, end }], blocks: [{ from, to, reason? }], bufferMin, minNoticeHours, horizonDays, timezone }` | P0 | CA01 |
| RNF02 | `users/{uid}/lessons/{id}` (spec 18) ganha: `bookedBy: "student" \| "teacher"`, `confirmation: "pending-student" \| "pending-teacher" \| "confirmed" \| "declined" \| "expired"`, `confirmedAt?`, `confirmedVia?: "booking" \| "accept" \| "join" \| "teacher-in-person"`, `joinedAt?` | P0 | CA05, CA07 |
| RNF03 | O aluno **não escreve** direto em `lessons`. Agendar, aceitar, recusar, cancelar, remarcar e entrar são **Cloud Functions callable** (`bookLesson`, `respondToProposal`, `cancelLesson`, `rescheduleLesson`, `joinLesson`) que conferem `portalUid`, crédito e disponibilidade | P0 | CA15 |
| RNF04 | `bookLesson` e `rescheduleLesson` rodam em **transação** com um documento de trava por horário (`users/{uid}/slots/{yyyy-mm-ddTHH:mm}`), garantindo que dois alunos não reservem o mesmo horário | P0 | CA16 |
| RNF05 | Horários livres calculados por uma callable `getAvailableSlots` que devolve só início/fim, **sem nomes de outros alunos** | P0 | CA15 |
| RNF06 | O link da reunião (dado privado da spec 17) só é entregue ao aluno pela `joinLesson`, dentro da janela da aula | P0 | CA07 |
| RNF07 | Consumo de crédito continua idempotente e por lançamento no extrato (spec 19); o trigger de consumo ignora aulas com `confirmation != "confirmed"` | P0 | CA08, CA09 |
| RNF08 | Fuso: horários mostrados no fuso do aluno (detectado pelo navegador) e guardados em UTC; o portal indica o fuso ("Times shown in São Paulo time") | P0 | CA17 |
| RNF09 | Functions na região `southamerica-east1`, `maxInstances: 10`, limite de 20 chamadas por minuto por aluno (proteção contra abuso) | P1 | |

### Dependências técnicas

- Spec 03 (portal do aluno, `portalUid`), 17 (aluno 1:1, `private/profile.meetingUrl`), 18 (`lessons`, horário fixo), 19 (saldo, extrato e política de 24 h).
- Cloud Functions (spec 00), `firestore.rules`, `firestore.indexes.json`, testes no emulador (rules + Functions).

### Recursos necessários

- Mockup da tela "Book a lesson" (calendário de horários livres, mobile first), do cartão de proposta e do botão "Join lesson".
- Mockup da tela de disponibilidade do professor.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que defini disponibilidade seg–sex 18:00–22:00, intervalo de 10 min e antecedência mínima de 12 h, quando salvo, então esses horários passam a ser os únicos oferecidos aos alunos.
- [ ] **CA02:** Dado "Ana" com 5 créditos e duração padrão de 60 min, quando abre "Book a lesson" e escolhe quarta 19:00, então a aula aparece na agenda dela e na minha como "Confirmed · booked by student", e o horário some para os outros alunos.
- [ ] **CA03:** Dado "Ana" com 2 créditos e 2 aulas futuras confirmadas, quando tenta agendar uma terceira, então vê "You have no lessons left — talk to your teacher" e o agendamento não é criado.
- [ ] **CA04:** Dado que "Bruno" exige aprovação, quando ele agenda sexta 18:00, então a aula fica "Waiting for teacher" e o horário fica reservado; quando eu aprovo, ela vira "Confirmed"; quando recuso, o horário é liberado.
- [ ] **CA05:** Dado que propus a "Ana" uma aula sábado 10:00, quando ela abre o portal, então vê a proposta com "Accept" e "Decline"; e ao aceitar, a aula vira "Confirmed · accepted".
- [ ] **CA06:** Dado que propus a "Ana" a série "terças 19:00", quando ela aceita, então todas as terças futuras ficam confirmadas; e ela ainda pode recusar uma terça específica depois.
- [ ] **CA07:** Dado uma aula proposta e não aceita de "Ana" às 19:00 (online), quando ela toca em "Join lesson" às 18:55 e aceita o aviso, então a aula fica "Confirmed · joined", o Meet abre em nova aba e o crédito será consumido ao fim da aula.
- [ ] **CA08 (negativo):** Dado uma aula proposta por mim que "Ana" nunca aceitou nem entrou, quando o horário passa, então ela fica "Not confirmed", não consome crédito e não conta como falta.
- [ ] **CA09:** Dado uma aula confirmada de "Ana" em que ela não apareceu, quando marco "No-show", então 1 crédito é consumido (política da spec 19).
- [ ] **CA10:** Dado uma aula confirmada de "Ana" daqui a 30 h, quando ela cancela pelo portal, então não há custo; e numa aula daqui a 5 h ela vê "Cancelling now uses 1 credit" e, se confirmar, 1 crédito é consumido.
- [ ] **CA11:** Dado uma aula confirmada daqui a 48 h, quando "Ana" remarca para outro horário livre, então o horário antigo é liberado, o novo é reservado e nenhum crédito é consumido.
- [ ] **CA12:** Dado 1 agendamento novo, 1 pedido aguardando aprovação e 1 proposta não aceita, quando abro o dashboard, então vejo as 3 pendências com o tipo de cada uma.
- [ ] **CA13:** Dado uma proposta para "Ana" com WhatsApp cadastrado, quando clico em "Share via WhatsApp", então abre o WhatsApp com a mensagem e o link do portal.
- [ ] **CA14:** Dado uma aula presencial de "Bruno" que ele não aceitou no portal, quando marco "Student confirmed in person" durante a aula, então ela fica "Confirmed · in person" e passa a consumir crédito ao ser concluída.
- [ ] **CA15 (negativo):** Dado "Ana" logada no portal, quando tenta escrever direto em `users/{uid}/lessons` pelo SDK ou ler os nomes dos outros alunos nos horários, então recebe `permission-denied` e `getAvailableSlots` devolve só horários.
- [ ] **CA16 (limite):** Dado que "Ana" e "Bruno" tentam reservar quarta 19:00 ao mesmo tempo, quando as duas chamadas chegam, então só uma é confirmada e a outra recebe "This time was just taken".
- [ ] **CA17 (limite):** Dado "Ana" com o navegador em Lisboa e o professor em São Paulo, quando ela vê os horários, então eles aparecem no horário de Lisboa com a indicação do fuso, e a aula fica gravada no horário certo para os dois.

## O que a atividade não inclui

- Pagamento online no momento de agendar: motivo: a spec 19 é só controle; cobrança fica fora do escopo.
- Agendamento por pessoas que ainda não são alunos (aula experimental pública): motivo: outra iniciativa (página pública e cadastro de leads).
- Lembretes automáticos por e-mail/WhatsApp: motivo: mensagens automáticas adiadas (spec 00); o compartilhamento manual (RF11) cobre o caso.
- Sincronização com Google Calendar: motivo: complexo demais agora (ver P2 da spec 18).

### Considerado para o futuro (P2)

- Aula experimental: link público de agendamento para novos alunos.
- Lista de espera para horários concorridos.
- Lembrete push/e-mail X horas antes da aula e quando uma proposta está pendente.
- Durações diferentes escolhidas pelo aluno (30/60/90 min consumindo 0,5/1/1,5 crédito).

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Agendamentos do aluno são confirmados automaticamente por padrão, ou o padrão é aprovação do professor? | PO | Não | Sugestão: automático |
| D02 | Uma proposta não respondida bloqueia o horário para outros alunos? Por quanto tempo? | PO | Sim | Sugestão: bloqueia até 24 h antes da aula; depois, o horário volta a ficar livre (a proposta continua valendo se o aluno entrar) |
| D03 | Antecedência mínima para o aluno agendar: 12 h está bom? | PO | Não | |
| D04 | Aluno sem portal (só WhatsApp) pode aceitar a proposta por um link sem login, como o homework? | PO | Não | Sugestão: não na v1; o professor usa "Student confirmed in person"/ajuste manual |
| D05 | Ao agendar, o crédito fica "reservado" (some do saldo disponível) e só é consumido ao fim da aula. Correto? | PO | Não | Sugestão: sim |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Cálculo de horários livres | unit | CA01 | `computeSlots(availability, lessons, blocks, now)` | Janelas, intervalo, antecedência e horizonte respeitados |
| CT02 | Aluno agenda | e2e (emulador) | CA02 | Portal → Book → quarta 19:00 | Aula confirmada nos dois lados |
| CT03 | Sem crédito disponível | integração (Functions) | CA03 | Saldo 2, 2 futuras | Erro e nada criado |
| CT04 | Aprovação do professor | e2e | CA04 | Agendar, aprovar, recusar | Status e horário corretos |
| CT05 | Aceitar proposta | e2e | CA05 | Propor → Accept | `confirmedVia: accept` |
| CT06 | Série | integração | CA06 | Aceitar série, recusar 1 | Demais confirmadas |
| CT07 | Entrar confirma | e2e (relógio fixo) | CA07 | Join 5 min antes | `confirmedVia: join`, link aberto |
| CT08 | Proposta expirada | integração (Functions) | CA08 | Passar o horário sem resposta | `expired`, sem lançamento |
| CT09 | Falta confirmada | integração | CA09 | No-show em aula confirmada | Lançamento −1 |
| CT10 | Cancelamento 30 h / 5 h | unit + integração | CA10 | Duas antecedências | Sem custo / −1 |
| CT11 | Remarcar | integração | CA11 | 48 h antes | Troca de trava, sem custo |
| CT12 | Pendências | e2e | CA12 | 3 tipos | Listadas |
| CT13 | WhatsApp | unit | CA13 | Montar URL `wa.me` | Mensagem e link |
| CT14 | Presencial | e2e | CA14 | Marcar in person | `confirmedVia: teacher-in-person` |
| CT15 | Regras e privacidade | integração (rules + Functions) | CA15 | Escrita direta; ler slots | `permission-denied`; só horários |
| CT16 | Concorrência | integração (Functions) | CA16 | 2 `bookLesson` em paralelo | 1 sucesso, 1 "just taken" |
| CT17 | Fuso | unit | CA17 | Lisboa × São Paulo | Conversão correta |

## URL Complementar

- Documentação técnica: `SDD/2026-10-05_17-alunos-individuais-e-aula-1a1.md`; `SDD/2026-10-05_18-agenda-de-aulas-individuais.md`; `SDD/2026-10-05_19-pacotes-creditos-e-pagamentos.md`; `SDD/DONE/2026-10-03_03-portal-do-aluno.md`.
- Protótipo / mockup:
- Discussões relacionadas: decisão do PO em 2026-10-05 (D06 da spec 19).
- Referências de design: Calendly, Preply, italki (agendamento por créditos).
- Requisitos originais:
- Issue / PR relacionado:
