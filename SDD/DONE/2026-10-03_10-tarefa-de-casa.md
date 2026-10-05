# [FEAT] Envio de tarefas de casa (Homework Automation)

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-03 · **Atualizada em:** 2026-10-03  
> **Ordem de implementação:** 10 (sequência 00 a 11) · **Depende de:** 00, 01, 03 · **Por quê nesta posição:** As submissões alimentam a conclusão automática da spec 11

## Detalhes da Atividade

- **O que precisa ser feito:** Adicionar o botão "Send as homework" nas atividades. Ele gera um **link direto e simplificado** para o aluno resolver a atividade sozinho. Ao terminar, o resultado (acertos, total e tempo) fica salvo no painel do professor.
- **Problema e evidência:** O compartilhamento atual (`?mode=student`) só abre a atividade: o professor não sabe quem fez nem quanto acertou. Além disso, desde a spec "login obrigatório para atividades", o `/play` exige login, o que impede o aluno sem conta de abrir o link.
- **Impacto de não fazer:** O professor não consegue passar lição de casa pelo site nem acompanhar a prática fora da aula, e a trilha de progresso não tem conclusão automática.
- **Para quem é destinado:** Professor (cria e acompanha) e aluno (resolve, com ou sem conta no portal).
- **História de usuário:** Como professor, quero enviar uma atividade como tarefa e ver quem fez e quanto acertou, para acompanhar a prática fora da aula sem corrigir nada manualmente.
- **Como saberemos que deu certo:** Da atividade ao link copiado em ≤ 3 cliques; o resultado aparece no painel em < 5 s após o envio; o aluno chega ao resultado sem criar conta.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Botão "Send as homework" no player (intro) e no card de atividade do dashboard. Abre um modal para escolher o destino (turma, alunos ou "anyone with the link"), o prazo opcional e a instrução opcional (até 300 caracteres) | P0 | CA01 |
| RF02 | Gera o documento `homework/{homeworkId}` (id aleatório de 20 caracteres). Para destino turma ou alunos, gera também um **link individual por aluno** `/homework?h={homeworkId}&s={studentToken}`, em que `studentToken` é um hash aleatório (≥ 22 caracteres, 128 bits) que identifica o aluno indicado. O modal lista os links individuais (Copy por aluno, "Copy all" no formato `Nome: link`) e oferece o **link da turma** `/homework?h={homeworkId}`. Botões Copy, QR code (reaproveitando `qrcode`) e "Share via WhatsApp" | P0 | CA01 |
| RF03 | Página `/homework`: mostra o título, a instrução do professor e o prazo. **Link individual** (`&s=`): o aluno é reconhecido pelo hash ("Hi, Ana!"), sem escolher nome nem digitar PIN. **Link da turma**: o aluno escolhe o nome na lista e digita o **PIN de 4 dígitos** dele. **"Anyone"**: o aluno digita o nome. Depois disso, joga a atividade no modo aluno, sem a navegação do site | P0 | CA02, CA11 |
| RF04 | O link de homework funciona **sem login**: é uma exceção aprovada à spec de login obrigatório, e a rota `/homework` fica fora do `RequireAuth`. Se o aluno estiver logado no portal, a identificação é automática | P0 | CA02, CA03 |
| RF05 | Ao terminar, envia uma submissão `{ studentId?, studentName, via: "token" \| "pin" \| "portal" \| "anonymous", portalUid?, correct, total, seconds, completedAt }` e mostra a tela de resultados com "Sent to your teacher ✓". O painel mostra a forma de identificação de cada envio | P0 | CA04 |
| RF11 | **PIN do aluno**: todo aluno cadastrado recebe um PIN de 4 dígitos gerado automaticamente, visível na página do aluno e na visão da turma ("Print PINs"), e o professor pode gerá-lo de novo. O PIN vale para todos os homeworks | P0 | CA11 |
| RF12 | O professor pode **regenerar o link individual** de um aluno (por exemplo, se ele vazou); o hash antigo deixa de funcionar | P1 | CA12 |
| RF06 | Painel "Homework" no dashboard: lista de tarefas com status (aberta, vencida, fechada), contagem "5/8 done" e, ao abrir, a tabela por aluno com nota, tempo, data e quem ainda não fez | P0 | CA05 |
| RF07 | Fechar a tarefa manualmente ou por prazo: após o prazo, a página mostra "This homework is closed" (o professor pode permitir envio atrasado, marcado como "Late") | P1 | CA06 |
| RF08 | Múltiplas tentativas: até 3 por aluno; o painel mostra a melhor e a última | P1 | CA07 |
| RF09 | A submissão alimenta a trilha de progresso (conclusão automática) e aparece na página do aluno | P1 | CA05 |
| RF10 | Atividades sem nota (`flashcards`, `prompt-cards`) registram só "Completed" e o tempo | P0 | CA08 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Envio **somente pela callable `submitHomework`** (Cloud Function, spec 00, com App Check). As regras do Firestore negam qualquer `create` direto em `submissions` pelo cliente. `homework/{id}` continua legível por quem tem o id (sem `list`) e editável só pelo `teacherUid`; as submissões são lidas só pelo professor | P0 | CA09 |
| RNF02 | A lista de nomes da turma exibida no link guarda só o primeiro nome e o `studentId`, copiados no doc de homework na criação (sem expor e-mails nem a coleção `students`) | P0 | CA09 |
| RNF07 | Hash individual: `homework/{id}/assignees/{studentToken}` `{ studentId, firstName }`, gerado com `crypto.randomBytes` (≥ 128 bits) pela Function que cria o homework, e **não derivado** do id do aluno. A página `/homework` resolve o hash por uma callable (`getHomeworkForStudent`) e a `submitHomework` confere que o token existe e corresponde ao aluno; a coleção `assignees` não é legível pelo cliente | P0 | CA02, CA12 |
| RNF08 | PIN: guardado em `students/{id}.homeworkPin` como hash (scrypt/bcrypt), conferido **só na Function** `submitHomework`/`verifyStudentPin`. O PIN nunca é enviado ao navegador do aluno nem gravado no doc de homework | P0 | CA11 |
| RNF09 | Proteção contra tentativa e erro do PIN: no máximo 5 tentativas erradas por aluno a cada 15 min (contador na Function); depois disso, "Too many attempts — ask your teacher" e o professor vê um aviso no painel | P0 | CA13 |
| RNF03 | Limites aplicados na Function: no máximo 3 submissões por `studentId` por homework e 200 por homework; rate limit por IP (spec 00, RNF04) | P0 | CA07 |
| RNF04 | **A nota é recalculada no servidor**: o cliente envia as respostas brutas (`answers[]`) e a Function corrige com o gabarito da atividade (mesma lógica do player, em módulo compartilhado). O `correct`/`total` enviado pelo cliente é ignorado | P0 | CA09 |
| RNF05 | Página `/homework` com `noindex`, funcional em celular (largura de 360 px) e com o mesmo motor de atividades (`src/components/player`) | P0 | |
| RNF06 | Rota estática com query param (exportação estática) | P0 | |

