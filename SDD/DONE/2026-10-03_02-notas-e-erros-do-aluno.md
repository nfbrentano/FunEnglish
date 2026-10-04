# [FEAT] Histórico de erros comuns e notas da aula por aluno

> **Status:** Concluído
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-03 · **Atualizada em:** 2026-10-04  
> **Ordem de implementação:** 02 (sequência 00 a 11) · **Depende de:** 01 · **Por quê nesta posição:** Fonte de dados dos feedbacks do portal; usada pela sessão (aba Notes)

## Detalhes da Atividade

- **O que precisa ser feito:** Criar um bloco de notas vinculado a cada aluno para registrar, durante ou depois da aula, palavras mal pronunciadas, erros gramaticais recorrentes e pontos fortes. Cada nota tem categoria e pode ser **privada** (só o professor vê) ou **compartilhada** (aparece no portal do aluno como feedback).
- **Problema e evidência:** O professor anota erros em papel ou em apps soltos e não consegue ver, semanas depois, se "Ana" ainda erra "th" ou o present perfect. Não há memória do que foi corrigido em cada aula.
- **Impacto de não fazer:** Sem histórico, o feedback ao aluno fica genérico, e o portal (feedbacks consolidados) não tem fonte de dados.
- **Para quem é destinado:** Professor de ESL (durante a aula, pela aba Notes da sessão; depois, pela página do aluno).
- **História de usuário:** Como professor, quero registrar em segundos o erro que um aluno cometeu na aula, para acompanhar o que se repete e dar feedback concreto depois.
- **Como saberemos que deu certo:** Registrar uma nota durante a aula em ≤ 3 interações (escolher aluno, categoria, texto + Enter); 0 notas privadas legíveis pelo aluno nos testes de regras.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Nota com: aluno, categoria (`pronunciation`, `grammar`, `vocabulary`, `fluency`, `strength`, `general`), texto (1–500 caracteres), correção opcional ("said X → should be Y"), visibilidade (`private` ou `shared`) e sessão de origem opcional | P0 | CA01 |
| RF02 | Captura rápida na aba Notes da sessão: chips com os alunos presentes, chips de categoria e campo de texto; Enter salva e limpa o campo mantendo o aluno selecionado | P0 | CA01 |
| RF03 | Uma nota pode ser aplicada a vários alunos de uma vez ("whole group") | P1 | CA02 |
| RF04 | Na página do aluno: linha do tempo das notas agrupadas por aula (data), com filtros por categoria e visibilidade | P0 | CA03 |
| RF05 | Marcar nota como "Resolved" (o aluno superou o erro); as resolvidas ficam esmaecidas e aparecem nos filtros | P1 | CA04 |
| RF06 | Seção "Recurring issues": textos ou correções iguais (normalizados) registrados em 2 ou mais aulas diferentes aparecem destacados com a contagem | P1 | CA05 |
| RF07 | Editar e excluir notas; mudar a visibilidade a qualquer momento | P0 | CA06 |
| RF08 | Padrão de visibilidade: `private` para erros e `shared` para `strength`; o professor pode alterar o padrão nas preferências | P1 | CA01 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Dados em `students/{studentId}/notes/{noteId}` `{ category, text, correction?, visibility, resolved, sessionId?, createdAt, updatedAt }` | P0 | |
| RNF02 | Regras: o professor (`teacherUid`) lê e escreve tudo; o aluno vinculado (`portalUid`) lê **somente** notas com `visibility == "shared"`. As consultas do portal precisam filtrar por esse campo | P0 | CA07 |
| RNF03 | Notas privadas nunca aparecem no modo projeção da sessão | P0 | CA08 |
| RNF04 | Escrita otimista: a nota aparece na hora e, offline, é sincronizada quando a conexão voltar (persistência offline do Firestore) | P1 | |
| RNF05 | Até 2.000 notas por aluno; a linha do tempo pagina de 50 em 50 | P1 | |

### Dependências técnicas

