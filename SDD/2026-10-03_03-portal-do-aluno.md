# [FEAT] Portal do aluno com feedbacks consolidados

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-03 · **Atualizada em:** 2026-10-03  
> **Ordem de implementação:** 03 (sequência 00 a 11) · **Depende de:** 00, 01, 02 · **Por quê nesta posição:** Cria o papel `student`, o convite e o layout; as specs seguintes só acrescentam blocos

## Detalhes da Atividade

- **O que precisa ser feito:** Criar uma área minimalista (`/student`) na qual o aluno faz login apenas para ver o que o professor preparou para ele: **feedbacks consolidados** (pontos fortes e o que revisar, a partir das notas compartilhadas), tarefas pendentes, progresso nas trilhas e o vocabulário pessoal (spec à parte). Inclui o fluxo de **convite**, que vincula a conta do aluno ao cadastro feito pelo professor.
- **Problema e evidência:** Hoje só existe o papel `teacher`: as regras do Firestore exigem `role == "teacher"` no cadastro. O aluno não tem onde ver o feedback; o professor manda resumos soltos pelo WhatsApp.
- **Impacto de não fazer:** As notas, as trilhas e o homework ficam só com o professor; o aluno não percebe a evolução, o que reduz o valor percebido da aula.
- **Para quem é destinado:** Aluno de ESL (adolescente ou adulto) convidado pelo professor; secundariamente, o professor que envia o convite.
- **História de usuário:** Como aluno, quero entrar e ver o que mandei bem, o que preciso revisar e minhas tarefas, para estudar entre as aulas sem depender de mensagens soltas.
- **Como saberemos que deu certo:** Do convite ao portal carregado em ≤ 2 minutos; 0 dados de outro aluno ou do professor legíveis nos testes de regras; portal carregado em < 1,5 s.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Na página do aluno, o professor clica em "Invite to student portal" e gera um código de convite (8 caracteres, sem caracteres ambíguos) e o link `/join?code=…`, com Copy e QR code. O convite vale por 14 dias e pode ser revogado | P0 | CA01 |
| RF02 | `/join`: o aluno cria uma conta (e-mail + senha ou Google, reaproveitando os formulários de auth) ou entra em uma existente, e então o convite é resgatado: `students/{id}.portalUid = auth.uid` e o perfil é criado com `role: "student"` | P0 | CA02 |
| RF03 | Uma conta de aluno pode estar vinculada a mais de um professor (vários convites); o portal mostra um seletor "Teacher" quando houver mais de um | P1 | CA08 |
| RF04 | Home do portal com 4 blocos: "Strengths" (notas `shared` da categoria `strength`), "To review" (notas `shared` de erro e não resolvidas, agrupadas por categoria), "Homework" (pendentes primeiro, com link) e "My progress" (trilhas com barra e percentual) | P0 | CA03 |
| RF05 | "Class history": lista das aulas, e cada uma abre o **resumo inteiro** gravado pela sessão (`students/{id}/classes/{sessionId}`: data, duração, atividades, palavras, texto da lousa e notas da turma) mais as notas compartilhadas do próprio aluno | P1 | CA04 |
| RF06 | Consolidação: cada erro recorrente aparece uma única vez com a contagem ("seen in 3 classes"); os resolvidos vão para "Mastered ✓" | P1 | CA05 |
| RF07 | Usuário `role: "student"` não acessa o dashboard do professor nem o painel admin. Ao logar, vai direto para `/student`; o catálogo e o player (para revisão) continuam acessíveis | P0 | CA06 |
| RF08 | O professor pode desvincular o aluno ("Remove portal access"): o aluno perde o acesso imediatamente | P0 | CA07 |
| RF09 | O resumo de cada aula chega por e-mail ao aluno com e-mail cadastrado (spec 08, RF13), com o link do portal. "Copy summary" continua disponível para WhatsApp | P1 | |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Regras de cadastro: permitir `role in ["teacher", "student"]` na criação de `users/{uid}`, mantendo a proibição de trocar o papel no update | P0 | CA06 |
| RNF02 | Resgate pela callable **`redeemInvite`** (Cloud Function, spec 00): confere o código, a validade e se o aluno ainda não tem `portalUid`; grava `portalUid`, cria o perfil `role: "student"` e apaga o convite numa transação. `invites/{code}` não é legível pelo cliente; o cliente não escreve `portalUid` | P0 | CA02, CA09 |
| RNF03 | Leitura pelo aluno: `students/{id}` (só campos não sensíveis), `notes` com `visibility == "shared"`, `tracks`, `vocabulary` e as tarefas destinadas a ele, sempre condicionadas a `resource.data.portalUid == request.auth.uid` (ou ao `portalUid` do doc pai via `get()`) | P0 | CA09 |
| RNF04 | Layout simples e mobile-first (360 px), sem a navegação do professor; textos em inglês simples (nível A2) | P0 | |
| RNF05 | `noindex`; nenhum dado do aluno em URL além de ids opacos | P0 | |
| RNF06 | LGPD (consentimento de responsáveis, atualização de privacidade e termos): adiado por decisão do PO (D01) | P2 | |

### Dependências técnicas

- [CHORE] Infraestrutura do plano Blaze (spec 00): callable `redeemInvite`, e-mail do convite (opcional: "Send invite by email").
- [FEAT] Turmas e alunos; [FEAT] Notas e erros do aluno.
- [FEAT] Trilha de progresso e [FEAT] Envio de tarefas de casa (blocos "My progress" e "Homework"; sem eles os blocos ficam ocultos).
- [FEAT] Banco de vocabulário do aluno (página própria dentro do portal).
- `src/components/auth` (formulários), `src/components/auth/require-auth.tsx` (precisa aceitar o papel exigido), `firestore.rules`.

### Recursos necessários

- Mockup do portal (celular e desktop) e da página `/join`.
- Texto jurídico atualizado (privacidade e termos): adiado (D01).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado a página de "Ana", quando clico em "Invite to student portal", então vejo um código de 8 caracteres, o link `/join?code=…`, o QR code e a validade "Expires in 14 days".
- [ ] **CA02:** Dado um convite válido, quando a aluna abre o link, cria a conta e confirma, então é levada a `/student`, o cadastro dela fica com `portalUid` preenchido e o convite deixa de funcionar.
- [ ] **CA03:** Dado que o professor tem 2 notas compartilhadas de Strength, 3 de erro compartilhadas e 1 privada sobre "Ana", quando ela abre o portal, então vê 2 em "Strengths", 3 em "To review" e nenhuma referência à privada.
- [ ] **CA04:** Dado 3 aulas encerradas com "Ana" presente, quando ela abre "Class history", então vê as 3 datas com as atividades e as notas e palavras de cada aula.
- [ ] **CA05:** Dado o erro "he go → he goes" em 3 aulas, com 1 registro marcado como resolvido, quando "Ana" abre o portal, então vê o erro uma vez com "seen in 3 classes"; quando todos estiverem resolvidos, ele vai para "Mastered ✓".
- [ ] **CA06 (negativo):** Dado que "Ana" (role `student`) está logada, quando acessa `/dashboard` ou `/admin`, então é redirecionada para `/student`; e quando tenta alterar o próprio `role` para `teacher`, a escrita é negada.
- [ ] **CA07:** Dado que o professor clicou em "Remove portal access", quando "Ana" recarrega o portal, então vê "You're not connected to a teacher yet" e não lê mais nenhum dado.
- [ ] **CA08:** Dado que "Ana" foi convidada por 2 professores, quando abre o portal, então vê o seletor "Teacher" e os dados de cada professor separados.
- [ ] **CA09 (negativo):** Dado que "Ana" está logada, quando tenta pelo SDK ler `students/{id}` de "Bruno", resgatar um convite expirado ou um convite de outro aluno, ou sobrescrever um `portalUid` já preenchido, então todas as operações são negadas.
- [ ] **CA10 (erro):** Dado um código inválido ou expirado, quando abro `/join?code=…`, então vejo "This invite is invalid or has expired. Ask your teacher for a new one."

## O que a atividade não inclui

- Chat entre aluno e professor: motivo: fora da proposta minimalista.
- Acesso dos pais ou responsáveis: motivo: prematuro; o aluno pode compartilhar a própria tela.
- O aluno criar conta sem convite: motivo: o portal só faz sentido vinculado a um professor.
- Gamificação no portal (pontos, streaks, badges): motivo: prematuro.

### Considerado para o futuro (P2)

- Acesso de responsáveis (somente leitura).
- Notificações push de novo feedback ou nova tarefa.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Idade mínima do aluno e consentimento de responsáveis (LGPD, art. 14)? | PO / jurídico | Não | Ignorar por enquanto (2026-10-03) |
| D02 | Rota `/student` ou `/my`? Nome visível: "Student portal" ou "My English"? | Design | Não | |
| D03 | Uma conta já existente com `role: "teacher"` pode também ser aluno (professor fazendo curso)? | PO | Não | Sugestão: não na v1; usar outra conta |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Gerar convite | e2e (emulador) | CA01 | Invite | Código, link, QR e validade |
| CT02 | Resgatar convite | e2e | CA02 | Cadastro via `/join` | `portalUid` gravado e convite removido |
| CT03 | Feedbacks consolidados | integração + e2e | CA03, CA05 | Notas variadas | Blocos corretos e privada ausente |
| CT04 | Histórico de aulas | e2e | CA04 | 3 sessões | 3 itens |
| CT05 | Bloqueio de rotas e papel | e2e + rules | CA06 | Acessar dashboard; trocar role | Redirect e `permission-denied` |
| CT06 | Revogar acesso | integração | CA07 | Remover `portalUid` | Leituras negadas |
| CT07 | Dois professores | e2e | CA08 | 2 convites | Seletor e dados separados |
| CT08 | Ataques às regras | integração (rules) | CA09 | 4 cenários | Todos negados |
| CT09 | Convite inválido | e2e | CA10 | Código errado / expirado | Mensagem |

## URL Complementar

- Documentação técnica: `firestore.rules`; `src/components/auth/require-auth.tsx`; `SDD/DONE/2026-09-30_autenticacao.md`.
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: Google Classroom (visão do aluno), em versão bem reduzida.
- Requisitos originais: "Central do Aluno (Student Portal)" e "Feedbacks Consolidados" (ideias de 2026-10-03).
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
