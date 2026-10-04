# [FEAT] Turmas e alunos (roster do professor)

> **Status:** Concluído
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-03 · **Atualizada em:** 2026-10-04  
> **Ordem de implementação:** 01 (sequência 00 a 11) · **Depende de:** 00 (exclusão em cascata) · **Por quê nesta posição:** Base de dados (turmas, `students`, `portalUid`, `homeworkPin`) usada por todas as seguintes

## Detalhes da Atividade

- **O que precisa ser feito:** Permitir que o professor cadastre **turmas** e os **alunos** de cada turma no dashboard. É a base de dados de todas as features de aula ao vivo, acompanhamento e portal do aluno (sessão de aula, sorteador, notas, trilha, homework, portal e vocabulário).
- **Problema e evidência:** Hoje o site só tem "My lists", que são listas de **atividades** (`users/{uid}/lists`), e não de pessoas. Não existe uma entidade "aluno": sem ela não dá para sortear nomes, registrar erros de um aluno, medir progresso ou dar acesso a um portal.
- **Impacto de não fazer:** Nenhuma das features de acompanhamento individual pode ser construída; cada uma inventaria seu próprio cadastro de alunos, com dados duplicados.
- **Para quem é destinado:** Professor de ESL logado (aulas particulares e turmas pequenas, até 40 alunos).
- **História de usuário:** Como professor, quero cadastrar minhas turmas com os nomes dos alunos, para usar essa lista na aula e acompanhar cada aluno depois.
- **Como saberemos que deu certo:** Cadastrar uma turma com 10 alunos colando os nomes de uma vez em < 1 minuto; 0 leituras de dados de alunos de outro professor nos testes de regras.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Nova seção "My classes" no dashboard (`/dashboard#classes`) com as turmas do professor, cada uma com nome e contagem de alunos | P0 | CA01 |
| RF02 | Criar, renomear, arquivar e excluir turma. Nome de 1 a 60 caracteres | P0 | CA01, CA05 |
| RF03 | Adicionar alunos um a um (nome obrigatório, e-mail opcional) ou em lote, colando um nome por linha (até 40 por vez) | P0 | CA02 |
| RF04 | Editar e remover aluno; mover ou copiar um aluno para outra turma (um aluno pode estar em mais de uma turma) | P1 | CA03 |
| RF05 | Página do aluno (`/dashboard/student?id=…`) como ponto central onde notas, trilhas, homework e vocabulário serão exibidos pelas specs seguintes | P0 | CA04 |
| RF06 | Turma arquivada some da lista principal e fica em "Archived", sem perder dados | P1 | CA05 |
| RF07 | Excluir um aluno pede confirmação e informa que notas, vocabulário e progresso dele também serão excluídos. A exclusão das subcoleções é feita por uma Cloud Function (`deleteStudent`, exclusão recursiva), já que o cliente não apaga subcoleções de uma vez | P0 | CA06 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Modelo de dados: `users/{uid}/classes/{classId}` `{ name, studentIds[], archived, createdAt }` e coleção raiz `students/{studentId}` `{ teacherUid, name, email?, classIds[], portalUid?, homeworkPin, createdAt }`. O `homeworkPin` (4 dígitos gerados na criação, guardado como hash; o professor vê o PIN ao gerar e pode gerar de novo) já entra aqui para evitar migração quando o homework for implementado. Os alunos ficam na raiz porque o portal do aluno também precisará ler esses dados | P0 | CA07 |
| RNF02 | Regras do Firestore: só o `teacherUid` lê e escreve em `students/{id}` e nas subcoleções. O acesso do aluno é aberto pela spec do portal | P0 | CA07 |
| RNF03 | Limites: 100 turmas e 500 alunos por professor; 60 alunos por turma | P1 | |
| RNF04 | Dados de alunos (nome, e-mail) não aparecem em URL, analytics nem logs; a página do aluno usa o `id` opaco | P0 | |
| RNF05 | Rotas com `?id=` (exportação estática não tem rotas dinâmicas sem `generateStaticParams`) e `noindex` | P0 | |

### Dependências técnicas

