# [FEAT] Novo tipo de atividade: Ordenar frases (Sentence Builder)

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-05 · **Atualizada em:** 2026-10-06
> **Ordem de implementação:** 15 (ordem nova: 1ª das pendentes) · **Depende de:** motor de atividades, painel admin · **Por quê nesta posição:** Independente do modelo de alunos (revisada em 2026-10-06, sem mudança de escopo); pode ser feita em paralelo às specs 12–14

## Detalhes da Atividade

- **O que precisa ser feito:** Criar o tipo `sentence-order`: o aluno recebe palavras (ou trechos) embaralhadas e monta a frase na ordem correta, tocando ou arrastando. Serve para gramática (ordem de palavras, perguntas, advérbios) e writing.
- **Problema e evidência:** O catálogo tem 81 atividades em só 5 tipos; 41 são quiz (≈ 50%). Grammar e Writing dependem de quiz e fill-blanks. A spec do motor de atividades listava "ordenar frases" entre os novos tipos.
- **Impacto de não fazer:** Pouca variedade de mecânica; Writing continua sem uma atividade de produção guiada.
- **Para quem é destinado:** Professor (usa em aula, homework e sala ao vivo) e aluno.
- **História de usuário:** Como aluno, quero montar frases com palavras embaralhadas, para praticar a ordem das palavras em inglês de forma ativa.
- **Como saberemos que deu certo:** Pelo menos 8 atividades `sentence-order` publicadas (Grammar e Writing, níveis A1–B1) e jogáveis em homework; 0 erros no console no desktop e no mobile.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Schema: `items[]` (1–30) com `sentence` (frase correta), `chunks?` (divisão manual; padrão = por espaço), `alternatives?` (outras ordens aceitas), `hint?`, `translation?`, mídia opcional (imagem/áudio, como os outros tipos) | P0 | CA01 |
| RF02 | Player: bandeja de peças embaralhadas (nunca na ordem correta) e linha de resposta; tocar move a peça, tocar de novo devolve; arrastar e soltar no desktop | P0 | CA02 |
| RF03 | "Check": compara ignorando maiúsculas na primeira palavra e pontuação final; aceita `alternatives`; destaca peças fora de posição | P0 | CA03, CA04 |
| RF04 | Pontuação: 1 ponto por frase certa na 1ª tentativa; "Try again" permitido, sem ponto | P0 | CA05 |
| RF05 | Opções do plugin: "Show translation" e "Read aloud after correct" (TTS) | P1 | CA06 |
| RF06 | Editor no admin (`structured-editor`) com pré-visualização das peças e botão "Split by words" | P0 | CA07 |
| RF07 | Suporte a homework (grava `answers[]` com `itemId`, `given`, `correct`) e à sala ao vivo, inclusive a 1:1 (spec 17) | P1 | CA08 |
| RF08 | Prompt de IA em `content/prompts/activities.md` atualizado com o novo tipo, para gerar conteúdo | P1 | |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Registro seguindo o padrão: schema em `src/lib/activities/schema/content.ts`, componente em `src/components/player/plugins/sentence-order/`, entrada em `registry.ts` (code-split) | P0 | |
| RNF02 | Acessível por teclado (Tab entre peças, Enter move, Backspace devolve a última) e com leitor de tela (`aria-live` ao conferir) | P0 | CA09 |
| RNF03 | Alvos de toque ≥ 44 px; frase de até 14 peças cabe em 360 px de largura (quebra de linha) | P0 | |
| RNF04 | `npm run seed:check` valida o novo tipo e rejeita frase com uma única peça | P0 | CA01 |
| RNF05 | Embaralhamento usa `plugins/shuffle.ts` e é determinístico por semente nos testes | P1 | |

### Dependências técnicas

- Motor de atividades: `src/lib/player/registry.ts`, `src/lib/player/types.ts`.
- Painel admin: `src/components/admin/content/*`, `src/lib/admin/templates.ts`.
- Homework (spec 10) e sala ao vivo (spec 09) para RF07.

### Recursos necessários

- Ícone/miniatura do tipo; 8 atividades iniciais (geradas com o prompt de IA e revisadas).

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado um JSON com `sentence: "She doesn't like coffee."`, quando rodo `npm run seed:check`, então ele é válido; e um item com uma só palavra é recusado com mensagem clara.
- [x] **CA02:** Dado o item acima, quando a atividade abre, então vejo 4 peças embaralhadas em ordem diferente da correta, e tocar em uma a move para a linha de resposta.
- [x] **CA03:** Dado que montei "she doesn't like coffee", quando aperto "Check", então a resposta é aceita (maiúscula inicial e ponto final ignorados).
- [x] **CA04:** Dado `alternatives: ["Yesterday I went home."]` para "I went home yesterday.", quando monto a alternativa, então ela é aceita.
- [x] **CA05:** Dado que errei na 1ª tentativa e acertei na 2ª, quando termino, então essa frase não soma ponto e o resultado final mostra a contagem correta.
- [x] **CA06:** Dado "Read aloud after correct" ligado, quando acerto, então a frase é lida em voz alta.
- [x] **CA07:** Dado o editor do admin, quando digito uma frase e clico "Split by words", então vejo as peças e posso juntar duas peças em um trecho ("a lot of").
- [x] **CA08:** Dado um homework `sentence-order`, quando "Ana" termina, então a submissão tem `answers[]` com a ordem dada em cada item.
- [x] **CA09 (negativo):** Dado apenas o teclado, quando jogo a atividade, então consigo montar e conferir a frase sem mouse, e o foco nunca fica preso.

## O que a atividade não inclui

- Ordenar parágrafos ou diálogos inteiros: motivo: outra mecânica (peças grandes); pode reutilizar o player depois.
- Correção de frase livre digitada: motivo: exige avaliação aberta, fora do escopo.

### Considerado para o futuro (P2)

- Variante "Order the dialogue" (peças = falas).
- Peças-distratoras (palavra extra que não entra na frase).
- Modo por equipes no quiz-board.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Contrações ("doesn't") ficam como uma peça só? | PO | Não | Sugestão: sim, padrão por espaço |
| D02 | Pontuação final vira peça ou é fixa no fim? | design | Não | Sugestão: fixa, para não confundir iniciantes |
| D03 | Categoria padrão: Grammar ou Writing? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Schema | unit | CA01 | Validar JSON válido e com 1 peça | Válido / erro |
| CT02 | Embaralhar | unit | CA02 | `shuffleChunks` com semente | Nunca igual à ordem correta |
| CT03 | Comparação | unit | CA03, CA04 | `isCorrectOrder(given, item)` | Normalização e alternativas |
| CT04 | Pontuação | unit | CA05 | Errar e acertar | 0 ponto no item |
| CT05 | TTS | manual | CA06 | Acertar com opção ligada | Áudio da frase |
| CT06 | Editor | e2e | CA07 | Split + juntar peças | Peças corretas salvas |
| CT07 | Homework | e2e (emulador) | CA08 | Completar homework | `answers[]` gravado |
| CT08 | Teclado | e2e + a11y | CA09 | Jogar só com teclado | Fluxo completo |

## URL Complementar

- Documentação técnica: `SDD/DONE/2026-09-30_motor-de-atividades.md`; `src/lib/player/registry.ts`.
- Protótipo / mockup:
- Discussões relacionadas: P2 "Novos tipos" da spec do motor de atividades.
- Referências de design: Duolingo (montar frase), Cool English.
- Requisitos originais:
- Issue / PR relacionado:
