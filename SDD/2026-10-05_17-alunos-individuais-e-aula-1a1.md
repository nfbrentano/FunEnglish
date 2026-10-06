# [FEAT] Alunos individuais e aula 1:1

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-05 · **Atualizada em:** 2026-10-05
> **Ordem de implementação:** 17 · **Depende de:** 01, 02, 03, 04, 08, 09, 10 · **Prioridade:** antes das specs 12–16 (todas as aulas do professor são 1:1)
> **Specs relacionadas:** 18 (agenda), 19 (pacotes e pagamentos)

## Detalhes da Atividade

- **O que precisa ser feito:** Fazer do **aluno** o centro do dashboard, ao lado das turmas: uma seção "My students" para cadastrar e acompanhar cada aluno individualmente (nível, objetivo, interesses, contato, link da reunião, modalidade) e **começar uma aula 1:1 direto pelo aluno**, sem precisar criar uma turma. A página do aluno passa a ser o painel de acompanhamento, com o histórico de aulas e o resumo de cada uma.
- **Problema e evidência:** Hoje tudo é organizado por turma. `students/{id}` só tem `name`, `email` e `classIds`; a sessão (`ClassroomSession`) exige `classId` e `className`, e a barra lateral filtra os alunos por `classIds.includes(classId)`. Para dar uma aula individual, o professor precisa criar uma "turma" com um único aluno para cada pessoa. Todas as aulas do professor são 1:1.
- **Impacto de não fazer:** Trabalho duplicado (uma turma falsa por aluno), telas com conceitos de grupo (presença, sorteador) que não fazem sentido na aula individual, e nenhum lugar para guardar o perfil pedagógico do aluno.
- **Para quem é destinado:** Professor particular de ESL com aulas individuais, online ou presenciais.
- **História de usuário:** Como professor particular, quero cadastrar cada aluno com seu nível, objetivo e interesses e começar a aula dele com um clique, para dar aulas 1:1 personalizadas e acompanhar a evolução de cada um.
- **Como saberemos que deu certo:** Cadastrar um aluno com perfil completo em < 1 minuto; começar a aula de um aluno em **1 clique** a partir de "My students"; 0 turmas criadas só para dar aula a um aluno.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Seção "My students" no dashboard, **ao lado** de "My classes" (as duas continuam): cartões com nome, nível, objetivo, data da última aula e botão "Start lesson" | P0 | CA01 |
| RF02 | Cadastro de aluno sem turma (turma vira opcional): nome (obrigatório), nível CEFR (A1–C2), objetivo (Travel, Work, Exam, Conversation, School, Other + texto livre até 200), interesses (tags, até 10), modalidade padrão (Online / In person), data de início | P0 | CA02 |
| RF03 | Dados de contato e logística, **visíveis só ao professor**: WhatsApp/telefone, e-mail, link fixo da reunião (Meet/Zoom/Teams), endereço/local para aulas presenciais, observações privadas (até 1.000) | P0 | CA03, CA10 |
| RF04 | Status do aluno: Active, Paused, Former. "My students" mostra os ativos por padrão, com filtro para os outros; busca por nome | P1 | CA04 |
| RF05 | "Start lesson" pelo aluno cria uma sessão 1:1 (`studentId`, sem `classId`); a barra lateral mostra o modo 1:1: sem presença e sem sorteador, com notas, vocabulário, lousa, cronômetro e atividades | P0 | CA05 |
| RF06 | Modalidade escolhida ao iniciar (padrão do aluno): **Online** mostra "Open meeting" com o link salvo e o atalho para a sala ao vivo 1:1 (o aluno joga no próprio aparelho, spec 09); **In person** esconde esses botões | P0 | CA06 |
| RF07 | Página do aluno como painel: cabeçalho com perfil (nível, objetivo, interesses, status, "Start lesson", "Open meeting", "WhatsApp"); abas: Overview, Lessons, Notes, Vocabulary, Homework, Tracks | P0 | CA07 |
| RF08 | Aba "Lessons": histórico de aulas 1:1 do aluno (data, duração, modalidade, atividades, palavras novas, notas) com o resumo de cada aula; abrir uma aula mostra o resumo completo | P0 | CA08 |
| RF09 | Resumo da aula ao encerrar: campo "Lesson summary" (até 2.000), "Next lesson focus" (até 300) e opção de compartilhar o resumo com o aluno no portal | P0 | CA09 |
| RF10 | Overview: próxima aula (spec 18), aulas restantes no pacote (spec 19), "Next lesson focus" da última aula, erros recorrentes abertos e homework pendente | P1 | CA11 |
| RF11 | Sugestão de atividades na página do aluno: catálogo filtrado pelo nível do aluno e ordenado pelos interesses (tags → categoria/tópico) | P1 | CA12 |
| RF12 | Ações que hoje pedem uma turma (enviar homework, atribuir trilha) passam a aceitar um aluno individual direto | P0 | CA13 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | `students/{id}` ganha campos **não sensíveis** (o aluno lê pelo portal): `level?`, `goal?`, `goalNote?`, `interests[]`, `defaultMode: "online" \| "in-person"`, `status`, `startedAt?`, `lastLessonAt?`. `classIds` pode ficar vazio | P0 | CA02 |
| RNF02 | Dados sensíveis em `students/{id}/private/profile` `{ phone?, meetingUrl?, address?, privateNotes? }`, legíveis e graváveis **só** pelo `teacherUid` (o `portalUid` não lê) | P0 | CA10 |
| RNF03 | `ClassroomSession`: `classId` e `className` opcionais; novos campos `kind: "class" \| "one-to-one"`, `studentId?`, `studentName?`, `mode: "online" \| "in-person"`, `summary?`, `nextFocus?`, `summaryShared`. Sessões antigas sem `kind` são lidas como `"class"` (sem migração) | P0 | CA05, CA14 |
| RNF04 | Regras do Firestore atualizadas: `hasOnly` dos campos novos com limites de tamanho (interests ≤ 10 × 30 caracteres, `meetingUrl` só `https://`); sessão 1:1 exige que o `studentId` pertença ao professor | P0 | CA10 |
| RNF05 | Índice `sessions` por `teacherUid + studentId + startedAt desc` para o histórico; paginação de 20 aulas | P0 | CA08 |
| RNF06 | Link da reunião abre em nova aba com `rel="noopener noreferrer"`; WhatsApp via `https://wa.me/<número>` com o número normalizado (E.164) | P1 | CA06 |
| RNF07 | Integrações existentes (notas, vocabulário, conclusão automática de trilha no `onSessionEnded`) funcionam com sessão 1:1 usando `studentId` no lugar da presença | P0 | CA14 |
| RNF08 | Nada de dados pessoais em URL ou analytics (mantém RNF04 da spec 01); página do aluno continua com `?id=` opaco e `noindex` | P0 | |

