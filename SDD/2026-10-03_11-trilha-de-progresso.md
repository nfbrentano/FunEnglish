# [FEAT] Trilha de progresso visual (Roadmap Tracker)

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-03 · **Atualizada em:** 2026-10-03  
> **Ordem de implementação:** 11 (sequência 00 a 11) · **Depende de:** 00, 01, 03, 08, 09 (opcional), 10 · **Por quê nesta posição:** Última: consome sessão, sala ao vivo e homework

## Detalhes da Atividade

- **O que precisa ser feito:** Permitir que o professor monte uma **trilha**, uma sequência ordenada de atividades do catálogo com um objetivo (ex.: "Travel module"), e a atribua a alunos ou turmas. O site mostra o percentual de conclusão de cada aluno nessa trilha (ex.: "Travel module — 40% complete").
- **Problema e evidência:** As "My lists" agrupam atividades, mas não têm ordem pedagógica nem progresso por aluno. O professor controla em planilhas "quem já fez o quê".
- **Impacto de não fazer:** Não há visão de progresso para mostrar ao aluno ou aos pais, o que é um argumento forte de retenção para professores particulares.
- **Para quem é destinado:** Professor de ESL (monta e acompanha) e aluno (vê no portal).
- **História de usuário:** Como professor, quero montar uma sequência de atividades com um objetivo e ver quanto cada aluno já concluiu, para planejar as próximas aulas e mostrar evolução.
- **Como saberemos que deu certo:** Criar uma trilha de 5 atividades a partir de uma lista existente em < 1 minuto; o percentual é atualizado sem ação manual quando o aluno conclui um homework da trilha.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | CRUD de trilha: nome (1–60 caracteres), descrição opcional, nível opcional e sequência ordenada de 1 a 30 atividades publicadas | P0 | CA01 |
| RF02 | Adicionar atividades pela busca do catálogo ou "Create from list" (copiar uma lista de `users/{uid}/lists`); reordenar com arrastar e soltar e também com botões subir/descer (acessível) | P0 | CA01, CA02 |
| RF03 | Atribuir a trilha a alunos individuais ou a uma turma inteira (cada aluno da turma recebe seu próprio progresso) | P0 | CA03 |
| RF04 | Progresso = atividades concluídas ÷ total, mostrado em barra, percentual e passos (concluído / atual / pendente) | P0 | CA04 |
| RF05 | Conclusão **manual**: o professor marca e desmarca o passo para o aluno (ex.: feito em aula) | P0 | CA04 |
| RF06 | Conclusão **automática**: um passo é marcado quando (a) o aluno envia o homework daquela atividade ou (b) a atividade é jogada em uma sessão em que o aluno estava presente, se a opção "Count class activities" estiver ligada | P1 | CA05 |
| RF07 | Visão da turma: matriz alunos × passos da trilha com o percentual de cada aluno | P1 | CA06 |
| RF08 | Editar a trilha depois de atribuída: passos novos entram como pendentes; passos removidos deixam de contar, sem apagar o histórico | P0 | CA07 |
| RF09 | Passo cuja atividade foi despublicada aparece como "No longer available" e não conta no total | P1 | CA08 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Modelo: modelo da trilha em `users/{uid}/tracks/{trackId}` `{ name, description?, level?, activityIds[], updatedAt }`; progresso em `students/{studentId}/tracks/{trackId}` `{ trackName, activityIds[] (cópia), completed: { [activityId]: { at, source: "manual" \| "homework" \| "class" } }, assignedAt }` | P0 | |
| RNF02 | A cópia `activityIds` no progresso é atualizada quando o professor edita a trilha (escrita em lote em todos os alunos atribuídos, até 500 por batch) | P0 | CA07 |
| RNF03 | O aluno (`portalUid`) lê o próprio progresso, mas não escreve. A conclusão automática é gravada por **Cloud Functions** (spec 00): um trigger `onCreate` em `homework/{id}/submissions` e outro no encerramento da sessão (`onSessionEnded`) marcam o passo em todas as trilhas do aluno que contêm a atividade | P0 | CA05, CA09 |
| RNF04 | O percentual é calculado no cliente, sem campo agregado gravado (evita inconsistência) | P1 | |
| RNF05 | Títulos e capas vêm do índice leve do catálogo (`catalog/index`), sem 1 leitura por passo | P0 | |

