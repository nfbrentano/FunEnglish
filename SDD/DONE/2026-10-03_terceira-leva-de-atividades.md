# [FEAT] Terceira leva de atividades: diversificação de formatos e expansão do catálogo

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-03 · **Atualizada em:** 2026-10-03

## Detalhes da Atividade

- **O que precisa ser feito:** Produzir uma terceira leva de 21 atividades originais geradas por IA, com foco primário em diversificar os formatos de interação disponíveis aos alunos e professores (atualmente 37 de 60 atividades são do tipo `quiz`), adicionando 6 atividades de completar lacunas (`fill-blanks`), 6 de cartões de conversação (`prompt-cards`), 3 de cartões de memorização (`flashcards`), 2 tabuleiros estilo jeopardy (`quiz-board`) e 4 questionários (`quiz`), com suporte a áudio TTS em Listening e abrangendo níveis Beginner, Intermediate e Advanced.
- **Problema e evidência:** O catálogo atingiu o mínimo de 3 atividades por célula na leva anterior, mas ainda tem predominância massiva de múltipla escolha (61% do catálogo). Além disso, categorias como Speaking, Fun e Listening possuem poucos tipos interativos variados, e o catálogo precisa crescer para sustentar o engajamento contínuo de turmas ao longo de um semestre.
- **Impacto de não fazer:** O catálogo torna-se monótono (sensação de "só quizzes de múltipla escolha"), desestimulando professores que procuram práticas ativas de conversação, memorização de vocabulário e exercícios de preenchimento textual.
- **Para quem é destinado:** Professores de ESL que buscam dinâmicas variadas para suas aulas e alunos praticando de forma autônoma; PO para curadoria.
- **História de usuário:** Como professor de inglês, quero ter variedade de formatos de atividades (cartões de debate, flashcards, lacunas e tabuleiros) em diferentes níveis, para que minhas aulas sejam dinâmicas e não fiquem restritas a quizzes de múltipla escolha.
- **Como saberemos que deu certo:** 21 novos arquivos JSON válidos no seed (`npm run seed:check` com 81 arquivos válidos e 0 inválidos); todos os testes unitários passando (`npm test`); cobertura de tipos mais equilibrada; fila "Needs review" do painel admin populada com as novas entradas.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | 21 atividades novas salvas em `content/activities/ai/<categoria>/<slug>.json`, estruturadas estritamente de acordo com os esquemas Zod de cada tipo | P0 | CA01 |
| RF02 | Distribuição de formatos focada em diversificação: 6 `fill-blanks`, 6 `prompt-cards`, 3 `flashcards`, 2 `quiz-board` e 4 `quiz` | P0 | CA02 |
| RF03 | Distribuição equilibrada entre categorias e níveis: Grammar (3), Vocabulary (4), Speaking (3), Fun (3), Pictures (2), Reading (2), Listening (2), Writing (2) | P0 | CA02 |
| RF04 | Atividades de Listening utilizando `media: { kind: "tts", text: "..." }` com frases claras em inglês americano para reprodução de áudio nativa no player | P0 | CA03 |
| RF05 | Todo quiz contém exatamente uma resposta correta por pergunta e uma explicação pedagógica de uma frase; atividades de lacunas possuem texto com `___` e opções adequadas | P0 | CA04 |
| RF06 | Thumbnails com `alt` descritivo e prompt harmonizado com `content/prompts/image-style.md`, integradas via `npm run images:plan` | P1 | CA05 |
| RF07 | Marcação com `origin: "ai"`, `reviewStatus: "pending"` e `status: "published"`, sem sobrescrever atividades customizadas existentes | P0 | CA06 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Conteúdo autoral em inglês americano, sem cópia de livros didáticos, exames oficiais ou sites proprietários | P0 | CA01, CA04 |
| RNF02 | Conteúdo seguro para sala de aula e adequado para todas as faixas etárias (sem violência, marcas ou esteriótipos) | P0 | CA04 |
| RNF03 | Vocabulário e estruturas sintáticas compatíveis com os níveis CEFR declarados (Beginner = A1–A2, Intermediate = B1–B2, Advanced = C1–C2) | P0 | CA04 |
| RNF04 | Desempenho e compatibilidade: JSONs sem caracteres corrompidos, codificados em UTF-8 e carregamento instantâneo no player | P0 | CA01 |

### Dependências técnicas

- Esquemas e validadores Zod (`src/lib/activities/schema/`).
- Scripts de validação e seed (`scripts/seed.ts`, `scripts/plan-images.ts`).
- Suíte de testes unitários (`vitest`).

### Recursos necessários

