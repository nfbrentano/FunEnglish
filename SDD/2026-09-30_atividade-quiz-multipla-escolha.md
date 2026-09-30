# [FEAT] Tipo de atividade: Quiz de múltipla escolha

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Implementar o plugin `quiz`: uma sequência de perguntas com 2 a 6 alternativas (uma ou mais corretas), com suporte opcional a imagem, áudio (TTS) ou clipe do YouTube no enunciado, feedback imediato de acerto/erro, explicação e pontuação.
- **Problema e evidência:** Grande parte do acervo de referência (Grammar, Reading, Listening, Videos, Pictures, "The Far Side – multiple choice", "10 Question Challenge") é baseada em múltipla escolha. É o tipo mais versátil e deve ser o primeiro plugin.
- **Impacto de não fazer:** Sem o tipo mais comum, o catálogo fica praticamente vazio de atividades jogáveis.
- **Para quem é destinado:** Professor (em sala) e aluno (individual).
- **História de usuário:** Como aluno, quero responder perguntas de múltipla escolha e ver na hora se acertei e por quê, para aprender com meus erros.
- **Como saberemos que deu certo:** Um autor cria um quiz de 10 perguntas em JSON em < 15 min; o quiz roda em todas as 9 categorias (com texto, imagem, áudio ou vídeo).

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Esquema `content`: `questions[]` com `prompt` (texto), `media?` (`{kind:'image',src,alt}` \| `{kind:'tts',text}` \| `{kind:'youtube',videoId,start,end}`), `options[]` (2–6, com `text` e `correct`), `explanation?` | P0 | CA01, CA07 |
| RF02 | Exibir uma pergunta por vez com as alternativas em botões grandes (A, B, C…) | P0 | CA01 |
| RF03 | Ao escolher, destacar em verde a correta e em vermelho a escolhida errada, mostrar a explicação e o botão "Next" | P0 | CA02 |
| RF04 | Perguntas com múltiplas corretas: seleção múltipla + botão "Check" | P1 | CA03 |
| RF05 | Pontuação: +1 por acerto; resultado final "8 / 10 correct" com revisão das erradas | P0 | CA04 |
| RF06 | Configurações: embaralhar perguntas e alternativas (padrão ligado); timer por pergunta (padrão off) | P1 | CA05 |
| RF07 | Modo equipes: a vez passa entre equipes a cada pergunta; o placar pontua a equipe da vez | P1 | CA06 |
| RF08 | Atalhos de teclado: teclas 1–6 / A–F escolhem alternativa; Enter = Next | P1 | |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Feedback não depende só de cor: ícones ✓/✗ e texto "Correct!"/"Not quite" | P0 | CA02 |
| RNF02 | Mínimo 1 e máximo 100 perguntas por atividade | P0 | CA07 |
| RNF03 | Feedback exibido em < 100 ms após a escolha | P1 | |

### Dependências técnicas

- [FEAT] Motor de atividades (shell, TTS, YouTubeClip).
- [FEAT] Modelo de dados (registro do esquema `quiz`).

### Recursos necessários

- Pelo menos 1 quiz de exemplo por categoria no seed.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um quiz com 10 perguntas, quando inicio, então vejo a pergunta 1 com suas alternativas identificadas por letras e "1 / 10".
- [ ] **CA02:** Dado a pergunta atual, quando escolho uma alternativa errada, então ela fica vermelha com ✗, a correta fica verde com ✓, aparece a explicação e as alternativas ficam bloqueadas.
- [ ] **CA03:** Dado uma pergunta com 2 corretas, quando marco só uma e clico "Check", então a resposta conta como errada e as duas corretas são destacadas.
- [ ] **CA04:** Dado que acertei 8 de 10, quando termino, então a tela Results mostra "8 / 10 correct" e lista as 2 perguntas erradas com a resposta certa.
- [ ] **CA05:** Dado timer de 20 s ativo, quando o tempo acaba sem resposta, então a pergunta conta como errada e a correta é revelada.
- [ ] **CA06:** Dado 2 equipes, quando a equipe 1 acerta a pergunta 1 e a equipe 2 erra a pergunta 2, então o placar fica Equipe 1: 1, Equipe 2: 0.
- [ ] **CA07 (negativo):** Dado um JSON de quiz com pergunta sem nenhuma alternativa correta, quando o seed valida, então a atividade é rejeitada com mensagem indicando a pergunta.
- [ ] **CA08:** Dado uma pergunta com `media.kind = "tts"`, quando clico no ícone de áudio, então o texto é falado em inglês.

## O que a atividade não inclui

- Perguntas de resposta aberta digitada: motivo: coberto pela spec Completar lacunas.
- Pontuação por velocidade (estilo Kahoot): motivo: prematuro.

### Considerado para o futuro (P2)

- Variante "Who wants to be a millionaire" (escada de prêmios, ajudas 50/50) reaproveitando o esquema.
- Pontuação por velocidade.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Permitir voltar para perguntas anteriores? | PO | Não | Sugestão: não (evita trapaça em equipes) |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Início | e2e | CA01 | Iniciar quiz de 10 | Pergunta 1, "1 / 10" |
| CT02 | Resposta errada | componente | CA02 | Clicar alternativa errada | Destaques, explicação, bloqueio |
| CT03 | Múltiplas corretas | componente | CA03 | Marcar 1 de 2 e Check | Conta como erro |
| CT04 | Resultado | e2e | CA04 | Acertar 8 de 10 | "8 / 10 correct" + revisão |
| CT05 | Timer | componente (fake timers) | CA05 | Avançar 20 s | Conta como erro |
| CT06 | Equipes | componente | CA06 | 2 equipes, acerto/erro | Placar 1–0 |
| CT07 | Validação | unit | CA07 | Validar pergunta sem correta | Erro com índice |
| CT08 | Áudio | manual | CA08 | Clicar áudio | Fala em inglês |

## URL Complementar

- Documentação técnica: N/A.
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: https://www.coolenglish.org/activities (ex.: "THE FAR SIDE – multiple choice", "10 Question Challenge")
- Requisitos originais: Pedido de criar um site semelhante ao Cool English.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
