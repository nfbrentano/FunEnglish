# [FEAT] Banco de vocabulário personalizado do aluno

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-03 · **Atualizada em:** 2026-10-03  
> **Ordem de implementação:** 04 (sequência 00 a 11) · **Depende de:** 01, 03 · **Por quê nesta posição:** Página "My words" no portal; usada pela sessão e pela lousa

## Detalhes da Atividade

- **O que precisa ser feito:** Sempre que o professor adicionar uma palavra nova na aula (pela aba Notes/Vocabulary da sessão, pela lousa ou pela página do aluno), ela vai para o **dicionário pessoal** do aluno. O aluno vê esse dicionário no portal e pode revisá-lo, inclusive praticando com flashcards gerados a partir dele.
- **Problema e evidência:** As palavras ensinadas na aula ficam no caderno do aluno (quando ficam) ou se perdem na lousa apagada. O professor não sabe quais palavras cada aluno já viu.
- **Impacto de não fazer:** O vocabulário da aula não é revisado, e o portal do aluno perde seu conteúdo mais útil para o estudo diário.
- **Para quem é destinado:** Professor (adiciona as palavras) e aluno (revisa no portal).
- **História de usuário:** Como aluno, quero encontrar todas as palavras que aprendi nas aulas em um só lugar e praticá-las, para não esquecer o que vi.
- **Como saberemos que deu certo:** Adicionar uma palavra para todos os presentes em ≤ 2 interações durante a aula; a palavra aparece no portal do aluno logo após o encerramento da sessão.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Entrada de vocabulário: termo (obrigatório, 1–80 caracteres), significado/tradução (opcional, até 200), frase de exemplo (opcional, até 200), aula de origem automática | P0 | CA01 |
| RF02 | Na sessão: campo "Add word" envia a palavra para **todos os presentes** (padrão) ou para alunos selecionados. As palavras ficam pendentes na revisão do resumo e só são gravadas ao encerrar a sessão | P0 | CA01, CA02 |
| RF03 | Fora da sessão: adicionar, editar e excluir palavras na página do aluno | P0 | CA03 |
| RF04 | Deduplicação: o mesmo termo (sem diferenciar maiúsculas, acentos ou espaços nas pontas) não é duplicado para o mesmo aluno; a segunda ocorrência atualiza o "seen in N classes" | P0 | CA04 |
| RF05 | Portal: página "My words" com busca, ordenação (recentes / A–Z) e filtro por aula; cada palavra mostra o significado, o exemplo e o botão de ouvir a pronúncia (TTS, `src/lib/player/speech.ts`) | P0 | CA05 |
| RF06 | O aluno marca a palavra como "I know this" (`learned`); as aprendidas vão para a aba "Learned" | P1 | CA06 |
| RF07 | "Practice": gera uma sessão de flashcards com até 20 palavras não aprendidas, usando o plugin de flashcards existente, sem criar atividade no catálogo | P1 | CA07 |
| RF08 | Importar palavras de uma atividade do catálogo (ex.: termos de um flashcards jogado em aula) com um clique na revisão do resumo | P2 | |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Dados em `students/{studentId}/vocabulary/{wordId}`, com `wordId` = termo normalizado (slug), o que garante a deduplicação sem consulta | P0 | CA04 |
| RNF02 | Campos `{ term, meaning?, example?, sessionIds[] (até 50), firstAddedAt, lastAddedAt, learned }`. O professor escreve todos os campos, exceto `learned`; o aluno (`portalUid`) lê tudo e só atualiza `learned` (regra com `diff().affectedKeys().hasOnly(["learned"])`) | P0 | CA08 |
| RNF03 | Até 2.000 palavras por aluno; a lista pagina de 100 em 100 | P1 | |
| RNF04 | Gravação do encerramento em `writeBatch` (aluno × palavra), dividida em lotes de até 500 escritas | P0 | CA02 |
| RNF05 | TTS só em inglês (`en-US`/`en-GB`, conforme o padrão do player) e oculto quando o navegador não suporta `speechSynthesis` | P1 | |

### Dependências técnicas

