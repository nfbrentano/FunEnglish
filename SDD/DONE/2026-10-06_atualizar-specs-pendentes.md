# [DOCS] Atualizar specs pendentes para alunos individuais e aula 1:1

> **Status:** Concluída
> **Autor:** Natanael Brentano (com Claude) · **Revisor:** · **Criada em:** 2026-10-06 · **Atualizada em:** 2026-10-06

## Detalhes da Atividade

- **O que precisa ser feito:** Revisar as specs pendentes em `SDD/` e atualizar as que ainda assumem o modelo só de turmas, agora que existem alunos individuais, aula 1:1, agenda, pacotes e agendamento pelo aluno (specs 17–20, concluídas). Redefinir a ordem de implementação das pendentes.
- **Problema e evidência:** As specs 12–16 foram escritas em 2026-10-05, antes das 17–20, mas as 17–20 foram implementadas primeiro. As 12–16 falam em "turma", "presença" e "Start class" e não conhecem `studentId` sem turma, `Lesson` (agenda) nem créditos. A spec 12 já começou com o modelo antigo: `src/lib/plans/types.ts` e a regra de `plans` em `firestore.rules` exigem `classId`.
- **Impacto de não fazer:** Implementar as specs como estão gera planos, relatórios e análises que não servem para o caso principal (aula individual) e retrabalho no modelo de dados.
- **Para quem é destinado:** Dev/PO que vão implementar as specs pendentes.
- **História de usuário:** Como dev, quero specs pendentes coerentes com o modelo atual, para implementar sem redescobrir o que mudou.
- **Como saberemos que deu certo:** Cada spec pendente afetada cita as specs 17–20 onde se apoia e tem critérios de aceitação para aluno individual; a ordem nova está no cabeçalho de cada uma.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Spec 12 (planejamento): plano para aluno **ou** turma, ligado à aula da agenda; corrigir o modelo já commitado | P0 | CA01 |
| RF02 | Spec 16 (relatório): aulas/presença pela agenda no 1:1, resumos compartilhados, nível/objetivo, pacote opcional, privacidade do perfil privado | P0 | CA02 |
| RF03 | Spec 14 (análise por questão): homework para alunos individuais, sala 1:1, ligação com "Next lesson focus" | P0 | CA03 |
| RF04 | Spec 13 (revisão espaçada): local da visão do professor, dúvida de "nível kids" | P1 | CA04 |
| RF05 | Ordem nova das pendentes no cabeçalho: 15 → 12 → 14 → 13 → 16 | P0 | CA05 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Seguir o modelo `SDD/modelo_feature.md`; não remover seções; manter o histórico (nota "Atualização 2026-10-06" no topo de cada spec alterada) | P0 | CA01–CA04 |

### Dependências técnicas

- `SDD/DONE/2026-10-05_17-alunos-individuais-e-aula-1a1.md`, `..._18-agenda-de-aulas-individuais.md`, `..._19-pacotes-creditos-e-pagamentos.md`, `..._20-agendamento-pelo-aluno-e-confirmacao.md`.
- Código de referência: `src/lib/classes/types.ts`, `src/lib/schedule/types.ts`, `src/lib/homework/types.ts`, `src/lib/plans/types.ts`, `firestore.rules`.

### Recursos necessários

- N/A: só documentação.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado a spec 12, quando a leio, então o plano aceita `studentId` ou `classId`, liga-se a uma `Lesson` e lista o que precisa mudar no tipo e na regra já commitados.
- [x] **CA02:** Dado a spec 16, quando a leio, então "aulas e presença" de aluno individual vêm de `Lesson.status`, e o perfil privado e os créditos nunca vão para o link público por padrão.
- [x] **CA03:** Dado a spec 14, quando a leio, então há critério para homework de um aluno só e para a sala ao vivo 1:1.
- [x] **CA04:** Dado a spec 13, quando a leio, então a visão do professor aponta para a página do aluno com abas, e não há referência a "nível kids".
- [x] **CA05:** Dado as specs pendentes, quando abro o cabeçalho, então cada uma mostra a posição na ordem nova.

## O que a atividade não inclui

- Implementar qualquer uma das specs: motivo: outra atividade.
- Alterar as specs de conteúdo por IA e fila de imagens: motivo: não dependem do modelo de alunos.

### Considerado para o futuro (P2)

- N/A: atividade pontual de documentação.

## Dúvidas em aberto

N/A: as dúvidas de produto ficam registradas em cada spec atualizada.

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Revisão das specs | manual | CA01–CA05 | Ler as specs 12, 13, 14, 15 e 16 | Critérios acima atendidos |

## URL Complementar

- Documentação técnica: specs 17–20 em `SDD/DONE/`.
- Protótipo / mockup: N/A
- Discussões relacionadas: N/A
- Referências de design: N/A
- Requisitos originais: N/A
- Issue / PR relacionado: N/A