### Dependências técnicas

- [CHORE] Infraestrutura do plano Blaze (spec 00): Functions `createHomework`, `getHomeworkForStudent` e `submitHomework`; App Check.
- [FEAT] Turmas e alunos (destino turma ou alunos).
- Motor de atividades e modo aluno (`src/lib/student-mode.ts`, `src/components/player`), que precisa expor o resultado final (`ActivityResult`) para quem o hospeda.
- Ajuste em `RequireAuth` / `/play` ou player hospedado em `/homework` fora do guard (ver D01).
- `src/lib/share/share-url.ts` e a dependência `qrcode`.

### Recursos necessários

- Mockup do modal de envio, da página do aluno no celular e do painel de resultados.
- Decisão do PO sobre a exceção ao login obrigatório.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado a atividade "At the airport", quando clico em "Send as homework", escolho a turma "Teens B1" e o prazo 10/10, então recebo um link `/homework?h=…` com botões Copy e QR code.
- [ ] **CA02:** Dado o link individual de "Ana" (`&s=…`), quando ela o abre sem estar logada, então vê "Hi, Ana!", joga a atividade sem a navegação do site, sem pedido de login e sem PIN, e a submissão fica registrada como `via: "token"` para "Ana".
- [ ] **CA03:** Dado que "Ana" está logada no portal, quando abre o link, então ela não precisa escolher o nome e a submissão fica vinculada ao `portalUid` dela.
- [ ] **CA04:** Dado que "Ana" terminou com 7/10, quando a tela de resultados aparece, então mostra "7/10" e "Sent to your teacher ✓", e o documento de submissão é criado.
- [ ] **CA05:** Dado 5 de 8 alunos com envio, quando abro a tarefa no painel, então vejo "5/8 done", a nota e o tempo de cada um e os 3 nomes pendentes; e a página de cada aluno mostra a submissão.
- [ ] **CA06 (limite):** Dado uma tarefa com prazo vencido e sem envio atrasado, quando um aluno abre o link, então vê "This homework is closed" e não consegue jogar.
- [ ] **CA07 (limite):** Dado que "Ana" já enviou 3 vezes, quando tenta a quarta, então vê "You've used all 3 attempts" e nada é enviado.
- [ ] **CA08:** Dado um homework de flashcards, quando o aluno termina, então o painel mostra "Completed" e o tempo, sem nota.
- [ ] **CA09 (negativo):** Dado o link de uma tarefa, quando alguém tenta (pelo SDK) listar `homework`, ler as submissões, enviar `correct: 50, total: 10` ou ler `students/{id}`, então todas as operações são negadas.
- [ ] **CA10 (erro):** Dado um id inexistente, uma tarefa excluída ou um hash `s` que não existe, quando o aluno abre o link, então vê "This homework link is not valid" com instrução para falar com o professor.
- [ ] **CA11:** Dado o link da turma, quando "Bruno" escolhe "Ana" na lista e digita um PIN errado, então vê "Wrong PIN" e não consegue começar; e com o PIN correto de "Ana", a submissão fica registrada como `via: "pin"`.
- [ ] **CA13 (negativo):** Dado o link da turma, quando alguém erra o PIN de "Ana" 5 vezes em 15 minutos, então a sexta tentativa, mesmo com o PIN correto, é recusada com "Too many attempts — ask your teacher", e o professor vê o aviso no painel.
- [ ] **CA12 (negativo):** Dado que regenerei o link individual de "Ana", quando alguém abre o link antigo, então vê "This homework link is not valid"; e uma submissão enviada pelo SDK com o hash de "Ana" e o `studentId` de "Bruno" é negada.

