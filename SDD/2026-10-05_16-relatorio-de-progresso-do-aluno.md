# [FEAT] Relatório de progresso do aluno (para aluno e responsáveis)

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-05 · **Atualizada em:** 2026-10-05
> **Ordem de implementação:** 16 · **Depende de:** 01, 02, 04, 08, 10, 11 (13 e 14 opcionais) · **Por quê nesta posição:** Consolida dados de todos os módulos; fica melhor depois deles

## Detalhes da Atividade

- **O que precisa ser feito:** Gerar um **relatório de progresso** de um aluno para um período (ex.: último mês): presença, aulas, atividades feitas, médias dos homeworks, palavras novas e dominadas, pontos fortes, erros recorrentes resolvidos e abertos, progresso nas trilhas e um comentário do professor. O relatório pode ser impresso/salvo em PDF e compartilhado por link somente leitura.
- **Problema e evidência:** Os dados estão espalhados em abas (notas, vocabulário, homework, trilhas). Professores particulares precisam prestar contas a pais e alunos adultos e hoje montam isso à mão. A spec 03 listava "acesso de responsáveis (somente leitura)" como P2.
- **Impacto de não fazer:** Perde-se o principal argumento de retenção ("veja quanto você evoluiu"); o professor gasta tempo copiando dados.
- **Para quem é destinado:** Professor (gera e comenta); aluno e responsáveis (leem).
- **História de usuário:** Como professor particular, quero gerar em poucos cliques um relatório mensal do aluno, para mostrar a evolução aos pais e justificar a continuidade das aulas.
- **Como saberemos que deu certo:** Gerar e compartilhar um relatório mensal em ≤ 3 cliques e < 1 minuto (sem contar o comentário); PDF em 1–2 páginas A4 legíveis.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Na página do aluno, "Progress report" com seleção de período (último mês, últimos 3 meses, personalizado) | P0 | CA01 |
| RF02 | Seções: presença (x de y aulas), atividades em aula, homeworks (feitos/enviados, média, atrasos), vocabulário (novas, dominadas), notas (pontos fortes compartilhados; erros recorrentes abertos e resolvidos), trilhas (% atual e variação no período) | P0 | CA02 |
| RF03 | Comentário do professor (até 1.000 caracteres) e próximas metas (até 3 itens) | P0 | CA03 |
| RF04 | Escolher quais seções aparecem; notas **privadas** nunca aparecem (só `shared` e agregados sem texto) | P0 | CA04 |
| RF05 | "Print / Save as PDF" com folha de estilo de impressão (A4, sem navegação, cores da marca) | P0 | CA05 |
| RF06 | "Share link": salva um snapshot e gera link somente leitura com token; o professor pode revogar | P1 | CA06, CA07 |
| RF07 | Aluno com portal vê os relatórios compartilhados com ele em "Reports" | P1 | CA08 |
| RF08 | Gerar relatórios de todos os alunos de uma turma em lote (rascunhos para comentar) | P2 | — |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Cálculo dos números em função pura `buildProgressReport(data, period)` em `src/lib/reports/`, testada com dados fixos | P0 | CA02 |
| RNF02 | Snapshot imutável em `students/{id}/reports/{reportId}` `{ period, sections, metrics, comment, goals, shareTokenHash?, revoked, createdAt }`; o link público lê só o snapshot, nunca os dados vivos | P0 | CA06 |
| RNF03 | Link público sem login (exceção ao login obrigatório, como o homework): token aleatório ≥ 128 bits, guardado como hash; leitura por Cloud Function ou regra que confere o hash | P0 | CA07 |
| RNF04 | Sem dados pessoais além do primeiro nome do aluno e nome do professor no snapshot público; `noindex` na página | P0 | CA04 |
| RNF05 | Gerar o relatório em < 2 s para um aluno com 1 ano de dados (consultas por período com índices) | P1 | |
| RNF06 | Textos fixos do relatório em português e inglês (seleção no momento de gerar) | P1 | CA09 |

### Dependências técnicas

- Módulos: turmas (01), notas (02, `recurring.ts`), vocabulário (04), sessão (08, presença), homework (10), trilhas (11).
- `firestore.indexes.json` (consultas por período), Cloud Functions (spec 00) para o link público.
- `src/lib/seo.ts` (`noindex`).

