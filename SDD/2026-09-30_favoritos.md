# [FEAT] Favoritos e listas de favoritos

> **Status:** Em andamento
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Permitir que o professor logado marque/desmarque atividades como favoritas pelo ícone de coração no card e no player, e organize favoritos em listas nomeadas (ex.: "Monday class – Teens B1").
- **Problema e evidência:** O site de referência oferece favoritos e "Unlimited favorites lists" como principal benefício da conta. Professores planejam aulas reunindo atividades antecipadamente.
- **Impacto de não fazer:** O login perde valor; professores precisam anotar nomes de atividades fora do site.
- **Para quem é destinado:** Professor de ESL logado.
- **História de usuário:** Como professor, quero salvar atividades em listas por turma ou aula, para encontrá-las rapidamente na hora de dar aula.
- **Como saberemos que deu certo:** Favoritar em 1 clique com feedback visual imediato (< 100 ms, otimista); ≥ 30% dos usuários logados com pelo menos 1 favorito após 30 dias.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Botão coração nos cards e no player; preenchido quando a atividade está nos favoritos | P0 | CA01 |
| RF02 | Clique de visitante no coração abre modal "Log in to save favorites" com botões Log in / Sign up; após login, a atividade é favoritada automaticamente | P0 | CA02 |
| RF03 | Favoritar/desfavoritar com atualização otimista e rollback + toast de erro em caso de falha | P0 | CA03 |
| RF04 | Armazenamento em `users/{uid}/favorites/{activityId}` com `addedAt` e `listIds[]` | P0 | CA01 |
| RF05 | Criar, renomear e excluir listas (`users/{uid}/lists/{listId}` com `name`, `createdAt`, `order`) | P1 | CA04, CA05 |
| RF06 | Ao favoritar, popover opcional "Add to list" com as listas existentes e "New list" | P1 | CA04 |
| RF07 | Estado de favoritos carregado uma única vez por sessão e compartilhado entre todos os cards (sem leitura por card) | P0 | CA06 |
| RF08 | Excluir uma lista não remove as atividades dos favoritos gerais | P1 | CA05 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Regras do Firestore: somente o próprio usuário lê/escreve `users/{uid}/favorites` e `users/{uid}/lists` | P0 | CA07 |
| RNF02 | Limite de 1.000 favoritos e 50 listas por usuário (proteção de cota gratuita) | P1 | CA08 |
| RNF03 | Botão coração com `aria-pressed` e rótulo "Add to favorites"/"Remove from favorites" | P0 | CA01 |

### Dependências técnicas

- [FEAT] Autenticação.
- [FEAT] Catálogo de atividades (card).

### Recursos necessários

- Mockup do popover "Add to list" e do modal de login.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que estou logado, quando clico no coração vazio de um card, então ele fica preenchido imediatamente e o documento `users/{uid}/favorites/{activityId}` é criado; clicar de novo remove.
- [ ] **CA02:** Dado que sou visitante, quando clico no coração, então vejo o modal "Log in to save favorites"; e, após fazer login, a atividade aparece nos meus favoritos.
- [ ] **CA03:** Dado que estou offline ou a escrita falha, quando favorito, então o coração volta ao estado anterior e aparece o toast "Couldn't save. Try again.".
- [ ] **CA04:** Dado que favoritei uma atividade, quando escolho "New list", digito "Teens B1" e confirmo, então a lista é criada e a atividade é adicionada a ela.
- [ ] **CA05:** Dado uma lista com 3 atividades, quando a excluo, então a lista some e as 3 atividades continuam nos favoritos gerais.
- [ ] **CA06:** Dado o catálogo com 200 cards, quando a página carrega logada, então os favoritos são buscados com uma única consulta, e não uma por card.
- [ ] **CA07 (negativo):** Dado o usuário A logado, quando tenta ler `users/{uidB}/favorites`, então a leitura é negada.
- [ ] **CA08 (limite):** Dado que tenho 50 listas, quando tento criar a 51ª, então vejo "You've reached the limit of 50 lists" e nada é criado.

## O que a atividade não inclui

- Página de visualização dos favoritos: motivo: parte da spec [FEAT] Dashboard do professor.
- Compartilhar uma lista inteira com alunos ou colegas: motivo: prematuro.
- Reordenar atividades dentro da lista por drag-and-drop: motivo: baixo impacto agora.

### Considerado para o futuro (P2)

- Link público para uma lista ("playlist" de aula).
- Drag-and-drop para ordenar listas e itens.
- Favoritos anônimos em `localStorage` sincronizados ao criar conta.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Listas entram na v1 ou só favoritos simples? | PO | Não | Proposta: favoritos simples P0; listas P1 |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Favoritar/desfavoritar | e2e (emulador) | CA01 | Clicar coração 2× | Doc criado e removido |
| CT02 | Visitante | e2e | CA02 | Clicar coração deslogado, logar | Modal; favorito salvo após login |
| CT03 | Falha e rollback | componente | CA03 | Mock de escrita rejeitada | Estado revertido + toast |
| CT04 | Nova lista | e2e (emulador) | CA04 | Criar "Teens B1" | Lista com a atividade |
| CT05 | Excluir lista | integração | CA05 | Excluir lista com 3 itens | Favoritos intactos |
| CT06 | Uma consulta | integração | CA06 | Contar leituras ao carregar catálogo | 1 query de favoritos |
| CT07 | Isolamento | integração | CA07 | rules-unit-testing A lendo B | `PERMISSION_DENIED` |
| CT08 | Limite de listas | unit/integração | CA08 | Criar 51ª lista | Erro e nada criado |

## URL Complementar

- Documentação técnica: https://firebase.google.com/docs/firestore/security/rules-conditions
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: https://www.coolenglish.org/pricing ("Unlimited favorites lists")
- Requisitos originais: Escopo v1 definido: login + favoritos, sem pagamento.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