### Dependências técnicas

- [FEAT] Turmas e alunos.
- [FEAT] Envio de tarefas de casa (conclusão automática, RF06a).
- [FEAT] Sessão de aula (conclusão automática, RF06b).
- [FEAT] Portal do aluno (exibição para o aluno).
- `src/lib/catalog` (índice), `src/lib/favorites` (listas, para "Create from list").

### Recursos necessários

- Mockup da trilha (editor, visão do aluno com passos e matriz da turma).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado a lista "Travel" com 5 atividades, quando escolho "Create from list", então é criada a trilha "Travel" com as 5 atividades na mesma ordem.
- [ ] **CA02:** Dado uma trilha com 5 passos, quando arrasto o passo 5 para a posição 1 (ou uso o botão "Move up" 4 vezes), então a nova ordem é salva.
- [ ] **CA03:** Dado a turma "Teens B1" com 8 alunos, quando atribuo a trilha "Travel" à turma, então os 8 alunos aparecem com "0% complete".
- [ ] **CA04:** Dado "Ana" com 0 de 5 passos, quando marco 2 passos como concluídos, então a barra dela mostra "40% complete" e os passos 1 e 2 aparecem como concluídos.
- [ ] **CA05:** Dado que "Ana" enviou o homework da atividade do passo 3, quando abro a página de "Ana", então o passo 3 aparece concluído com a origem "Homework" e a barra mostra "60% complete".
- [ ] **CA06:** Dado a trilha atribuída à turma, quando abro a visão da turma, então vejo a matriz com cada aluno, os passos e o percentual de cada um.
- [ ] **CA07:** Dado "Ana" com 2 de 5 concluídos, quando adiciono um 6º passo à trilha, então ela passa a "33% complete" (2 de 6) sem perder as 2 conclusões.
- [ ] **CA08 (limite):** Dado que uma atividade da trilha foi despublicada, quando abro a trilha, então o passo aparece como "No longer available" e o total desconsidera esse passo.
- [ ] **CA09 (negativo):** Dado que "Ana" está logada no portal, quando tenta marcar um passo como concluído pelo SDK, então a escrita é negada.

## O que a atividade não inclui

- Trilhas prontas oficiais do Fun English (curadas pelo admin): motivo: outra iniciativa de conteúdo.
- Pré-requisitos ou bloqueio de passos ("só libera o 3 depois do 2"): motivo: complexo demais agora; a ordem é sugestiva.
- Nota mínima para considerar concluído: motivo: prematuro; na v1, enviar o homework conclui o passo.
- Certificado de conclusão: motivo: baixo impacto.

### Considerado para o futuro (P2)

- Nota mínima por passo (`completed[].score`, já previsto no modelo como campo opcional).
- Trilhas oficiais compartilháveis entre professores.
- Datas-alvo por passo.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Jogar a atividade em aula deve concluir o passo para todos os presentes por padrão? | PO | Não | Sugestão: opção por trilha, desligada por padrão |
| D02 | Passos podem ser itens que não são atividades do site (ex.: "Read chapter 2")? | PO | Não | Sugestão: não na v1 |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Criar a partir de lista | e2e (emulador) | CA01 | Create from list | Trilha com a mesma ordem |
| CT02 | Reordenar | e2e | CA02 | Arrastar / botões | Ordem persistida |
| CT03 | Atribuir à turma | integração | CA03 | Atribuir | 8 docs de progresso |
| CT04 | Percentual | unit | CA04, CA07, CA08 | Cálculo com passos concluídos, novos e indisponíveis | 40%, 33%, total ajustado |
| CT05 | Conclusão por homework | integração | CA05 | Criar submissão e abrir página | Passo `source: homework` |
| CT06 | Matriz da turma | e2e | CA06 | Abrir visão da turma | Matriz correta |
| CT07 | Regra de escrita do aluno | integração (rules) | CA09 | Update como `portalUid` | `permission-denied` |

## URL Complementar

- Documentação técnica: `SDD/DONE/2026-09-30_favoritos.md` (listas); `src/lib/catalog`.
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: Duolingo (trilha de passos).
- Requisitos originais: "Trilha de Progresso Visual (Roadmap Tracker)" (ideias de 2026-10-03).
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