### Recursos necessários

- Mockup do relatório em A4 (versão tela e impressão).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado "Ana" com aulas em setembro e outubro, quando escolho "Last month", então o relatório usa só os dados do último mês.
- [ ] **CA02:** Dado que "Ana" foi a 7 de 8 aulas, enviou 4 de 5 homeworks com média 82% e aprendeu 25 palavras, quando gero o relatório, então vejo "7/8 classes", "4/5 homework · 82% average" e "25 new words".
- [ ] **CA03:** Dado o relatório gerado, quando escrevo o comentário e 2 metas, então eles aparecem no fim do relatório e no PDF.
- [ ] **CA04 (negativo):** Dado que "Ana" tem notas privadas de pronúncia, quando gero o relatório, então o texto dessas notas não aparece em nenhuma seção nem no link público.
- [ ] **CA05:** Dado o relatório aberto, quando clico em "Print / Save as PDF", então a pré-visualização mostra 1–2 páginas A4 sem cabeçalho/rodapé do site.
- [ ] **CA06:** Dado um link compartilhado, quando adiciono novos homeworks de "Ana", então o link continua mostrando os números do momento em que foi gerado.
- [ ] **CA07 (negativo):** Dado que revoguei o link, quando alguém o abre, então vê "This report link is no longer available"; e um token inventado mostra a mesma mensagem.
- [ ] **CA08:** Dado "Ana" logada no portal, quando abre "Reports", então vê os relatórios compartilhados com ela e não vê os de outros alunos.
- [ ] **CA09:** Dado que escolhi "Português" ao gerar, quando abro o relatório, então os títulos das seções estão em português.

## O que a atividade não inclui

- Envio automático por e-mail aos responsáveis: motivo: e-mail automático adiado (spec 00).
- Conta própria para responsáveis: motivo: o link somente leitura atende ao caso; conta é complexa demais agora.
- Gráficos de evolução histórica de vários meses: motivo: P2; a v1 mostra números do período e variação.

### Considerado para o futuro (P2)

- Relatórios em lote por turma (RF08).
- Gráfico de evolução mês a mês (presença, média, palavras).
- Relatório de turma (média da turma, questões mais erradas, usando a spec 14).

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O link público expira (ex.: 90 dias) ou só por revogação? | PO | Não | |
| D02 | PDF pelo navegador (`window.print`) basta, ou é preciso gerar PDF no servidor? | dev | Não | Sugestão: navegador na v1 (site é estático) |
| D03 | Mostrar nota/média numérica ou faixas ("Great / Good / Needs practice") para crianças? | PO | Não | |
| D04 | LGPD: precisamos de aviso/consentimento para compartilhar dados de menores por link? | PO | Sim | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Filtro de período | unit | CA01 | `buildProgressReport` com dados de 2 meses | Só último mês |
| CT02 | Métricas | unit | CA02 | Dados fixos | 7/8, 4/5 · 82%, 25 palavras |
| CT03 | Comentário e metas | e2e (emulador) | CA03 | Preencher e salvar | Visíveis na tela e na impressão |
| CT04 | Notas privadas | unit + integração | CA04 | Notas privadas no dado | Ausentes no snapshot |
| CT05 | Impressão | manual + e2e (`page.pdf`) | CA05 | Imprimir | 1–2 páginas A4 |
| CT06 | Snapshot imutável | integração | CA06 | Novo homework após gerar | Link inalterado |
| CT07 | Revogação e token falso | integração (rules/Functions) | CA07 | Revogar; token inventado | Mensagem de indisponível |
| CT08 | Portal | e2e + rules | CA08 | Ana abre Reports; tenta ler de Bruno | Só os dela / `permission-denied` |
| CT09 | Idioma | unit | CA09 | Gerar em PT | Títulos em PT |

## URL Complementar

- Documentação técnica: `SDD/DONE/2026-10-03_03-portal-do-aluno.md` (P2 responsáveis); `SDD/DONE/2026-10-03_11-trilha-de-progresso.md`; `SDD/DONE/2026-10-03_10-tarefa-de-casa.md` (exceção ao login).
- Protótipo / mockup:
- Discussões relacionadas:
- Referências de design:
- Requisitos originais:
- Issue / PR relacionado:
