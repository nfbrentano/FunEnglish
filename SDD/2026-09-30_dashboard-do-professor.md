# [FEAT] Dashboard do professor

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Criar a página protegida `/dashboard` com: saudação, abas/seções "Favorites" (todos), "My lists" (cada lista com suas atividades) e "Recently played" (últimas 20 atividades abertas pelo usuário).
- **Problema e evidência:** O site de referência tem `/dashboard` como área pessoal. Sem um lugar central, os favoritos não têm onde ser consultados.
- **Impacto de não fazer:** Favoritos ficam inúteis; o professor não retoma o que usou na última aula.
- **Para quem é destinado:** Professor de ESL logado.
- **História de usuário:** Como professor, quero abrir meu painel e ver meus favoritos, listas e atividades recentes, para preparar e conduzir a aula sem procurar tudo de novo.
- **Como saberemos que deu certo:** Da tela de login até abrir uma atividade favorita em ≤ 3 cliques; dashboard carregado em < 1.5 s.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Rota `/dashboard` acessível apenas logado (guarda da spec de autenticação) | P0 | CA01 |
| RF02 | Saudação "Welcome back, {firstName}" | P1 | CA01 |
| RF03 | Seção "Favorites" em grade, ordenada por `addedAt` desc, com opção de remover | P0 | CA02 |
| RF04 | Seção "My lists": lista de listas com contagem; ao abrir uma lista, mostra suas atividades; renomear/excluir disponíveis | P1 | CA03 |
| RF05 | Seção "Recently played": últimas 20 atividades abertas, registradas em `users/{uid}/history/{activityId}` com `lastPlayedAt` (upsert ao abrir o player) | P1 | CA04 |
| RF06 | Estados vazios com CTA "Browse activities" | P0 | CA05 |
| RF07 | Atividades favoritas que foram despublicadas ou excluídas aparecem como "This activity is no longer available" com opção de remover | P1 | CA06 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Dados das atividades obtidos do índice leve do catálogo (sem 1 leitura por favorito) | P0 | |
| RNF02 | Página não indexável (`noindex`) | P0 | |
| RNF03 | Histórico limitado a 50 documentos por usuário (os mais antigos são removidos) | P1 | |

### Dependências técnicas

- [FEAT] Autenticação.
- [FEAT] Favoritos.
- [FEAT] Motor de atividades (para registrar "Recently played").

### Recursos necessários

- Mockup do dashboard.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que estou logado como "Ana Silva", quando acesso `/dashboard`, então vejo "Welcome back, Ana" e as seções Favorites, My lists e Recently played.
- [ ] **CA02:** Dado que tenho 5 favoritos, quando abro Favorites, então vejo os 5 do mais recente para o mais antigo, e ao remover um ele some da grade e do coração do card.
- [ ] **CA03:** Dado a lista "Teens B1" com 3 atividades, quando a abro, então vejo as 3; e quando a renomeio para "Teens B2", o novo nome é persistido.
- [ ] **CA04:** Dado que abri as atividades X e depois Y, quando vejo Recently played, então Y aparece antes de X; abrir X novamente a move para o topo sem duplicar.
- [ ] **CA05 (limite):** Dado um usuário novo sem dados, quando abre o dashboard, então cada seção mostra um estado vazio com o botão "Browse activities".
- [ ] **CA06:** Dado um favorito cuja atividade foi despublicada, quando abro Favorites, então ele aparece como "This activity is no longer available" com o botão "Remove".
- [ ] **CA07 (negativo):** Dado que não estou logado, quando acesso `/dashboard`, então não vejo dados de nenhum usuário e sou redirecionado ao login.

## O que a atividade não inclui

- Estatísticas de uso (tempo em aula, atividades mais usadas): motivo: prematuro.
- Configurações de conta/perfil: motivo: considerado para o futuro.
- Painel de equipe/escola: motivo: sem planos pagos na v1.

### Considerado para o futuro (P2)

- Aba "Settings" (perfil, exclusão de conta).
- Links de compartilhamento criados pelo professor e seu status.
- Estatísticas de uso.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Dashboard com abas ou todas as seções em uma página rolável? | Design | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Saudação e seções | e2e (emulador) | CA01 | Logar e abrir dashboard | Nome e 3 seções |
| CT02 | Favoritos e remoção | e2e | CA02 | Remover 1 de 5 | 4 restantes; coração vazio no catálogo |
| CT03 | Lista | e2e | CA03 | Abrir e renomear lista | Itens e nome atualizados |
| CT04 | Histórico | integração | CA04 | Abrir X, Y, X | Ordem X, Y sem duplicata |
| CT05 | Estados vazios | e2e | CA05 | Usuário novo | CTAs visíveis |
| CT06 | Atividade removida | integração | CA06 | Despublicar favorito | Placeholder com "Remove" |
| CT07 | Sem login | e2e | CA07 | Acessar deslogado | Redirect ao login |

## URL Complementar

- Documentação técnica: N/A.
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: https://www.coolenglish.org/dashboard
- Requisitos originais: Escopo v1 definido: login + favoritos, sem pagamento.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