- [FEAT] Autenticação e [FEAT] Dashboard do professor (concluídas).
- Atualização de `firestore.rules` e `firestore.indexes.json` (índice `students` por `teacherUid` + `classIds` array-contains).

### Recursos necessários

- Mockup da seção "My classes" e da página do aluno.
- Textos de UI em inglês em `src/lib/strings.ts`.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que estou logado e sem turmas, quando crio a turma "Teens B1", então ela aparece em "My classes" com "0 students".
- [x] **CA02:** Dado a turma "Teens B1", quando colo 10 nomes, um por linha, e confirmo, então a turma passa a mostrar "10 students" e as linhas em branco são ignoradas.
- [x] **CA03:** Dado o aluno "Ana" em "Teens B1", quando o copio para "Conversation Club", então ele aparece nas duas turmas e continua sendo o mesmo aluno, com o mesmo histórico.
- [x] **CA04:** Dado o aluno "Ana", quando clico no nome dele, então abro a página do aluno com nome, turmas e as seções vazias de notas, trilhas, homework e vocabulário.
- [x] **CA05:** Dado uma turma arquivada, quando abro "My classes", então ela não aparece na lista principal, mas aparece em "Archived" e pode ser restaurada.
- [x] **CA06 (limite):** Dado que tento excluir um aluno, quando o modal de confirmação aparece, então ele avisa que os dados vinculados também serão excluídos, e nada é apagado se eu cancelar.
- [x] **CA07 (negativo):** Dado que o professor B está logado, quando tenta ler `students/{id}` de um aluno do professor A (pelo SDK ou pela URL), então a leitura é negada e nenhum dado aparece.

## O que a atividade não inclui

- Login ou conta do aluno: motivo: outra iniciativa ([FEAT] Portal do aluno).
- Importação de CSV ou Google Classroom: motivo: prematuro; colar uma lista de nomes cobre o caso principal.
- Escolas ou turmas com mais de um professor: motivo: sem plano de equipe na v1.
- Foto ou avatar do aluno: motivo: baixo impacto e envolve dados pessoais de menores.

### Considerado para o futuro (P2)

- Coprofessor (campo `teacherUids[]` em vez de `teacherUid`): o modelo não deve impedir.
- Importação via CSV.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | "My classes" fica no dashboard atual ou ganha uma rota própria (`/classes`)? | Design | Não | Integrado no dashboard atual em `/dashboard#classes` com navegação direta, e página dedicada do aluno em `/dashboard/student?id=...` |
| D02 | Precisamos de consentimento dos responsáveis para cadastrar alunos menores (LGPD)? A política de privacidade precisa mudar? | PO | Não | Ignorar por enquanto (2026-10-03) |
| D03 | Excluir a conta do professor exclui também os alunos? | PO | Não | Sim, exclusão em cascata das turmas e alunos do professor via Cloud Function `deleteStudent` |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Criar turma | e2e (emulador) | CA01 | Criar "Teens B1" | Card com "0 students" |
| CT02 | Colagem em lote | unit + e2e | CA02 | Colar 10 nomes com linhas vazias e espaços | 10 alunos com nomes sem espaços sobrando |
| CT03 | Aluno em duas turmas | integração | CA03 | Copiar aluno | `classIds` com 2 ids; 1 único doc `students` |
| CT04 | Página do aluno | e2e | CA04 | Clicar no nome | Página com seções vazias |
| CT05 | Arquivar e restaurar | e2e | CA05 | Arquivar e depois restaurar | Some e volta para a lista |
| CT06 | Excluir com aviso | e2e | CA06 | Excluir e cancelar; excluir e confirmar | Nada é apagado / aluno e subcoleções apagados |
| CT07 | Isolamento entre professores | integração (rules, `test:emulator`) | CA07 | Ler aluno de outro professor | `permission-denied` |

## URL Complementar

- Documentação técnica: `firestore.rules`; spec `SDD/DONE/2026-09-30_dashboard-do-professor.md`.
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: N/A.
- Requisitos originais: Ideias de "Acompanhamento Individual do Aluno" e "Classroom Session" (2026-10-03).
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