## O que a atividade não inclui

- Correção manual de respostas abertas (writing): motivo: os tipos atuais têm resposta fechada ou nenhuma.
- Notificações por e-mail (a cada envio ou resumo diário ao professor): motivo: e-mail automático adiado (2026-10-03); o painel mostra os novos envios com um selo.

### Considerado para o futuro (P2)

- Usar o detalhe por questão (`answers[]`, já gravado pela RNF04) para alimentar automaticamente as notas de erro do aluno.
- Lembretes de prazo e resumo diário ao professor por e-mail (Function agendada), quando o e-mail automático for retomado.
- Homework com várias atividades (uma trilha curta).

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Aceitamos a exceção ao login obrigatório para links de homework (e de que forma: rota `/homework` fora do `RequireAuth`)? | PO | Não | Sim (2026-10-03). O link individual leva um hash na URL que identifica o aluno indicado (RF02, RNF07) |
| D02 | Para destino "turma", o aluno pode escolher o nome de outro colega (personificação)? Aceitável na v1 ou exigir um PIN de 4 dígitos por aluno? | PO | Não | Exigir PIN no link da turma (2026-10-03) (RF11, RNF08) |
| D04 | O PIN deve ser mostrado ao aluno em algum lugar (portal) ou só o professor o entrega? | PO | Não | Sugestão: só o professor entrega ("Print PINs") |
| D03 | Atividades de grupo (`quiz-board`, `prompt-cards`) podem virar homework? | PO | Não | Sugestão: permitir com o aviso que já existe em `isGroupActivity` |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Criar homework | e2e (emulador) | CA01 | Modal → turma → prazo | Doc criado e link exibido |
| CT02 | Link individual sem conta | e2e | CA02 | Abrir `&s=` deslogado | "Hi, Ana!", player sem login; `via: token` |
| CT03 | Aluno do portal | e2e | CA03 | Abrir logado como aluno | Sem seleção de nome; `portalUid` gravado |
| CT04 | Envio do resultado | e2e | CA04 | Terminar com 7/10 | Submissão criada e mensagem |
| CT05 | Painel | e2e | CA05 | 5 envios de 8 | "5/8 done" e pendentes |
| CT06 | Prazo | integração (rules + UI) | CA06 | `open:false` / prazo passado | Bloqueado |
| CT07 | Tentativas | integração | CA07 | 4ª tentativa | Bloqueada |
| CT08 | Sem nota | e2e | CA08 | Flashcards | "Completed" |
| CT09 | Regras | integração (rules) | CA09 | list, read submissions, payload inválido | `permission-denied` |
| CT10 | Link inválido | e2e | CA10 | `?h=xyz`; `&s=` inexistente | Mensagem de link inválido |
| CT11 | PIN | e2e + integração (rules) | CA11 | PIN errado e depois correto | Bloqueio / `via: pin` |
| CT13 | Bloqueio do PIN | integração (emulador de Functions) | CA13 | 6 tentativas | Sexta tentativa recusada e aviso ao professor |
| CT12 | Hash regenerado e forjado | integração (rules) | CA12 | Link antigo; hash de Ana com `studentId` de Bruno | Inválido / `permission-denied` |

## URL Complementar

- Documentação técnica: `SDD/DONE/2026-09-30_compartilhar-atividade.md`; `SDD/DONE/2026-10-02_login-obrigatorio-para-atividades.md`; `src/components/player/player-results.tsx`.
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: Wordwall / Baamboozle (assignments).
- Requisitos originais: "Envio de Tarefas de Casa (Homework Automation)" (ideias de 2026-10-03).
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
