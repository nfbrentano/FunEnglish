# [FEAT] Análise por questão do homework e sugestão automática de notas de erro

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-05 · **Atualizada em:** 2026-10-05
> **Ordem de implementação:** 14 · **Depende de:** 02, 09, 10 · **Por quê nesta posição:** Aproveita o `answers[]` que o homework já grava (spec 10, RNF04) e ainda não é exibido

## Detalhes da Atividade

- **O que precisa ser feito:** Mostrar ao professor **quais questões** mais erradas em cada homework (e no resultado da sala ao vivo) e, a partir dos erros de cada aluno, **sugerir notas de erro** (spec 02) para ele aceitar com um clique.
- **Problema e evidência:** O painel do homework mostra só a nota total ("7/10"). O detalhe por questão já é gravado em `homework/{id}/submissions/{sid}.answers[]`, mas não aparece em nenhuma tela. A spec 10 listava "usar `answers[]` para alimentar as notas de erro" como P2.
- **Impacto de não fazer:** O professor não sabe o que revisar na próxima aula; as notas de erro dependem só do que ele lembra de anotar em aula.
- **Para quem é destinado:** Professor de ESL.
- **História de usuário:** Como professor, quero ver quais questões a turma mais errou e transformar os erros de cada aluno em notas, para planejar a revisão da próxima aula.
- **Como saberemos que deu certo:** Identificar as 3 questões mais erradas de um homework em ≤ 2 cliques a partir do painel; ≥ 1 nota sugerida aceita por homework corrigido em média.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Aba "Questions" no detalhe do homework: lista de questões com % de acerto, ordenada da mais errada para a menos errada | P0 | CA01 |
| RF02 | Ao abrir uma questão: resposta correta, distribuição das respostas escolhidas (quiz) ou respostas digitadas mais comuns (fill-blanks), e nomes de quem errou | P0 | CA02 |
| RF03 | Por aluno: lista das questões que errou, com a resposta dada e a correta | P0 | CA03 |
| RF04 | "Suggested notes": para cada erro, uma nota pré-preenchida (categoria inferida pela categoria da atividade: grammar/vocabulary; texto = enunciado/resposta dada; correção = resposta correta) que o professor aceita, edita ou descarta | P1 | CA04 |
| RF05 | Aceitar em lote ("Add all as notes") com deduplicação por texto normalizado (reaproveita `recurring.ts`) | P1 | CA05 |
| RF06 | Mesma análise por questão no resultado da sala ao vivo, salvo na sessão | P1 | CA06 |
| RF07 | Botão "Practice again": cria um homework novo só com as questões erradas (quando o tipo permitir subconjunto: quiz, fill-blanks) | P2 | — |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Formato do `answers[]` versionado e validado por Zod por tipo de atividade: `{ itemId, given, correct: boolean }`; submissões antigas sem `itemId` usam o índice e mostram "Question N" | P0 | CA07 |
| RNF02 | Agregação feita no cliente sobre as submissões já carregadas pelo painel (≤ 60 por homework), sem novas coleções | P0 | |
| RNF03 | Enunciado e resposta correta vêm do conteúdo publicado da atividade; se a atividade mudou depois do envio, a questão sem correspondência aparece como "Question changed" | P1 | CA08 |
| RNF04 | Notas criadas pela sugestão têm `source: "homework"` e `homeworkId`, visibilidade padrão `private` | P0 | CA04 |
| RNF05 | Atividades sem resposta certa (flashcards, prompt-cards) não mostram a aba | P0 | CA09 |

### Dependências técnicas

- [FEAT] Notas e erros do aluno (spec 02): `src/lib/notes/*` (incluindo `recurring.ts`).
- [FEAT] Tarefa de casa (spec 10): `src/lib/homework/*`, `src/components/dashboard/homework-section.tsx`.
- [FEAT] Sala ao vivo (spec 09): `src/lib/live/scoring.ts`.
- Players de quiz e fill-blanks: confirmar que gravam `itemId` em `answers[]`.

### Recursos necessários

- Mockup da aba "Questions" e do painel de sugestões.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um homework de quiz com 10 questões e 6 envios, quando abro a aba "Questions", então vejo as 10 questões com % de acerto, a mais errada no topo.
- [ ] **CA02:** Dado a questão 4 com 4 de 6 erros, quando a abro, então vejo a resposta correta, quantos escolheram cada alternativa e os nomes dos 4 alunos.
- [ ] **CA03:** Dado que "Ana" errou as questões 2 e 4, quando abro o envio dela, então vejo as duas com a resposta dela e a correta.
- [ ] **CA04:** Dado o envio de "Ana", quando aceito a sugestão da questão 4, então é criada uma nota privada de "grammar" com o texto e a correção, com `source: "homework"`.
- [ ] **CA05:** Dado que "Ana" já tem a nota "goed → went", quando uso "Add all as notes" com esse mesmo erro, então não é criada uma nota duplicada e o erro conta como recorrente.
- [ ] **CA06:** Dado uma sala ao vivo encerrada, quando abro o resumo da sessão, então vejo a mesma lista de questões com % de acerto.
- [ ] **CA07:** Dado um envio antigo sem `itemId`, quando abro a análise, então as questões aparecem como "Question N" sem erro na tela.
- [ ] **CA08:** Dado que editei a atividade e removi uma questão depois dos envios, quando abro a análise, então essa questão aparece como "Question changed" e as demais continuam corretas.
- [ ] **CA09 (negativo):** Dado um homework de flashcards, quando abro o detalhe, então a aba "Questions" e as sugestões não aparecem.

## O que a atividade não inclui

- Correção manual de respostas abertas: motivo: os tipos atuais têm resposta fechada.
- Relatório agregado por turma ao longo de vários homeworks: motivo: escopo da spec 16 (relatório de progresso).
- Mover o gabarito para coleção privada: motivo: outra iniciativa (P2 da spec 09).

### Considerado para o futuro (P2)

- "Practice again" com só as questões erradas (RF07).
- Sugerir atividades do catálogo para os erros mais comuns da turma.
- Tags de habilidade por questão (ex.: "past simple") para agregar entre atividades.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Os players atuais já gravam um id estável por item em `answers[]`? | dev | Sim | |
| D02 | Para fill-blanks, agrupar respostas digitadas ignorando maiúsculas e espaços? | PO | Não | Sugestão: sim, mesma regra do player |
| D03 | Mostrar ao aluno (portal) a correção das questões que errou? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Agregação | unit | CA01 | `aggregateByQuestion(submissions)` | % e ordem corretos |
| CT02 | Distribuição | unit | CA02 | Respostas de quiz | Contagem por alternativa |
| CT03 | Erros do aluno | e2e (emulador) | CA03 | Abrir envio de Ana | Q2 e Q4 listadas |
| CT04 | Aceitar sugestão | e2e | CA04 | Aceitar Q4 | Nota criada com `source` |
| CT05 | Deduplicação | unit | CA05 | Nota já existente | Sem duplicata |
| CT06 | Sala ao vivo | e2e | CA06 | Encerrar sala e abrir resumo | Lista de questões |
| CT07 | Envio legado | unit | CA07 | `answers` sem `itemId` | "Question N" |
| CT08 | Atividade alterada | unit | CA08 | Item removido | "Question changed" |
| CT09 | Sem resposta certa | e2e | CA09 | Homework de flashcards | Sem aba |

## URL Complementar

- Documentação técnica: `SDD/DONE/2026-10-03_10-tarefa-de-casa.md` (RNF04 e P2); `SDD/DONE/2026-10-03_02-notas-e-erros-do-aluno.md`.
- Protótipo / mockup:
- Discussões relacionadas:
- Referências de design:
- Requisitos originais:
- Issue / PR relacionado:
