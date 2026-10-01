# [FIX] Favorito perdido quando o clique acontece antes de os favoritos carregarem

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-01 · **Atualizada em:** 2026-10-01

## Detalhes da Atividade

- **O que precisa ser feito:** Ao terminar de carregar os favoritos do professor, juntar o resultado com o que ele já marcou na tela em vez de substituir.
- **Problema e evidência:** O e2e "a new list from the toast keeps the activity" falha de forma intermitente (~1 em 20 execuções): o professor clica no coração logo após entrar, os favoritos do Firestore chegam depois e sobrescrevem o estado otimista; o coração apaga e a lista criada em seguida não recebe a atividade (o checkbox fica desmarcado). A gravação no Firestore acontece, então ao recarregar a página o favorito volta, o que confunde.
- **Impacto de não fazer:** Favoritos e listas "somem" da tela logo após o login em conexões lentas; testes instáveis no CI.
- **Para quem é destinado:** Professor logado.
- **História de usuário:** Como professor, quero que o coração que eu cliquei continue marcado, para confiar que a atividade foi salva.
- **Como saberemos que deu certo:** 0 falhas do teste em 40 repetições.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | O carregamento inicial preserva favoritos e listas criados na tela antes de ele terminar (dados do servidor prevalecem quando a mesma atividade/lista existe dos dois lados) | P0 | CA01, CA02 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Nenhuma leitura ou escrita extra no Firestore | P0 | CA03 |

### Dependências técnicas

- [FEAT] Favoritos (`src/lib/favorites/favorites-provider.tsx`).

### Recursos necessários

- N/A: correção pontual, sem novos recursos.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que os favoritos ainda estão carregando, quando clico no coração de uma atividade, então ele continua marcado depois que o carregamento termina.
- [x] **CA02:** Dado que criei uma lista antes de o carregamento terminar, quando ele termina, então a lista e as atividades dela continuam na tela.
- [x] **CA03 (negativo):** Dado o carregamento normal (sem cliques antes), quando ele termina, então a tela mostra exatamente os dados do servidor, sem duplicar favoritos.

## O que a atividade não inclui

- Bloquear os corações até o carregamento terminar: motivo: a junção resolve sem atrasar o clique.
- Desfazer uma remoção feita antes do carregamento: motivo: antes de carregar a tela não mostra favoritos para remover.

### Considerado para o futuro (P2)

- N/A: correção pontual.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | N/A | N/A | Não | N/A: sem dúvidas em aberto |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Clique antes do load | componente | CA01 | Repositório com `load` pendente; clicar no coração; resolver `load` | Coração marcado |
| CT02 | Lista antes do load | componente | CA02 | Criar lista com `load` pendente; resolver | Lista mantida com a atividade |
| CT03 | Load normal | componente | CA03 | Resolver `load` sem cliques | Igual ao servidor |
| CT04 | Repetição do e2e | e2e | CA01, CA02 | `--repeat-each=20` do teste de lista pelo toast | 0 falhas |

## URL Complementar

- Documentação técnica: N/A.
- Protótipo / mockup: N/A.
- Discussões relacionadas: Encontrado ao rodar o e2e da spec de compartilhar atividade.
- Referências de design: N/A.
- Requisitos originais: SDD/DONE/2026-09-30_favoritos.md
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