- [FEAT] Turmas e alunos (página do aluno e coleção `students`).
- [FEAT] Sessão de aula (aba Notes e vínculo `sessionId`). As notas também podem ser criadas na página do aluno sem sessão.
- Índice composto `notes`: `visibility` + `createdAt desc`.

### Recursos necessários

- Mockup da captura rápida (barra lateral estreita) e da linha do tempo.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado uma sessão com "Ana" presente, quando seleciono "Ana", a categoria "Pronunciation", digito "thought → /θɔːt/" e aperto Enter, então a nota é salva como privada, o campo fica vazio e "Ana" continua selecionada.
- [x] **CA02:** Dado 3 alunos selecionados, quando salvo a nota "Great teamwork" como Strength, então cada um dos 3 recebe a nota, compartilhada.
- [x] **CA03:** Dado notas de 3 aulas diferentes, quando abro a página de "Ana" e filtro por "Grammar", então vejo só as notas de gramática, agrupadas por data da aula, da mais recente para a mais antiga.
- [x] **CA04:** Dado uma nota de erro, quando marco "Resolved", então ela fica esmaecida e some do filtro padrão "Open".
- [x] **CA05:** Dado a correção "he go → he goes" registrada em 2 aulas diferentes, quando abro "Recurring issues", então ela aparece uma vez com "2 classes".
- [x] **CA06:** Dado uma nota privada, quando a altero para compartilhada, então ela passa a aparecer no portal do aluno.
- [x] **CA07 (negativo):** Dado que o aluno "Ana" está logado no portal, quando tenta ler uma nota privada dela pelo SDK, então a leitura é negada.
- [x] **CA08 (negativo):** Dado o modo projeção ativo, quando abro a aba Notes, então vejo só o formulário de captura, sem a lista de notas existentes.
- [x] **CA09 (limite):** Dado que tento salvar uma nota vazia ou com mais de 500 caracteres, quando aperto Enter, então nada é salvo e aparece a mensagem de validação.

## O que a atividade não inclui

- Gravação de áudio da pronúncia do aluno: motivo: prematuro e exige consentimento de gravação; tecnicamente viável agora com o Storage (spec 00).
- Sugestão automática de correções por IA: motivo: prematuro; sem backend.
- Notas da turma inteira sem aluno (anotação do professor sobre a aula): motivo: o texto da lousa e o resumo da sessão cobrem esse caso.

### Considerado para o futuro (P2)

- Áudio de referência gerado com TTS (`src/lib/player/speech.ts`) ao lado das notas de pronúncia.
- Sugestão automática de atividades do catálogo para os erros recorrentes (ex.: erro de gramática → atividade de Grammar no nível do aluno).

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O padrão para erros deve ser privado ou compartilhado? | PO | Não | Sugestão: privado, e o professor escolhe na revisão do resumo |
| D02 | Lista fixa de categorias ou categorias personalizáveis? | PO | Não | Sugestão: lista fixa na v1 |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Captura rápida | e2e (emulador) | CA01 | Selecionar, digitar, Enter | Doc criado privado; campo limpo |
| CT02 | Nota em grupo | integração | CA02 | 3 alunos | 3 docs `shared` |
| CT03 | Filtro e agrupamento | e2e | CA03 | Filtrar Grammar | Só gramática, agrupada por data |
| CT04 | Resolver | e2e | CA04 | Marcar resolved | Fora do filtro Open |
| CT05 | Recorrência | unit (normalização) | CA05 | 2 aulas com a mesma correção | 1 item, "2 classes" |
| CT06 | Alterar visibilidade | integração | CA06 | private → shared | Visível na consulta do portal |
| CT07 | Regras do aluno | integração (rules) | CA07 | Ler nota privada como `portalUid` | `permission-denied` |
| CT08 | Projeção | e2e | CA08 | Toggle + aba Notes | Lista oculta |
| CT09 | Validação | unit | CA09 | Vazio / 501 caracteres | Não salva |

## URL Complementar

- Documentação técnica: `firestore.rules`.
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: N/A.
- Requisitos originais: "Histórico de Erros Comuns e Notas da Aula" (ideias de 2026-10-03).
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
