# [FEAT] Revisão espaçada do vocabulário do aluno (Daily Review)

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-05 · **Atualizada em:** 2026-10-06
> **Ordem de implementação:** 13 (ordem nova: 4ª das pendentes, depois da 14) · **Depende de:** 03, 04 (17 para a visão do professor) · **Por quê nesta posição:** Dá ao aluno um motivo para voltar ao portal entre as aulas, usando dados que já existem
>
> **Atualização 2026-10-06:** revisada depois das specs 17–20. O banco de vocabulário já é por aluno, então o núcleo não muda. A visão do professor fica na página do aluno com abas (spec 17), e a dúvida sobre "nível kids" foi reescrita: o nível agora é CEFR.

## Detalhes da Atividade

- **O que precisa ser feito:** Transformar o banco de vocabulário do aluno (spec 04) numa revisão diária com **repetição espaçada**: o portal mostra "X words to review today", o aluno revisa em formato de flashcard, avalia ("Again / Hard / Good / Easy") e a próxima data de cada palavra é calculada.
- **Problema e evidência:** Hoje o banco é uma lista estática com a marcação "learned". A spec 04 já previa repetição espaçada (`dueAt` e `ease` sem migração) como P2. Palavras vistas em aula são esquecidas sem revisão.
- **Impacto de não fazer:** O portal do aluno tem pouco uso entre as aulas; o professor não tem um argumento de "estudo em casa" além do homework pontual.
- **Para quem é destinado:** Aluno com acesso ao portal (spec 03); professor (acompanha a constância).
- **História de usuário:** Como aluno, quero revisar todo dia as palavras que aprendi em aula, no momento certo, para não esquecê-las.
- **Como saberemos que deu certo:** Revisão de 20 palavras em < 3 minutos; ≥ 30% dos alunos com portal fazem ao menos 3 revisões por semana após 1 mês.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | No portal, card "Daily review" com o número de palavras vencidas (`dueAt <= hoje`) e botão "Start review" | P0 | CA01 |
| RF02 | Tela de revisão: frente = termo (com botão de áudio TTS de `speak-button`); verso = significado e exemplo; avaliação em 4 botões e atalhos 1–4 | P0 | CA02 |
| RF03 | Algoritmo SM-2 simplificado: palavra nova entra com `dueAt = hoje`; "Again" volta para a fila da mesma sessão; intervalos crescem com `ease` | P0 | CA03 |
| RF04 | Limite diário configurável pelo aluno (padrão 20 revisões e 10 palavras novas) | P1 | CA04 |
| RF05 | Modo inverso opcional (significado → termo) | P1 | CA05 |
| RF06 | Ao terminar: resumo ("12 reviewed · 3 to repeat") e sequência de dias ("🔥 4-day streak") | P1 | CA06 |
| RF07 | Professor vê na página do aluno (aba Vocabulary, com resumo na Overview, spec 17 RF07/RF10): palavras dominadas (intervalo ≥ 21 dias), em revisão e atrasadas; e a data da última revisão | P1 | CA07 |
| RF08 | "Learned" manual (spec 04) passa a significar "suspensa": a palavra sai da revisão | P0 | CA08 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Campos novos e opcionais em `students/{id}/vocabulary/{wordId}`: `dueAt`, `intervalDays`, `ease` (padrão 2.5), `reps`, `lapses`, `lastReviewedAt`; doc sem esses campos é tratado como novo (sem migração) | P0 | CA03 |
| RNF02 | O aluno (`portalUid`) pode escrever **só** esses campos de revisão no seu próprio vocabulário; regras impedem alterar `term`, `meaning`, `example`, `sessionIds` | P0 | CA09 |
| RNF03 | Gravação em lote ao final (ou a cada 10 cartões), para no máximo ~3 escritas por sessão de revisão | P1 | |
| RNF04 | Cálculo do agendamento é função pura em `src/lib/vocabulary/srs.ts` com 100% de cobertura de testes | P0 | CA03 |
| RNF05 | Funciona no celular (alvos de toque ≥ 44 px, gesto de virar) e com teclado; WCAG AA | P0 | |
| RNF06 | Datas calculadas no fuso do aluno (`America/Sao_Paulo` por padrão) para "hoje" não virar à meia-noite UTC | P0 | CA01 |

### Dependências técnicas

- [FEAT] Portal do aluno (spec 03) e Banco de vocabulário (spec 04): `src/lib/vocabulary/*`, `src/components/portal/student-vocabulary-tab.tsx`.
- `src/components/player/media/speak-button.tsx` e `src/lib/player/speech.ts` (TTS).
- Regras do Firestore e testes de regras.

### Recursos necessários

- Mockup da tela de revisão (mobile first).

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que "Ana" tem 8 palavras com `dueAt` até hoje e 5 futuras, quando abre o portal, então vê "8 words to review today".
- [x] **CA02:** Dado a revisão aberta, quando "Ana" toca no cartão (ou aperta Espaço), então vê o significado e o exemplo e os 4 botões de avaliação.
- [x] **CA03:** Dado uma palavra com `intervalDays = 3` e `ease = 2.5`, quando "Ana" escolhe "Good", então `intervalDays` passa a 8 (arredondado) e `dueAt` = hoje + 8; e com "Again" a palavra volta ao fim da fila atual e `lapses` aumenta 1.
- [x] **CA04:** Dado 50 palavras vencidas e limite 20, quando "Ana" começa a revisão, então revisa no máximo 20 e vê "Daily goal reached".
- [x] **CA05:** Dado o modo inverso ligado, quando a revisão começa, então a frente mostra o significado e o verso o termo.
- [x] **CA06:** Dado que "Ana" revisou ontem e hoje, quando termina a revisão de hoje, então vê "2-day streak".
- [x] **CA07:** Dado que "Ana" tem 4 palavras com intervalo ≥ 21 dias, quando o professor abre a página dela, então vê "4 mastered" e a data da última revisão.
- [x] **CA08:** Dado uma palavra marcada como "learned", quando "Ana" inicia a revisão, então essa palavra não aparece.
- [x] **CA09 (negativo):** Dado "Ana" logada no portal, quando tenta alterar `term` de uma palavra ou escrever no vocabulário de "Bruno" pelo SDK, então recebe `permission-denied`.

## O que a atividade não inclui

- Exportar para Anki/CSV: motivo: outra iniciativa (P2 da spec 04).
- Notificação push de lembrete diário: motivo: depende de push/e-mail, adiados.
- Algoritmo FSRS: motivo: complexo demais agora; SM-2 é suficiente para o volume de palavras por aluno.

### Considerado para o futuro (P2)

- Lembrete diário por e-mail/push quando houver palavras vencidas.
- Revisão em outros formatos (ditado com TTS, completar a frase do exemplo).
- Importar palavras de atividades do catálogo para o banco (RF08 da spec 04).
- No início da aula 1:1 (spec 17), mostrar ao professor as palavras vencidas do aluno para revisarem juntos.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Alunos sem portal (só link de homework) também revisam? | PO | Não | Sugestão: não na v1 |
| D02 | O professor pode forçar uma palavra a voltar para a revisão (reset)? | PO | Não | |
| D03 | 4 botões ou 2 ("Didn't know / Knew it") para crianças? | design | Não | Não existe "nível kids": o nível do aluno é CEFR (A1–C2, spec 17). Sugestão: opção "Simple review (2 buttons)" por aluno, ligada pelo professor |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Contagem de vencidas | unit | CA01 | `dueWords(words, today)` com fuso SP | 8 |
| CT02 | Virar cartão | e2e | CA02 | Abrir revisão, Espaço | Verso e botões visíveis |
| CT03 | Agendamento SM-2 | unit | CA03 | Tabela de entradas (Again/Hard/Good/Easy) | Intervalos e `ease` esperados |
| CT04 | Limite diário | unit + e2e | CA04 | 50 vencidas, limite 20 | 20 cartões |
| CT05 | Modo inverso | e2e | CA05 | Ligar e iniciar | Frente = significado |
| CT06 | Sequência | unit | CA06 | Datas de revisão consecutivas | `streak = 2` |
| CT07 | Visão do professor | e2e (emulador) | CA07 | 4 palavras ≥ 21 dias | "4 mastered" |
| CT08 | Suspensa | unit | CA08 | Palavra `learned` | Fora da fila |
| CT09 | Regras | integração (rules) | CA09 | Escrever `term`; escrever em outro aluno | `permission-denied` |

## URL Complementar

- Documentação técnica: `SDD/DONE/2026-10-03_04-banco-de-vocabulario-do-aluno.md`; `SDD/DONE/2026-10-03_03-portal-do-aluno.md`; `SDD/DONE/2026-10-05_17-alunos-individuais-e-aula-1a1.md`.
- Protótipo / mockup:
- Discussões relacionadas: P2 "Repetição espaçada" da spec 04.
- Referências de design: algoritmo SM-2 (SuperMemo), Anki.
- Requisitos originais:
- Issue / PR relacionado:
