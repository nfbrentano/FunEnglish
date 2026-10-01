# [FEAT] Tipo de atividade: Jogo de tabuleiro estilo Jeopardy

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Implementar o plugin `quiz-board` (nome exibido: "Quiz Board"): um tabuleiro com 3 a 6 categorias e 3 a 6 valores por categoria (100–500). A turma, dividida em equipes, escolhe uma célula; a pergunta abre em tela cheia; o professor revela a resposta e marca qual equipe acertou (ou ninguém); a célula fica desabilitada e o placar é atualizado.
- **Problema e evidência:** Jogos de game show são destaque na categoria Fun do site de referência ("Jeopardy Basic 7", "Jeopardy Kids 2", "Jeopardy Genius 2", "Jeopardy Word Formation Academic 1"). São os preferidos para revisão em sala com a turma toda.
- **Impacto de não fazer:** A categoria Fun fica sem seu formato mais popular de jogo em grupo.
- **Para quem é destinado:** Professor conduzindo a turma com projetor.
- **História de usuário:** Como professor, quero projetar um tabuleiro de Jeopardy e controlar o placar das equipes, para fazer uma revisão divertida e competitiva no fim da unidade.
- **Como saberemos que deu certo:** O professor conduz uma partida completa (25 perguntas, 4 equipes) sem sair do modo tela cheia; tabuleiro legível a 5 m.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Esquema `content`: `categories[]` (3–6) com `name` e `clues[]` (3–6) contendo `value`, `question`, `answer`, `media?` (image/tts/youtube) | P0 | CA01, CA08 |
| RF02 | Configuração pré-jogo: número de equipes (2–6) e nomes editáveis (padrão "Team 1…") | P0 | CA02 |
| RF03 | Tabuleiro em grade: cabeçalho com nomes das categorias e células com os valores | P0 | CA01 |
| RF04 | Clicar numa célula abre a pergunta ampliada; botão "Show answer" revela a resposta | P0 | CA03 |
| RF05 | Após revelar, botões por equipe "+{valor}" e "No one"; opção de penalidade "−{valor}" configurável (padrão off) | P0 | CA04 |
| RF06 | Célula usada fica esmaecida e não clicável | P0 | CA05 |
| RF07 | Placar sempre visível; ajuste manual (+/−100) para correções do professor | P1 | CA06 |
| RF08 | Fim de jogo quando todas as células forem usadas ou ao clicar "End game": ranking das equipes e vencedor | P0 | CA07 |
| RF09 | Timer opcional por pergunta (off/15/30/60 s) com aviso sonoro | P2 | |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Otimizado para projetor 16:9 (1280×720 a 1920×1080) sem rolagem | P0 | CA01 |
| RNF02 | Texto de pergunta ≥ 32 px em modo apresentação | P0 | |
| RNF03 | Em telas < 768 px, tabuleiro rolável e aviso "Best played on a big screen" | P1 | |

### Dependências técnicas

- [FEAT] Motor de atividades (shell com suporte a equipes, fullscreen).
- [FEAT] Modelo de dados (registro do esquema `quiz-board`, já criado em `src/lib/activities/schema/content.ts`).

### Recursos necessários

- 3+ tabuleiros de exemplo (Kids, Basic, Advanced) com perguntas autorais.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado um jogo com 5 categorias × 5 valores, quando inicio em 1920×1080, então vejo o tabuleiro completo 5×5 com os nomes das categorias, sem rolagem.
- [x] **CA02:** Dado a tela de configuração, quando escolho 3 equipes e renomeio a primeira para "Tigers", então o placar mostra "Tigers", "Team 2" e "Team 3" com 0 pontos.
- [x] **CA03:** Dado o tabuleiro, quando clico em "Animals – 300", então a pergunta abre ampliada; ao clicar "Show answer", a resposta aparece.
- [x] **CA04:** Dado a resposta revelada, quando clico "Tigers +300", então Tigers passa a ter 300 pontos e volto ao tabuleiro.
- [x] **CA05:** Dado que "Animals – 300" foi usada, quando volto ao tabuleiro, então essa célula fica esmaecida e clicar nela não faz nada.
- [x] **CA06:** Dado um erro de marcação, quando uso o ajuste manual −100 em Tigers, então o placar é corrigido.
- [x] **CA07:** Dado que todas as 25 células foram usadas, quando fecho a última pergunta, então aparece o ranking final com o vencedor em destaque (empates indicados como "Tie").
- [x] **CA08 (negativo):** Dado um JSON com uma categoria de 2 pistas (mín. 3), quando o seed valida, então a atividade é rejeitada.
- [x] **CA09 (limite):** Dado que clico "No one", quando volto ao tabuleiro, então nenhum placar muda e a célula fica usada.

## O que a atividade não inclui

- "Daily Double" e "Final Jeopardy": motivo: baixo impacto inicial.
- Buzzer pelos celulares dos alunos: motivo: exige tempo real (ver P2 do motor).
- Uso da marca "Jeopardy!" no título do tipo exibido ao usuário: motivo: evitar problemas de marca registrada; usar "Quiz Board" na interface.

### Considerado para o futuro (P2)

- Daily Double e Final Round com apostas.
- Outros game shows reaproveitando o placar de equipes: Family Feud, Wheel of Fortune, $100,000 Pyramid.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Nome exibido do tipo: "Quiz Board", "Trivia Board" ou outro? | PO | Não | "Quiz Board" |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Tabuleiro 5×5 | e2e | CA01 | Viewport 1920×1080 | Grade completa, sem scroll |
| CT02 | Equipes | componente | CA02 | 3 equipes, renomear | Placar correto |
| CT03 | Abrir pista | e2e | CA03 | Clicar 300, Show answer | Pergunta e resposta |
| CT04 | Pontuar | componente | CA04 | Tigers +300 | 300 pontos |
| CT05 | Célula usada | componente | CA05 | Clicar célula usada | Sem ação |
| CT06 | Ajuste manual | componente | CA06 | −100 | Placar corrigido |
| CT07 | Fim e empate | unit | CA07 | Placar empatado | "Tie" |
| CT08 | Validação | unit | CA08 | Categoria com 2 pistas | Erro de esquema |
| CT09 | No one | componente | CA09 | Clicar No one | Placar inalterado |

## URL Complementar

- Documentação técnica: N/A.
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: https://www.coolenglish.org/activities (categoria Fun: "Jeopardy Basic 7", "Jeopardy Kids 2")
- Requisitos originais: Pedido de criar um site semelhante ao Cool English.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