### Dependências técnicas

- Spec 01 (turmas e alunos): `src/lib/classes/*`, `src/components/dashboard/classes-section.tsx`, `student-profile-view.tsx`.
- Spec 08 (sessão de aula): `src/lib/session/*`, `src/components/session/classroom-sidebar.tsx`, `end-session-modal.tsx`.
- Spec 09 (sala ao vivo), 10 (homework), 11 (trilhas): aceitar `studentId` sem turma.
- Cloud Function `onSessionEnded` (trilhas) e `deleteStudent` (incluir a subcoleção `private`).
- `firestore.rules`, `firestore.indexes.json` e testes de regras.

### Recursos necessários

- Mockup de "My students", do formulário de aluno e da página do aluno com abas.
- Lista fechada de objetivos e sugestões de interesses (ex.: music, movies, tech, travel, sports, business, games).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que tenho 3 alunos ativos, quando abro o dashboard, então vejo "My students" com os 3 cartões (nome, nível, objetivo, última aula) e "My classes" continua disponível.
- [ ] **CA02:** Dado o formulário de novo aluno, quando cadastro "Ana" com nível B1, objetivo "Work", interesses "tech, music" e modalidade Online, sem escolher turma, então "Ana" aparece em "My students" com esses dados.
- [ ] **CA03:** Dado "Ana", quando salvo o WhatsApp, o link do Meet e uma observação privada, então eles aparecem na página dela com os botões "WhatsApp" e "Open meeting".
- [ ] **CA04:** Dado que mudei "Bruno" para Paused, quando abro "My students", então ele não aparece na lista padrão, mas aparece no filtro "Paused".
- [ ] **CA05:** Dado "Ana", quando clico em "Start lesson", então começa uma sessão 1:1 com o nome dela no topo da barra lateral, sem presença nem sorteador, e com notas, vocabulário, lousa, cronômetro e atividades.
- [ ] **CA06:** Dado uma aula 1:1 Online, quando abro a barra lateral, então vejo "Open meeting" (abre o link em nova aba) e "Invite to live room"; e numa aula In person esses botões não aparecem.
- [ ] **CA07:** Dado "Ana", quando abro a página dela, então vejo o cabeçalho com perfil e as abas Overview, Lessons, Notes, Vocabulary, Homework e Tracks.
- [ ] **CA08:** Dado que dei 3 aulas a "Ana", quando abro a aba Lessons, então vejo as 3, da mais recente para a mais antiga, com data, duração, modalidade e o começo do resumo; e clicar abre o resumo completo.
- [ ] **CA09:** Dado uma aula 1:1 em andamento, quando a encerro e preencho "Lesson summary" e "Next lesson focus" com "Share with student" marcado, então o resumo aparece no histórico e no portal de "Ana".
- [ ] **CA10 (negativo):** Dado "Ana" logada no portal, quando tenta ler `students/{id}/private/profile` pelo SDK, então recebe `permission-denied`; e o professor B também não consegue ler os dados de "Ana".
- [ ] **CA11:** Dado que a última aula de "Ana" teve "Next lesson focus: past simple questions", quando abro a Overview, então esse foco aparece em destaque junto com os erros recorrentes abertos.
- [ ] **CA12:** Dado "Ana" B1 com interesse "tech", quando abro "Suggested activities", então só vejo atividades compatíveis com B1, com as de tecnologia primeiro.
- [ ] **CA13:** Dado "Ana" sem turma, quando envio um homework ou atribuo uma trilha, então posso escolher "Ana" direto, sem selecionar turma.
- [ ] **CA14 (regressão):** Dado uma sessão antiga de turma gravada antes desta feature, quando abro o histórico da turma, então ela continua aparecendo e funcionando como antes.

## O que a atividade não inclui

- Agenda e horários recorrentes: motivo: spec 18.
- Pacotes de aulas, créditos e pagamentos: motivo: spec 19.
- Remover turmas: motivo: decisão do PO (2026-10-05) de manter "My students" e "My classes" lado a lado.
- Videochamada própria dentro do site: motivo: complexo demais; o Meet/Zoom já resolve.
- Foto do aluno: motivo: baixo impacto e dados pessoais (mantém a decisão da spec 01).

### Considerado para o futuro (P2)

- Teste de nivelamento para definir o nível inicial.
- Evolução do nível ao longo do tempo (histórico de mudanças de CEFR) no relatório da spec 16.
- Plano de aula por aluno (spec 12 com `studentId` no lugar de `classId`).
- Importar alunos via CSV.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O resumo da aula é compartilhado com o aluno por padrão ou só quando marcado? | PO | Não | Sugestão: desmarcado por padrão |
| D02 | Alunos já cadastrados em turmas aparecem em "My students" automaticamente? | PO | Não | Sugestão: sim, todos os alunos do professor aparecem; turma é só agrupamento |
| D03 | Interesses: lista fechada, tags livres ou ambos? | PO/design | Não | Sugestão: sugestões + tags livres |
| D04 | No modo 1:1 Online, a sala ao vivo abre automaticamente para o aluno ou só quando o professor convida? | PO | Não | Sugestão: só ao convidar |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Lista de alunos | e2e (emulador) | CA01 | 3 alunos ativos | 3 cartões + "My classes" visível |
| CT02 | Cadastro sem turma | e2e + rules | CA02 | Criar Ana com perfil, `classIds: []` | Doc criado e listado |
| CT03 | Dados privados | e2e | CA03 | Salvar WhatsApp, Meet, observação | Botões visíveis |
| CT04 | Status | unit + e2e | CA04 | Bruno Paused | Fora da lista padrão |
| CT05 | Aula 1:1 | e2e | CA05 | Start lesson | `kind: one-to-one`, barra lateral sem presença/sorteador |
| CT06 | Modalidade | e2e | CA06 | Online vs In person | Botões condicionais |
| CT07 | Página do aluno | e2e | CA07 | Abrir Ana | Cabeçalho + 6 abas |
| CT08 | Histórico | integração (índice) | CA08 | 3 sessões 1:1 | Ordem desc, paginação |
| CT09 | Resumo compartilhado | e2e | CA09 | Encerrar com resumo + share | Visível no portal |
| CT10 | Regras do perfil privado | integração (rules) | CA10 | Leitura pelo portal e pelo professor B | `permission-denied` |
| CT11 | Overview | unit | CA11 | Última sessão com `nextFocus` | Foco exibido |
| CT12 | Sugestões | unit | CA12 | Filtrar por nível, ordenar por interesse | Ordem esperada |
| CT13 | Homework/trilha sem turma | e2e | CA13 | Enviar para Ana | Destino aluno |
| CT14 | Regressão | integração | CA14 | Sessão sem `kind` | Lida como turma |

## URL Complementar

- Documentação técnica: `SDD/DONE/2026-10-03_01-turmas-e-alunos.md`; `SDD/DONE/2026-10-03_08-sessao-de-aula.md`; `SDD/DONE/2026-10-03_09-sala-ao-vivo.md`; `src/lib/classes/types.ts`; `src/lib/session/types.ts`.
- Protótipo / mockup:
- Discussões relacionadas: pedido do PO em 2026-10-05: "minhas aulas serão sempre 1:1, individualmente"; manter turmas e alunos lado a lado; aulas mistas (online e presencial).
- Referências de design:
- Requisitos originais:
- Issue / PR relacionado:
