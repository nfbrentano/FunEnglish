# [FEAT] Tipo de atividade: Completar lacunas (fill in the blanks)

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Implementar o plugin `fill-blanks`: textos ou frases com lacunas que o aluno preenche digitando ou escolhendo em um banco de palavras (drag-and-drop ou clique), com verificação e correção. Pode ter um clipe do YouTube ou áudio TTS associado (listening: completar letras de música, diálogos).
- **Problema e evidência:** O site de referência tem muitas atividades de Grammar ("Open Cloze KET", "Word Formation", "Verb Tense Stories") e Listening com músicas ("Someone Like You – Adele", "Yesterday – The Beatles") e diálogos ("Fill in the Dialogues – Friends") que se baseiam em completar lacunas.
- **Impacto de não fazer:** Não há como praticar produção escrita controlada de gramática nem atividades de listening com letras de música.
- **Para quem é destinado:** Aluno (individual) e professor (em sala).
- **História de usuário:** Como aluno, quero ouvir um trecho e completar as palavras que faltam, para treinar compreensão auditiva e ortografia.
- **Como saberemos que deu certo:** Autor cria uma atividade marcando lacunas com uma sintaxe simples (`[[palavra]]`); 0 falsos negativos em respostas com diferença apenas de maiúsculas/espaços.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Esquema `content`: `mode` (`typing` \| `word-bank`), `items[]` com `text` contendo lacunas no formato `[[resposta]]` ou `[[resposta1\|resposta2]]` (respostas aceitas), `hint?`, `media?` (image/tts/youtube com `start`/`end`); `distractors[]?` para o banco | P0 | CA01, CA08 |
| RF02 | Modo `typing`: input inline no lugar de cada lacuna, largura proporcional à resposta | P0 | CA01 |
| RF03 | Modo `word-bank`: banco de palavras embaralhadas (respostas + distratores); arrastar ou clicar na palavra e depois na lacuna | P0 | CA02 |
| RF04 | Botão "Check": lacunas corretas em verde, erradas em vermelho com opção "Show answer" | P0 | CA03 |
| RF05 | Correção ignora maiúsculas, espaços extras e apóstrofos tipográficos (’ vs '), mas não ignora erros de ortografia | P0 | CA04 |
| RF06 | Aceitar múltiplas respostas por lacuna (`[[don't\|do not]]`) | P0 | CA05 |
| RF07 | Player de mídia acima do texto, com botão "Replay clip" | P1 | CA06 |
| RF08 | Pontuação: lacunas corretas / total, no resultado final | P0 | CA07 |
| RF09 | Dica (`hint`) mostrada sob demanda ("Show hint") | P2 | |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Word bank operável por teclado (sem depender só de drag-and-drop) | P0 | CA02 |
| RNF02 | Inputs com `autocomplete="off"`, `spellcheck="false"` e `autocapitalize="off"` para não entregar a resposta | P0 | |
| RNF03 | Política de músicas: o trecho é tocado pelo **player oficial do YouTube embutido** (iframe, com `start`/`end`) a partir do vídeo do canal oficial do artista/gravadora; nunca baixar, recortar ou re-hospedar áudio/vídeo. O texto exibido se limita às linhas do trecho (máx. ~4–8 linhas por item), nunca a letra completa, e inclui crédito "Song – Artist" com link para o vídeo no YouTube | P0 | CA09 |
| RNF04 | Usar o modo de privacidade reforçada (`youtube-nocookie.com`) no embed | P1 | |

### Dependências técnicas

- [FEAT] Motor de atividades (shell, TTS, YouTubeClip).
- [FEAT] Modelo de dados (registro do esquema `fill-blanks`).

### Recursos necessários

- Textos de exemplo autorais para Grammar; seleção de clipes do YouTube com embed permitido.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado o item "She [[has]] lived here since 2010." em modo typing, quando inicio, então vejo a frase com um campo no lugar de "has".
- [ ] **CA02:** Dado o modo word-bank com distratores "have" e "is", quando clico em "has" e depois na lacuna (ou uso só o teclado), então "has" ocupa a lacuna e sai do banco.
- [ ] **CA03:** Dado que preenchi as lacunas, quando clico "Check", então as corretas ficam verdes e as erradas vermelhas; "Show answer" revela a resposta certa.
- [ ] **CA04:** Dado a resposta "Has " (maiúscula e espaço), quando verifico, então conta como correta; dado "hass", conta como errada.
- [ ] **CA05:** Dado a lacuna `[[don't|do not]]`, quando digito "do not", então conta como correta.
- [ ] **CA06:** Dado um item com clipe do YouTube de 30 a 45 s, quando clico "Replay clip", então o trecho toca novamente do segundo 30.
- [ ] **CA07:** Dado 12 lacunas com 9 corretas, quando concluo, então Results mostra "9 / 12 correct".
- [ ] **CA08 (negativo):** Dado um item de texto sem nenhuma lacuna `[[...]]`, quando o seed valida, então a atividade é rejeitada indicando o item.
- [ ] **CA09:** Dado uma atividade com música, quando a abro, então vejo o crédito "Song – Artist" com link para o YouTube, só as linhas do trecho, e o áudio vem do player embutido do YouTube (nenhum arquivo de mídia servido pelo nosso domínio).

## O que a atividade não inclui

- Correção tolerante a erros de ortografia (fuzzy): motivo: o objetivo é treinar ortografia.
- Reconhecimento de voz para preencher lacunas: motivo: complexo demais agora.
- Hospedar áudios próprios: motivo: sem Firebase Storage no plano gratuito; usar TTS/YouTube/URL externa.

### Considerado para o futuro (P2)

- Tipo "Sentence order" (ordenar palavras/"Lego Sentences") reaproveitando o parser.
- Dicas progressivas (primeira letra, número de letras).

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Qual política para usar músicas comerciais (apenas embed oficial + trechos curtos)? | PO | Não | Embutir trechos do YouTube com o player oficial (`start`/`end`), preferindo vídeos de canais oficiais; texto só das linhas do trecho; crédito e link para o vídeo (ver RNF03) |
| D02 | Alguns clipes oficiais (ex.: VEVO) bloqueiam embed ou exibem anúncios. Aceitamos anúncios do YouTube nos clipes? | PO | Não | Proposta: aceitar; se o embed for bloqueado, escolher outro vídeo (o player mostra fallback, ver spec do Motor) |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Parser de lacunas | unit | CA01 | `parseBlanks("She [[has]] lived")` | 1 lacuna, resposta "has" |
| CT02 | Word bank + teclado | e2e | CA02 | Preencher só com teclado | Palavra na lacuna |
| CT03 | Check e Show answer | componente | CA03 | Preencher e verificar | Cores e revelação |
| CT04 | Normalização | unit | CA04 | `isCorrect("Has ", ["has"])`, `"hass"` | true / false |
| CT05 | Respostas alternativas | unit | CA05 | "do not" vs `[[don't\|do not]]` | true |
| CT06 | Replay clip | manual | CA06 | Clicar Replay | Toca do segundo 30 |
| CT07 | Pontuação | componente | CA07 | 9 de 12 | "9 / 12 correct" |
| CT08 | Validação | unit | CA08 | Item sem lacuna | Erro de esquema |
| CT09 | Política de música | e2e + manual | CA09 | Abrir atividade de música; inspecionar rede | Crédito e link visíveis; mídia só de `youtube*.com` |

## URL Complementar

- Documentação técnica: https://developers.google.com/youtube/iframe_api_reference
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: https://www.coolenglish.org/activities (ex.: "Open Cloze KET", "Fill in the Dialogues – Friends", clipes musicais em Listening)
- Requisitos originais: Pedido de criar um site semelhante ao Cool English.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