- [FEAT] Turmas e alunos; [FEAT] Sessão de aula (entrada durante a aula e gravação ao encerrar).
- [FEAT] Portal do aluno (página "My words").
- [FEAT] Lousa virtual (envio de palavras da lousa, opcional).
- Plugin de flashcards (`src/components/player/plugins`) e `src/lib/player/speech.ts`.

### Recursos necessários

- Mockup da página "My words" no celular.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado uma sessão com 6 presentes, quando digito "boarding pass" com o significado "cartão de embarque" em "Add word", então a palavra aparece na lista de palavras da sessão com a indicação "6 students".
- [ ] **CA02:** Dado 3 palavras adicionadas na sessão, quando encerro a aula, então cada aluno presente tem as 3 palavras no dicionário, e os ausentes não têm nenhuma.
- [ ] **CA03:** Dado a página de "Ana", quando adiciono "luggage" sem sessão ativa, então a palavra aparece no dicionário dela sem aula de origem.
- [ ] **CA04 (limite):** Dado que "Ana" já tem "Luggage", quando o professor adiciona " luggage " em outra aula, então não surge duplicata e a palavra mostra "seen in 2 classes".
- [ ] **CA05:** Dado 30 palavras no dicionário de "Ana", quando ela busca "pass" no portal, então vê só os termos que contêm "pass"; e o botão de áudio fala a palavra.
- [ ] **CA06:** Dado a palavra "luggage", quando "Ana" clica em "I know this", então a palavra vai para a aba "Learned".
- [ ] **CA07:** Dado 25 palavras não aprendidas, quando "Ana" clica em "Practice", então abre uma sessão de flashcards com 20 delas; com 0 palavras, o botão fica desabilitado com "Add words in class to practice".
- [ ] **CA08 (negativo):** Dado que "Ana" está logada, quando tenta pelo SDK alterar o `meaning` de uma palavra, criar uma palavra ou ler o vocabulário de "Bruno", então as operações são negadas.

## O que a atividade não inclui

- Dicionário automático (buscar o significado em uma API externa): motivo: custo e privacidade; o professor digita o significado.
- Repetição espaçada (SRS) com agendamento de revisões: motivo: complexo demais agora.
- Imagens por palavra: motivo: baixo impacto agora; viável com o Storage (spec 00) no futuro.
- O aluno adicionar as próprias palavras: motivo: o banco reflete o que o professor ensinou na v1.

### Considerado para o futuro (P2)

- Repetição espaçada (campos `dueAt` e `ease` podem ser adicionados ao doc sem migração).
- Importar palavras de atividades do catálogo (RF08).
- Exportar o dicionário para Anki ou CSV.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | As palavras devem ser gravadas ao vivo (o aluno vê durante a aula) ou só no encerramento? | PO | Não | Sugestão: só no encerramento, para permitir a revisão |
| D02 | O significado é em português ou em inglês (definição)? Ou os dois campos? | PO | Não | Sugestão: um campo livre "Meaning" |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Adicionar na sessão | e2e (emulador) | CA01 | Add word | Pendente para 6 alunos |
| CT02 | Gravar ao encerrar | integração | CA02 | Encerrar com 1 ausente | Docs só para presentes |
| CT03 | Adicionar fora da sessão | e2e | CA03 | Página do aluno | Palavra sem `sessionIds` |
| CT04 | Deduplicação | unit (normalização) + integração | CA04 | "Luggage" e " luggage " | Mesmo `wordId`; 2 sessões |
| CT05 | Busca e TTS | e2e + manual (áudio) | CA05 | Buscar "pass" | Filtro e áudio |
| CT06 | Marcar aprendida | e2e | CA06 | I know this | Aba Learned |
| CT07 | Praticar | e2e | CA07 | 25 palavras / 0 palavras | 20 cards / botão desabilitado |
| CT08 | Regras | integração (rules) | CA08 | 3 operações proibidas | `permission-denied` |

## URL Complementar

- Documentação técnica: `src/lib/player/speech.ts`; plugin de flashcards em `src/components/player/plugins`.
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: Quizlet (lista e "study"), em versão reduzida.
- Requisitos originais: "Banco de Vocabulário Personalizado" (ideias de 2026-10-03).
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
