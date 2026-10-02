# [FEAT] Login Obrigatório para Atividades

> **Status:** Rascunho
> **Autor:** Antigravity · **Revisor:** · **Criada em:** 2026-10-02 · **Atualizada em:** 2026-10-02

## Detalhes da Atividade

- **O que precisa ser feito:** Restringir o acesso a todas as rotas de atividades (ex: `/activities` e suas sub-rotas) garantindo que apenas usuários autenticados possam visualizá-las e interagir com elas.
- **Problema e evidência:** Atualmente não há uma barreira forte (ou especificada) que impeça usuários anônimos de acessar e utilizar o conteúdo de atividades. Isso impede o rastreamento de progresso por usuário e a futura monetização ou personalização.
- **Impacto de não fazer:** Usuários anônimos podem consumir todo o conteúdo sem se cadastrar, reduzindo a base de leads e a retenção, além de impossibilitar métricas precisas de uso.
- **Para quem é destinado:** Usuário anônimo (que será bloqueado) e Usuário cadastrado (que terá acesso).
- **História de usuário:** Como administrador do sistema, quero que as atividades sejam exclusivas para usuários logados, para aumentar a taxa de cadastros e poder salvar o progresso dos alunos.
- **Como saberemos que deu certo:** Tentativas de acessar as rotas de atividades sem estar logado resultarão em redirecionamento para a página de login/cadastro em 100% dos casos.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Usuários não logados que acessarem rotas de atividades devem ser redirecionados. | P0 | CA01, CA04 |
| RF02 | Usuários devem ser redirecionados para o `/login` (ou página de cadastro). | P0 | CA01 |
| RF03 | Após o login bem-sucedido a partir de um redirecionamento, o usuário deve voltar para a atividade que tentou acessar originalmente. | P1 | CA02 |
| RF04 | Usuários logados podem acessar as atividades normalmente. | P0 | CA03 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | O redirecionamento deve ocorrer antes da renderização do conteúdo da atividade (ex: via middleware no Next.js ou React Router Auth Guard), evitando "flash" de conteúdo protegido. | P0 | CA01 |

### Dependências técnicas

- Sistema de autenticação (ex: Firebase Auth) funcional.
- Rota de login configurada.

### Recursos necessários

- N/A

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que o usuário não está autenticado, quando tentar acessar qualquer rota iniciada com `/activities`, então deve ser redirecionado imediatamente para a página de login.
- [ ] **CA02:** Dado que o usuário não autenticado tentou acessar uma atividade (ex: `/activities/vocabulary`) e foi redirecionado para o login, quando ele realizar o login com sucesso, então deve ser redirecionado de volta para `/activities/vocabulary`.
- [ ] **CA03:** Dado que o usuário está autenticado, quando acessar qualquer rota de atividade, então deve visualizar a página e seu conteúdo normalmente.
- [ ] **CA04:** Dado que o usuário não está autenticado, quando acessar a página inicial `/` ou páginas públicas, então deve visualizá-las sem ser redirecionado.

## O que a atividade não inclui

- **Criação de planos pagos ou paywall avançado**: motivo: o escopo desta atividade é apenas a barreira de autenticação (login), e não de autorização por tipo de assinatura.
- **Salvar progresso das atividades no banco de dados**: motivo: o escopo atual é apenas o bloqueio da página; salvar dados requer outra especificação focada no banco e na modelagem de dados de progresso.

### Considerado para o futuro (P2)

- Restrição de atividades específicas para planos premium.
- Contagem de atividades "gratuitas" permitidas para visitantes anônimos antes do bloqueio (ex: "Você pode fazer 1 atividade grátis por dia").

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O usuário será redirecionado para `/login` ou existe alguma landing page de cadastro `/signup` que deve ser usada como destino? | PO | Não | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Bloqueio de anônimo | E2E | CA01 | Abrir aba anônima; navegar para URL de atividade. | Usuário é redirecionado para a página de login. Nenhum conteúdo da atividade é exibido. |
| CT02 | Retorno após login | E2E | CA02 | Tentar acessar atividade sem login; ser redirecionado; fazer login. | O usuário volta para a tela da atividade após o fluxo de login. |
| CT03 | Acesso liberado logado | Integração | CA03 | Fazer login; navegar para URL de atividade. | A página da atividade abre corretamente. |
| CT04 | Acesso livre a páginas públicas | Integração | CA04 | Abrir aba anônima; acessar `/`. | A página inicial carrega normalmente. |

## URL Complementar

- Documentação técnica: N/A
- Protótipo / mockup: N/A
- Discussões relacionadas: N/A
- Referências de design: N/A
- Requisitos originais: N/A
- Issue / PR relacionado: N/A
