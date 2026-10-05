# [FEAT] Sorteador de alunos e gerador de grupos (Wheel of Fortune)

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-03 · **Atualizada em:** 2026-10-04  
> **Ordem de implementação:** 06 (sequência 00 a 11) · **Depende de:** 01 (lista avulsa funciona sem) · **Por quê nesta posição:** Plugado na aba Picker pela spec 08

## Detalhes da Atividade

- **O que precisa ser feito:** Criar uma **roleta** animada para sortear quem responde a próxima pergunta e um **gerador de grupos aleatórios**, usando os alunos presentes da sessão ou uma lista de nomes avulsa.
- **Problema e evidência:** Em quiz e quiz-board o professor escolhe "quem responde" na hora, o que gera reclamações de favoritismo e deixa alunos tímidos de fora. Hoje ele usa sites como Wheel of Names em outra aba e redigita os nomes a cada aula.
- **Impacto de não fazer:** Menos participação equilibrada e mais troca de aba; o roster de turmas fica subutilizado.
- **Para quem é destinado:** Professor conduzindo aula para turma (2 a 40 alunos).
- **História de usuário:** Como professor, quero girar uma roleta com os nomes dos alunos presentes, para escolher quem responde de forma justa e divertida.
- **Como saberemos que deu certo:** Sorteio em 1 clique a partir da aba Picker; com "no repeat" ativo, todos os presentes são sorteados antes de alguém repetir.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Roleta com os nomes dos alunos **presentes** da sessão; animação de 2 a 4 s e destaque grande do nome sorteado | P0 | CA01 |
| RF02 | Opção "Don't repeat until everyone is picked": o sorteado sai da roleta até todos terem sido sorteados; botão "Reset" | P0 | CA02 |
| RF03 | Fora da sessão (ou para turma não cadastrada): lista avulsa colando nomes, um por linha, guardada só no navegador | P1 | CA03 |
| RF04 | Gerador de grupos: dividir os presentes em N grupos **ou** em grupos de X pessoas, com distribuição equilibrada (diferença de no máximo 1 entre grupos) | P0 | CA04 |
| RF05 | Botão "Shuffle again" nos grupos e "Copy groups" (texto) | P1 | CA04 |
| RF06 | Histórico dos últimos 20 sorteios da sessão, visível só para o professor | P2 | |
| RF07 | Exibir o sorteio em tela grande ("Big screen"), como no timer | P1 | CA05 |
| RF08 | Opção "Skip" no resultado (aluno não quer ou não pode responder agora): sorteia de novo sem contar o pulado como sorteado | P1 | CA06 |
| RF09 | Usar os nomes dos grupos gerados como nomes de equipe ao iniciar uma atividade com equipes (`teamNames` do player) | P2 | |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Aleatoriedade com `crypto.getRandomValues` e embaralhamento Fisher-Yates (sem viés de `Math.random` com `sort`) | P0 | CA07 |
| RNF02 | Respeita `prefers-reduced-motion`: sem giro, só o destaque do nome | P0 | CA08 |
| RNF03 | Resultado anunciado para leitor de tela (`aria-live="polite"`) | P0 | |
| RNF04 | A roleta continua legível com 40 nomes (nomes longos truncados com reticências na fatia e nome completo no destaque) | P1 | |
| RNF05 | O estado do "no repeat" sobrevive a recarregar a página (junto com o estado da sessão) | P1 | |

### Dependências técnicas

- [FEAT] Turmas e alunos e [FEAT] Sessão de aula (lista de presentes). A lista avulsa (RF03) funciona sem elas.

### Recursos necessários

- Paleta de cores das fatias consistente com o tema claro e escuro do site.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado uma sessão com 8 presentes, quando clico em "Spin", então a roleta gira e para destacando um dos 8 nomes em tamanho grande.
- [x] **CA02:** Dado "Don't repeat" ativo e 3 presentes, quando giro 3 vezes, então cada aluno é sorteado uma vez, e no quarto giro a roleta é reabastecida automaticamente com aviso "Everyone has been picked — starting over".
- [x] **CA03:** Dado que não há sessão ativa, quando colo 5 nomes na lista avulsa e recarrego a página, então os 5 nomes continuam lá.
- [x] **CA04:** Dado 10 presentes, quando peço "3 groups", então vejo 3 grupos de 4, 3 e 3, sem aluno repetido nem faltando; e "Shuffle again" gera outra divisão.
- [x] **CA05:** Dado um sorteio feito, quando clico em "Big screen", então o nome sorteado ocupa a tela em fonte grande.
- [x] **CA06:** Dado que "Ana" foi sorteada com "Don't repeat" ativo, quando clico em "Skip", então outro nome é sorteado e "Ana" volta a ser elegível.
- [x] **CA07 (estatístico):** Dado 4 nomes e "Don't repeat" desligado, quando sorteio 4.000 vezes em teste automatizado, então cada nome sai entre 900 e 1.100 vezes.
- [x] **CA08:** Dado `prefers-reduced-motion: reduce`, quando clico em "Spin", então o resultado aparece sem animação de giro.
- [x] **CA09 (limite/negativo):** Dado 0 ou 1 presente, quando abro o Picker, então "Spin" fica desabilitado com a mensagem "Add at least 2 names"; e pedir mais grupos que alunos mostra "Not enough students for N groups".

## O que a atividade não inclui

- Pesos ou "sorteio viciado" (aumentar a chance de um aluno): motivo: contraria a ideia de justiça.
- Grupos com regras (separar ou juntar alunos específicos, equilibrar por nível): motivo: complexo demais agora.
- Roleta de perguntas ou de tópicos (sortear conteúdo, não pessoas): motivo: outra iniciativa possível; o componente deve aceitar qualquer lista de textos.

### Considerado para o futuro (P2)

- Grupos com restrições ("keep apart").
- Roleta genérica de tópicos e perguntas reaproveitando o mesmo componente.
- Integração com nomes de equipes no player (RF09).

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Os sorteios devem contar como "participação" no acompanhamento do aluno? | PO | Não | Sugestão: não na v1 |
| D02 | Roleta circular ou animação de "caça-níquel" (mais legível com 40 nomes)? | Design | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Giro básico | e2e | CA01 | Spin com 8 presentes | Nome destacado ∈ presentes |
| CT02 | Sem repetição | unit | CA02 | 4 sorteios com 3 nomes | 3 únicos e depois reabastece |
| CT03 | Lista avulsa | e2e | CA03 | Colar e recarregar | Nomes persistem |
| CT04 | Grupos equilibrados | unit (property-based) | CA04 | n alunos ∈ [2,40], g grupos | Partição completa, |Δ| ≤ 1 |
| CT05 | Big screen | e2e | CA05 | Abrir | Nome em tela cheia |
| CT06 | Skip | unit | CA06 | Pular "Ana" | "Ana" continua elegível |
| CT07 | Distribuição | unit | CA07 | 4.000 sorteios | Cada nome entre 900 e 1.100 |
| CT08 | Movimento reduzido | e2e (emulação de mídia) | CA08 | Spin | Sem animação |
| CT09 | Limites | unit | CA09 | 0, 1 nome; grupos > alunos | Botão desabilitado e mensagens |

## URL Complementar

- Documentação técnica: `src/components/player/player-intro.tsx` (`teamNames`).
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: wheelofnames.com; Classroomscreen (random name / group maker).
- Requisitos originais: "Gerador de Nomes/Grupos Aleatórios (Wheel of Fortune)" (ideias de 2026-10-03).
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
