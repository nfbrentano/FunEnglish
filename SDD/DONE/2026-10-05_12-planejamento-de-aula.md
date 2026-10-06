# [FEAT] Planejamento de aula (Lesson Plan)

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-05 · **Atualizada em:** 2026-10-06
> **Ordem de implementação:** 12 (ordem nova: 2ª das pendentes, depois da 15) · **Depende de:** 01, 08, 17, 18 · **Por quê nesta posição:** Já foi começada com o modelo só de turmas (tipo `Plan`, regra de `plans` e `planId`/`planItems` na sessão, commit ee48f6f); precisa ser corrigida antes que outros módulos dependam dela
>
> **Atualização 2026-10-06:** revisada depois das specs 17–20. O plano passa a ser de um **aluno** (aula 1:1, caso principal) **ou** de uma turma, e pode se ligar a uma aula da agenda (`Lesson`, spec 18), de onde vem a duração. O modelo e a regra já commitados exigem `classId` e precisam mudar (RNF01, RNF03, RNF06).

## Detalhes da Atividade

- **O que precisa ser feito:** Permitir que o professor prepare a aula com antecedência: um **plano** para um aluno (aula 1:1) ou uma turma, ligado de preferência a uma aula da agenda (spec 18), com objetivo, fila ordenada de atividades do catálogo (com tempo estimado de cada uma) e vocabulário-alvo. Ao começar a aula, a sessão já abre com essa fila, e o professor avança item a item com um clique.
- **Problema e evidência:** Hoje a sessão (spec 08, e a 1:1 da spec 17) começa vazia. O professor busca cada atividade no catálogo durante a aula, com os alunos esperando. A spec 08 já listava "Planejamento de aula: a sessão já começa com uma fila de atividades escolhidas" como P2. Parte do modelo já existe (`src/lib/plans/types.ts`, regra `users/{uid}/plans` e `planId`/`planItems` em `ClassroomSession`), mas só aceita turma (`classId` obrigatório).
- **Impacto de não fazer:** Tempo morto em aula, sobretudo em aulas online; o professor continua usando caderno ou planilha para planejar, fora do produto.
- **Para quem é destinado:** Professor de ESL (aulas particulares e turmas pequenas).
- **História de usuário:** Como professor, quero montar a sequência da aula antes de ela começar, para conduzir a aula sem procurar atividades na frente dos alunos.
- **Como saberemos que deu certo:** Abrir a próxima atividade do plano durante a aula em **1 clique**; montar um plano de 4 atividades em < 2 minutos; ≥ 50% das sessões dos professores ativos começam a partir de um plano após 1 mês.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | CRUD de plano: destino (**aluno ou turma**), aula agendada opcional (`Lesson` da spec 18; sem aula, data/hora opcional), título (1–80 caracteres), objetivo opcional (até 300), 1 a 15 itens | P0 | CA01 |
| RF02 | Item do plano: atividade do catálogo **ou** bloco livre ("Warm-up conversation", "Board explanation") com título e minutos estimados (1–60) | P0 | CA01 |
| RF03 | Reordenar itens com arrastar e soltar e com botões subir/descer (acessível); soma do tempo estimado mostrada e alerta quando passa da duração da aula (`Lesson.durationMin`; sem aula vinculada, `durationMin` digitado no plano) | P1 | CA02 |
| RF04 | Vocabulário-alvo do plano (até 30 palavras) que pré-preenche o gerenciador de vocabulário da sessão (spec 04/08) | P1 | CA05 |
| RF05 | "Start lesson from plan" (aluno, sessão `one-to-one`) e "Start class from plan" (turma): criam a sessão com a fila; a barra lateral mostra item atual, próximo e "Next ▶". Ao iniciar uma aula agendada que tem plano vinculado, o plano abre junto | P0 | CA03, CA09 |
| RF06 | Itens tocados na sessão são marcados como feitos e entram em `activitiesPlayed`; itens não feitos aparecem no resumo de encerramento com "Move to next plan" | P1 | CA04 |
| RF07 | Duplicar plano ("Duplicate for another student or class") e criar plano a partir de uma trilha (spec 11) ou de uma lista de favoritos | P1 | CA06 |
| RF08 | Seção "Upcoming plans" com os próximos planos por data: na página do aluno (aba Overview, junto da próxima aula, spec 17 RF10) e na página da turma | P1 | CA07, CA09 |
| RF09 | Plano novo para um aluno já vem com o objetivo pré-preenchido pelo "Next lesson focus" da última aula (spec 17 RF09) e sugere palavras do banco de vocabulário dele ainda não aprendidas | P1 | CA10 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Modelo: `users/{uid}/plans/{planId}` `{ targetType: "student" \| "class", studentId?, classId?, lessonId?, title, goal?, scheduledFor?, durationMin?, items: [{ kind: "activity" \| "block", activityId?, title, minutes }], words[], status: "draft" \| "used", sessionId?, updatedAt }`; exatamente um entre `studentId` e `classId`. Ajustar `src/lib/plans/types.ts` (hoje `classId` obrigatório) | P0 | CA09 |
| RNF02 | A sessão guarda `planId` e uma cópia dos itens (`planItems`), para que editar o plano depois não altere o histórico da aula | P0 | CA04 |
| RNF03 | Regras: só o dono lê e escreve seus planos; validação de tamanho (≤ 15 itens, ≤ 30 palavras); `studentId`/`classId` do próprio professor. A regra atual em `firestore.rules` exige `classId` (`hasAll(["classId", ...])`) e precisa mudar | P0 | CA08 |
| RNF04 | Títulos e capas das atividades vêm do `catalog/index` (sem 1 leitura por item) | P0 | |
| RNF05 | Abrir a próxima atividade em < 1 s após o clique (chunk do player pré-carregado com `use-preload`) | P1 | |
| RNF06 | Planos gravados com o modelo antigo (só `classId`, sem `targetType`) continuam válidos e são lidos como `targetType: "class"`, sem migração | P0 | CA08 |

### Dependências técnicas

- [FEAT] Turmas e alunos (spec 01) e Sessão de aula (spec 08): `src/lib/session/*`, `src/components/session/classroom-sidebar.tsx`.
- [FEAT] Alunos individuais e aula 1:1 (spec 17): sessão `one-to-one`, "Next lesson focus", Overview da página do aluno.
- [FEAT] Agenda de aulas (spec 18): `src/lib/schedule/*` (`Lesson`, `durationMin`).
- Modelo parcial já existente: `src/lib/plans/types.ts` e o bloco `plans` em `firestore.rules`.
- `src/lib/catalog/use-catalog-index.ts`, `src/lib/favorites`, `src/lib/tracks` (RF07).
- Testes de regras com `@firebase/rules-unit-testing`.

### Recursos necessários

- Mockup do editor de plano (com escolha de aluno ou turma e de aula agendada) e da barra lateral com "Now / Next".

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado a turma "Teens B1", quando crio o plano "Food & drinks" com 3 atividades e o bloco "Warm-up (5 min)", então o plano aparece em "Upcoming plans" com 4 itens e tempo total calculado.
- [x] **CA02:** Dado um plano de 60 min ligado a uma aula de 50 min, quando abro o plano, então vejo o aviso "Plan is 10 min longer than the lesson".
- [x] **CA03:** Dado um plano salvo, quando clico em "Start class from plan", então a sessão começa com o item 1 em destaque e "Next ▶" abre o item 2 em 1 clique.
- [x] **CA04:** Dado que fiz 3 de 4 itens, quando encerro a aula, então o resumo lista o item restante com a opção "Move to next plan", e editar o plano depois não altera a sessão encerrada.
- [x] **CA05:** Dado um plano com 5 palavras-alvo, quando inicio a aula, então as 5 palavras já aparecem no gerenciador de vocabulário da sessão, para confirmar ou remover.
- [x] **CA06:** Dado a trilha "Travel" com 5 passos, quando escolho "Create plan from track", então o plano é criado com as 5 atividades na mesma ordem.
- [x] **CA07:** Dado dois planos com datas futuras, quando abro a turma, então eles aparecem por data, e um plano já usado não aparece em "Upcoming".
- [x] **CA08 (negativo):** Dado o professor B, quando tenta ler ou editar um plano do professor A pelo SDK, então recebe `permission-denied`; um plano com 16 itens é recusado; um plano sem aluno nem turma é recusado; e um plano antigo só com `classId` continua abrindo.
- [x] **CA09:** Dado a aluna "Ana" com aula agendada amanhã às 19h (50 min), quando crio um plano para essa aula, então ele aparece na Overview de Ana junto da próxima aula, e "Start lesson" abre a sessão 1:1 com a fila do plano.
- [x] **CA10:** Dado que a última aula de "Ana" terminou com "Next lesson focus: past simple questions", quando crio um plano novo para ela, então o objetivo já vem com esse texto, para editar.

## O que a atividade não inclui

- Calendário completo com recorrência e integração com Google Calendar: motivo: complexo demais agora; a data simples basta para ordenar.
- Plano gerado por IA a partir do tema: motivo: outra iniciativa (depende de backend de IA com orçamento).
- Compartilhar planos entre professores: motivo: prematuro, ainda não há multi-professor.

### Considerado para o futuro (P2)

- Sugerir o próximo plano a partir dos erros recorrentes do aluno (spec 02) e dos passos pendentes da trilha (spec 11).
- Modelos de plano reutilizáveis ("Lesson template: PPP").
- Exportar o plano em PDF para impressão.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | A turma tem "duração padrão" hoje? Se não, o aviso de RF03 usa um valor digitado no plano? | dev | Não | Resolvida (2026-10-06): a duração vem de `Lesson.durationMin` (spec 18); sem aula vinculada, campo `durationMin` no plano |
| D02 | Um plano pode ser usado mais de uma vez (ex.: repetir a aula)? | PO | Não | Sugestão: sim, via "Duplicate" |
| D03 | Plano sem turma (aula avulsa) é permitido? | PO | Não | Resolvida (2026-10-06): plano por aluno (spec 17) é o caso principal; plano sem aluno nem turma não |
| D04 | Um plano ligado a uma aula que foi cancelada ou remarcada (spec 18/20) acompanha a aula remarcada ou volta a rascunho? | PO | Não | Sugestão: acompanha a remarcação; no cancelamento volta a rascunho sem data |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Criar plano | e2e (emulador) | CA01 | Criar plano com 3 atividades + 1 bloco | Plano listado com 4 itens e total de minutos |
| CT02 | Soma de tempo | unit | CA02 | `sumMinutes(items)` vs duração | Aviso quando excede |
| CT03 | Iniciar a partir do plano | e2e | CA03 | Start → Next | Item 2 aberto em 1 clique |
| CT04 | Cópia imutável | integração | CA04 | Encerrar sessão, editar plano | `session.planItems` inalterado |
| CT05 | Vocabulário pré-preenchido | e2e | CA05 | Plano com 5 palavras → iniciar | 5 palavras no gerenciador |
| CT06 | A partir da trilha | unit + e2e | CA06 | Create plan from track | Mesma ordem |
| CT07 | Upcoming | unit | CA07 | Ordenar por `scheduledFor`, filtrar `used` | Ordem e filtro corretos |
| CT08 | Regras | integração (rules) | CA08 | Leitura cruzada; 16 itens; sem aluno nem turma; plano antigo | `permission-denied` / plano antigo lido |
| CT09 | Plano de aluno na agenda | e2e (emulador) | CA09 | Plano para a aula de Ana → Start lesson | Sessão 1:1 com a fila |
| CT10 | Foco pré-preenchido | unit | CA10 | `newPlanDefaults(lastSession)` | Objetivo = `nextFocus` |

## URL Complementar

- Documentação técnica: `SDD/DONE/2026-10-03_08-sessao-de-aula.md`; `SDD/DONE/2026-10-03_11-trilha-de-progresso.md`; `SDD/DONE/2026-10-05_17-alunos-individuais-e-aula-1a1.md`; `SDD/DONE/2026-10-05_18-agenda-de-aulas-individuais.md`.
- Protótipo / mockup:
- Discussões relacionadas: P2 "Planejamento de aula" da spec 08.
- Referências de design:
- Requisitos originais:
- Issue / PR relacionado:
