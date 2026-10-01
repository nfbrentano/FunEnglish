# [FEAT] Tipo de atividade: Flashcards de vocabulário

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Implementar o plugin `flashcards`: cartões com frente (imagem e/ou palavra) e verso (palavra, definição, exemplo de uso), que viram ao clicar, com pronúncia por TTS, navegação e um modo de autoavaliação ("I knew it" / "Still learning").
- **Problema e evidência:** A categoria Vocabulary do site de referência (ex.: "Animals", "Days of the Week", "Weather Vocabulary", "Starbucks Menu") é baseada em apresentar palavras com imagem e praticar. Flashcards são o formato mais direto para isso.
- **Impacto de não fazer:** A categoria Vocabulary fica sem um formato adequado para apresentar palavras novas.
- **Para quem é destinado:** Professor (apresentando vocabulário) e aluno (revisando).
- **História de usuário:** Como professor, quero apresentar palavras novas com imagem e pronúncia em cartões grandes, para introduzir vocabulário de forma visual antes de praticar.
- **Como saberemos que deu certo:** Cartões legíveis a 5 m em modo apresentação; pronúncia disponível em 100% dos cartões em Chrome/Edge/Safari.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Esquema `content`: `cards[]` com `front` (`{text?, image?:{src,alt}}`, ao menos um), `back` (`{text, definition?, example?}`), `speak?` (texto a pronunciar; padrão `back.text`) | P0 | CA01, CA07 |
| RF02 | Clique/toque/Espaço vira o cartão com animação de flip (respeitando `prefers-reduced-motion`) | P0 | CA02 |
| RF03 | Navegação anterior/próximo (setas na tela e ←/→), com "4 / 20" | P0 | CA03 |
| RF04 | Botão de áudio que pronuncia a palavra via TTS en-US | P0 | CA04 |
| RF05 | Opção "Start with: Picture / Word" (qual lado aparece primeiro) | P1 | CA05 |
| RF06 | Modo autoavaliação: botões "I knew it" / "Still learning"; ao fim, oferece "Review the N cards you're still learning" | P1 | CA06 |
| RF07 | Embaralhar cartões (padrão desligado) | P1 | |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Imagens otimizadas (`next/image`) com pré-carregamento do próximo cartão | P0 | |
| RNF02 | Mínimo 1 e máximo 200 cartões | P0 | CA07 |
| RNF03 | Swipe esquerda/direita no touch para navegar | P1 | CA03 |

### Dependências técnicas

- [FEAT] Motor de atividades (shell, TTS).
- [FEAT] Modelo de dados (registro do esquema `flashcards`).

### Recursos necessários

- Imagens geradas por IA para os decks de exemplo, em estilo visual consistente (ver spec de conteúdo inicial), salvas em `/public/images/activities/` como WebP.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado um deck de 20 cartões, quando inicio, então vejo a frente do cartão 1 e "1 / 20".
- [x] **CA02:** Dado um cartão exibindo a frente, quando clico nele ou pressiono Espaço, então ele vira e mostra palavra, definição e exemplo.
- [x] **CA03:** Dado o cartão 4, quando pressiono → ou deslizo para a esquerda, então vejo o cartão 5 com a frente para cima.
- [x] **CA04:** Dado um cartão com a palavra "giraffe", quando clico no botão de áudio, então o navegador pronuncia "giraffe" em inglês.
- [x] **CA05:** Dado "Start with: Word", quando inicio, então os cartões aparecem com o verso (palavra) primeiro.
- [x] **CA06:** Dado o modo autoavaliação, quando marco 3 cartões como "Still learning" e chego ao fim, então vejo "Review the 3 cards you're still learning", e ao clicar revejo só esses 3.
- [x] **CA07 (negativo):** Dado um cartão sem texto e sem imagem na frente, quando o seed valida, então a atividade é rejeitada.
- [x] **CA08 (limite):** Dado o último cartão, quando pressiono →, então a atividade é concluída e aparece a tela Results (quantidade vista e, se houver autoavaliação, quantos "knew it").

## O que a atividade não inclui

- Repetição espaçada (SRS) entre sessões: motivo: exige persistência por aluno; prematuro.
- Jogo da memória (pares): motivo: poderia ser um tipo próprio no futuro.

### Considerado para o futuro (P2)

- Tipo "Memory match" reaproveitando o mesmo `content`.
- SRS para alunos logados.
- Gravação de voz do aluno para comparar pronúncia.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Qual fonte de imagens usar nos decks (fotos, ilustrações, geradas por IA)? | PO/Design | Não | Geradas por IA |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Início | e2e | CA01 | Iniciar deck de 20 | Frente do 1, "1 / 20" |
| CT02 | Virar | componente | CA02 | Clique e Espaço | Verso visível |
| CT03 | Navegar | e2e | CA03 | → e swipe emulado | Cartão 5 de frente |
| CT04 | Pronúncia | manual | CA04 | Clicar áudio | Fala "giraffe" |
| CT05 | Lado inicial | componente | CA05 | `startWith: 'word'` | Verso primeiro |
| CT06 | Revisão | e2e | CA06 | Marcar 3 "Still learning" | Revisão com 3 cartões |
| CT07 | Validação | unit | CA07 | Frente vazia | Erro de esquema |
| CT08 | Fim do deck | componente | CA08 | → no último | Results exibido |

## URL Complementar

- Documentação técnica: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: https://www.coolenglish.org/activities (categoria Vocabulary)
- Requisitos originais: Pedido de criar um site semelhante ao Cool English.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