- Modelo de prompts de atividades (`content/prompts/activities.md`) e guia de estilo de imagem (`content/prompts/image-style.md`).
- Acesso à fila de revisão do painel admin pelo PO para revisão posterior.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado os 21 novos arquivos JSON criados em `content/activities/ai/`, quando executo `npm run seed:check`, então 81 arquivos são validados com sucesso (0 erros). _(validado: 81 valid, 0 invalid)_
- [x] **CA02:** Dado o acervo atualizado com a 3ª leva, quando totalizo os tipos, então temos pelo menos 12 fill-blanks, 15 prompt-cards, 7 flashcards e 6 quiz-boards no catálogo geral. _(validado: 12 fill-blanks, 15 prompt-cards, 7 flashcards, 6 quiz-boards e 41 quizzes)_
- [x] **CA03:** Dado qualquer atividade de Listening da nova leva, quando aberta no player, então o componente de áudio sintetizado (TTS) é carregado com o texto correspondente sem erros. _(validado com schemas Zod e testes unitários de media TTS)_
- [x] **CA04:** Dado qualquer questão de quiz criada nesta leva, quando inspecionada, então ela possui exatamente uma alternativa correta e o campo `explanation` preenchido pedagogicamente. _(validado em tests/unit/activities/content.test.ts)_
- [x] **CA05:** Dado a execução do comando `npm run images:plan`, quando o script finaliza, então os prompts das 21 novas atividades e seus itens são catalogados em `content/prompts/images/`. _(validado: 171 imagens planejadas)_
- [x] **CA06 (negativo):** Dado que o seed é executado, quando processa o catálogo, nenhuma atividade pré-existente ou editada no Firestore sofre perda de dados ou sobrescrita involuntária. _(validado via testes do emulador de seed)_

### Notas de implementação

- 21 arquivos adicionados em `content/activities/ai/` nas 8 categorias ativas, elevando o catálogo total de 60 para 81 atividades.
- Diversificação significativa de formatos: +6 fill-blanks, +6 prompt-cards, +3 flashcards, +2 quiz-board e +4 quiz.
- Distribuição equilibrada reforçando Beginner, Intermediate e Advanced em todas as categorias.
- Prompts de thumbnails e imagens de itens planejados via `npm run images:plan` sem marcas, logotipos ou conflitos de estilo.
- Cobertura de testes unitários: 51 arquivos e 691 testes passando com 100% de sucesso.

## O que a atividade não inclui

- Geração imediata dos binários WebP de imagem: motivo: as imagens físicas são geradas pelo PO/Admin via interface de `Missing images` usando os prompts planejados.
- Criação de novas atividades de vídeos longos do YouTube: motivo: requer curadoria prévia de canais com embed aberto e timestamping manual.
- Revisão pedagógica definitiva em tempo de desenvolvimento: motivo: o conteúdo entra como `reviewStatus: "pending"` para ser homologado na fila de revisão do painel admin.

### Considerado para o futuro (P2)

- Leva exclusiva com vídeos do YouTube verificados (`content:check-videos`).
- Geração de novas atividades sob demanda diretamente na interface administrativa via LLM API.
- Modo de áudio pré-gravado profissional além de TTS.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Como tratar imagens de itens em prompt-cards e flashcards enquanto os arquivos WebP não são enviados? | Dev | Não | O player exibe fallback de layout/ícone sem gerar erros 404, idêntico às levas anteriores. |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Validação dos JSONs de atividade | unit / script | CA01 | Executar `npm run seed:check` | 81 arquivos válidos, 0 inválidos |
| CT02 | Verificação de distribuição e tipos | unit (vitest) | CA02 | Executar `npm test tests/unit/activities/content.test.ts` | Testes passam com sucesso |
| CT03 | Áudio TTS em Listening | manual | CA03 | Abrir `/play/listening-hotel-and-travel-checkin` | Áudio toca via SpeechSynthesis do navegador |
| CT04 | Verificação de quizzes (resposta única e explicação) | unit | CA04 | Executar suíte de testes de quiz | 100% dos quizzes têm explicação e uma única resposta correta |
| CT05 | Planejamento de prompts de imagens | integração | CA05 | Executar `npm run images:plan` | Prompts gerados e indexados sem erros |
| CT06 | Preservação de integridade de dados existentes | integração | CA06 | Executar testes do emulador de seed | Nenhuma atividade existente sobrescrita |

## URL Complementar

- Documentação técnica: `content/prompts/activities.md`
- Protótipo / mockup: N/A
- Discussões relacionadas: `SDD/DONE/2026-10-02_segunda-leva-de-atividades.md`
- Referências de design: https://coolenglish.org/activities
- Requisitos originais: Solicitação do usuário de novas atividades diversificando tipos e expandindo o catálogo.
- Issue / PR relacionado: https://github.com/nfbrentano/FunEnglish
