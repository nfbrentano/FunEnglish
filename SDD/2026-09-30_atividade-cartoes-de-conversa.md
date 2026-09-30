# [FEAT] Tipo de atividade: Cartões de conversa e descrição de imagens

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Implementar o plugin `prompt-cards`: uma sequência de cartões com imagem e/ou pergunta de discussão (ex.: "Describe this picture", "This or That?", "What do you think?"), com vocabulário de apoio opcional, timer de fala e sorteio aleatório de cartão. Não há resposta certa: o objetivo é gerar conversa (Speaking) ou escrita livre (Writing).
- **Problema e evidência:** As categorias Speaking, Pictures e Writing do site de referência ("Picture Description 5", "What's Going On? 1", "This or That 3", "Speaking Cue Cards", "Topic Talks Advanced 1", "Debate Game", "Story Writing") são baseadas em estímulos abertos, sem correção automática.
- **Impacto de não fazer:** Três das nove categorias ficam sem formato adequado.
- **Para quem é destinado:** Professor conduzindo conversação em sala; aluno praticando sozinho.
- **História de usuário:** Como professor, quero projetar uma imagem ou pergunta com um timer de fala, para que cada aluno fale por 1 minuto sobre o tema.
- **Como saberemos que deu certo:** Um único tipo cobre Speaking, Pictures e Writing (≥ 1 atividade de exemplo em cada) sem código específico por categoria.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Esquema `content`: `cards[]` com `prompt` (texto), `image?` (`src`, `alt`), `options?` (2 itens, para "This or That"), `followUps?[]` (perguntas extras), `vocabulary?[]` (palavras de apoio) | P0 | CA01, CA08 |
| RF02 | Exibição de um cartão por vez em destaque; imagem grande com o prompt | P0 | CA01 |
| RF03 | Botão "Show follow-up questions" e "Show useful vocabulary" (ocultos por padrão) | P1 | CA02 |
| RF04 | Timer de fala configurável (off/30 s/1 min/2 min/custom) com início manual, pausa, e alerta visual/sonoro ao fim | P0 | CA03 |
| RF05 | Navegação sequencial e botão "Random card" (sem repetir até esgotar) | P0 | CA04 |
| RF06 | Layout "This or That": duas opções lado a lado quando `options` existe | P1 | CA05 |
| RF07 | Modo Writing: campo de texto opcional para o aluno escrever, com contador de palavras (não salvo) | P1 | CA06 |
| RF08 | Revelação progressiva de imagem ("Mystery picture": imagem desfocada que vai revelando em passos) | P2 | |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Imagem ocupa ≥ 60% da altura da tela em modo apresentação, mantendo proporção | P0 | CA01 |
| RNF02 | Alerta de fim do timer visível sem som (para salas sem áudio) | P0 | CA03 |
| RNF03 | Texto do aluno no modo Writing não é enviado a nenhum servidor | P0 | CA07 |

### Dependências técnicas

- [FEAT] Motor de atividades (shell, fullscreen).
- [FEAT] Modelo de dados (registro do esquema `prompt-cards`).

### Recursos necessários

- Imagens geradas por IA com cenas ricas em detalhes (para descrição), em estilo visual consistente (ver spec de conteúdo inicial).
- Banco de perguntas de conversação por nível.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado uma atividade com 15 cartões com imagem, quando inicio, então vejo o cartão 1 com a imagem em destaque, o prompt e "1 / 15".
- [ ] **CA02:** Dado um cartão com follow-ups e vocabulário, quando clico "Show follow-up questions", então as perguntas extras aparecem; o vocabulário continua oculto até eu clicar no botão dele.
- [ ] **CA03:** Dado timer de 1 min, quando clico "Start timer", então a contagem regressiva aparece; ao chegar a 0, a tela pisca/mostra "Time's up!" e toca um som (se o áudio estiver ligado).
- [ ] **CA04:** Dado 15 cartões, quando clico "Random card" 15 vezes, então cada cartão aparece exatamente uma vez; no 16º clique, vejo "All cards shown – Start over?".
- [ ] **CA05:** Dado um cartão com `options: ["Cats", "Dogs"]`, quando ele é exibido, então as duas opções aparecem lado a lado com "or" entre elas.
- [ ] **CA06:** Dado o modo Writing ativo, quando o aluno digita 57 palavras, então o contador mostra "57 words".
- [ ] **CA07 (negativo):** Dado que o aluno escreveu um texto no modo Writing, quando conclui ou recarrega, então nenhuma requisição com o texto é enviada e o texto é descartado.
- [ ] **CA08 (negativo):** Dado um cartão sem `prompt` e sem `image`, quando o seed valida, então a atividade é rejeitada.

## O que a atividade não inclui

- Avaliação automática da fala ou da escrita (IA): motivo: complexo demais agora e envolve custo/privacidade.
- Gravação de áudio do aluno: motivo: sem armazenamento no plano gratuito.

### Considerado para o futuro (P2)

- "Mystery picture" (revelação progressiva) e "What's wrong?" (encontrar erros na imagem).
- Feedback de escrita com IA (Claude API) para alunos.
- Modo debate com dois lados e timer alternado.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Qual fonte de imagens para "Picture Description" (fotos de banco gratuito, ilustrações próprias, geradas por IA)? | PO/Design | Não | Geradas por IA |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Início | e2e | CA01 | Iniciar atividade de 15 | Cartão 1 e "1 / 15" |
| CT02 | Follow-ups e vocabulário | componente | CA02 | Clicar botões | Revelação independente |
| CT03 | Timer | componente (fake timers) | CA03 | Avançar 60 s | "Time's up!" |
| CT04 | Sorteio sem repetição | unit | CA04 | Sortear 15 de 15 | Permutação sem repetição |
| CT05 | This or That | componente | CA05 | Cartão com options | Duas opções e "or" |
| CT06 | Contador de palavras | unit | CA06 | Texto com 57 palavras | 57 |
| CT07 | Privacidade | e2e | CA07 | Monitorar rede ao escrever | 0 requisições com o texto |
| CT08 | Validação | unit | CA08 | Cartão vazio | Erro de esquema |

## URL Complementar

- Documentação técnica: N/A.
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: https://www.coolenglish.org/activities (categorias Speaking, Pictures e Writing)
- Requisitos originais: Pedido de criar um site semelhante ao Cool English.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
