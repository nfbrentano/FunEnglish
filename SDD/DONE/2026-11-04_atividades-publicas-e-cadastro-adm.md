# [FEAT] Acesso Público às Atividades e Cadastro Exclusivo pelo ADM

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-11-04 · **Atualizada em:** 2026-11-04
> **Contexto:** Revisão de política de acesso às atividades (revertendo o bloqueio obrigatório de login para jogar) e endurecimento do controle de autoria de conteúdo.

## Detalhes da Atividade

- **O que precisa ser feito:**
  1. **Remover a obrigatoriedade de login para jogar atividades:** Liberar o acesso público e irrestrito a todas as atividades do catálogo (`/play/[slug]` e `/play-shell`). Visitantes não autenticados (anônimos), alunos sem conta ou novos usuários poderão abrir, interagir e concluir qualquer atividade sem serem redirecionados para a tela de login. Recursos exclusivos de professores logados (favoritar, enviar como tarefa de casa, vincular à sessão de aula) continuam protegidos e solicitam login apenas quando acionados.
  2. **Restringir o cadastro e edição de atividades exclusivamente ao Administrador:** Garantir que o cadastro de novas atividades (`/admin/new`), a edição de atividades existentes (`/admin/edit`), a gestão de cobertura e o painel de conteúdo (`/admin/*`) sejam acessíveis única e exclusivamente pelo usuário autenticado cujo e-mail corresponda ao **e-mail cadastrado como ADM** (`ADMIN_EMAIL`, por padrão `nfgbrentano@gmail.com`). Professores comuns, alunos e usuários anônimos não terão acesso a essas telas nem permissão de escrita no Firestore.
- **Problema e evidência:**
  - A especificação anterior (`2026-10-02_login-obrigatorio-para-atividades.md`) adicionou uma barreira de autenticação forçada (`<RequireAuth>`) nas rotas `/play/[slug]` e `/play-shell`. Isso gera atrito desnecessário para visitantes que desejam experimentar as atividades, diminui o compartilhamento orgânico e impede o uso rápido em sala de aula por alunos em seus próprios dispositivos sem login.
  - Ao mesmo tempo, é fundamental garantir que o acervo de atividades do site seja curado e gerenciado centralizadamente apenas pelo proprietário/administrador da plataforma (e-mail cadastrado), impedindo que professores cadastrados modifiquem o catálogo público ou acessem rotas de administração.
- **Impacto de não fazer:**
  - Usuários desistem de jogar atividades ao se depararem com tela de login obrigatório;
  - Risco de confusão ou brechas em que outros usuários possam acessar formulários de criação de atividades ou tentar alterar o catálogo público.
- **Para quem é destinado:**
  - **Visitantes e Alunos (anônimos ou logados):** Acesso livre, imediato e gratuito para jogar qualquer atividade do catálogo.
  - **Administrador (e-mail cadastrado):** Controle total e exclusivo sobre criação, edição, publicação e exclusão de atividades no painel `/admin`.
  - **Professores cadastrados comuns:** Acesso às suas ferramentas pedagógicas (dashboard, turmas, lousa, favoritos), mas sem acesso ao cadastro/edição de atividades do catálogo geral.
- **História de usuário:**
  - *Como visitante ou aluno*, quero abrir e jogar qualquer atividade do catálogo sem precisar fazer login ou criar conta, para praticar inglês rapidamente e sem barreiras.
  - *Como administrador da plataforma*, quero que apenas o meu e-mail cadastrado tenha permissão de cadastrar, editar e publicar atividades, garantindo a integridade e qualidade do catálogo do Fun English.
- **Como saberemos que deu certo:**
  - 100% dos links de atividades abrem e rodam sem exigir login no desktop e mobile em aba anônima;
  - Tentativas de acessar `/admin` ou criar atividades com qualquer usuário que não seja o e-mail do ADM resultam em bloqueio ("Não autorizado") e 0 erros no Firestore.

---

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | **Acesso Livre ao Player de Atividades:** Remover o wrapper `<RequireAuth>` das páginas `/play/[slug]` e `/play-shell`, permitindo renderização imediata do jogo para usuários anônimos. | P0 | CA01, CA02 |
| RF02 | **Execução Graciosa sem Autenticação:** O componente `ActivityPlayer`, suas opções (embaralhar, equipes, cronômetro) e seus plugins devem funcionar perfeitamente quando `user == null`, sem registrar histórico de usuário no Firestore e sem lançar erros no console. | P0 | CA02 |
| RF03 | **Recursos Condicionais no Player:** O botão "Enviar tarefa" (`SendHomeworkButton`) e a ação de favoritar continuam visíveis apenas para professores logados ou exibem modal informativo de login quando acionados por usuários anônimos. | P1 | CA03 |
| RF04 | **Identificação do Administrador por E-mail:** Definir uma configuração centralizada do e-mail do administrador (`ADMIN_EMAIL`, configurável via variável de ambiente `NEXT_PUBLIC_ADMIN_EMAIL` com fallback para `nfgbrentano@gmail.com`). | P0 | CA04, CA05 |
| RF05 | **Guarda de Acesso ao Painel Admin (`AdminGuard`):** Acesso às rotas `/admin`, `/admin/new`, `/admin/edit`, `/admin/coverage`, `/admin/images` e `/admin/settings` restrito exclusivamente ao usuário autenticado cujo e-mail corresponda ao `ADMIN_EMAIL` e que possua a custom claim `admin: true`. | P0 | CA04, CA05 |
| RF06 | **Bloqueio de Usuários Não Autorizados:** Usuários não logados que tentarem acessar `/admin/*` são redirecionados para `/login`. Usuários logados cujo e-mail não seja o de administrador recebem tela amigável de "Acesso Não Autorizado" e botão de retorno para o `/dashboard` ou página inicial. | P0 | CA05 |
| RF07 | **Regras de Segurança do Firestore (`firestore.rules`):** Assegurar que as operações de escrita (`create`, `update`, `delete`) na coleção `activities` e no documento `catalog/index` exijam que o usuário seja o administrador verificado (`isAdmin()`). | P0 | CA06 |
| RF08 | **Exibição Condicional do Link Admin no Menu:** No menu do usuário (`AccountMenu`), o item para acessar o "Painel Admin" deve ser renderizado apenas se o usuário logado for o administrador cadastrado. | P1 | CA07 |
| RF09 | **Script de Concessão de Privilégios (`npm run set-admin`):** O script de linha de comando continua funcional para atribuir a claim `admin: true` no Firebase Auth ao e-mail do administrador. | P0 | CA08 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | **Performance de Carregamento (Zero Flash de Login):** Ao acessar `/play/[slug]`, a página estática pré-renderizada deve carregar instantaneamente, sem nenhum bloqueio de roteamento de autenticação por cliente. | P0 | CA01 |
| RNF02 | **Segurança em Camadas:** A proteção do cadastro de atividades deve ocorrer tanto no nível da interface (Next.js components) quanto no nível das regras do banco de dados (Cloud Firestore Security Rules). | P0 | CA05, CA06 |
| RNF03 | **SEO e Indexação Preservados:** Páginas `/play/[slug]` mantêm metadados JSON-LD e tags canônicas abertas aos indexadores de busca (Googlebot), enquanto rotas `/admin/*` permanecem com `noindex`. | P0 | CA01 |
| RNF04 | **Compatibilidade de Modos:** O modo aluno (`?mode=student`) continua operando normalmente sem requerer login. | P0 | CA02 |

### Dependências técnicas

- Páginas do player: `src/app/play/[slug]/page.tsx` e `src/app/play-shell/page.tsx`.
- Componentes de autenticação e guarda: `src/components/auth/require-auth.tsx` e `src/components/admin/admin-guard.tsx`.
- Hooks de autorização: `src/lib/admin/use-is-admin.ts` e `src/lib/auth/use-auth.ts`.
- Menu de conta: `src/components/layout/account-area.tsx`.
- Regras de segurança do banco: `firestore.rules`.
- Constantes do site e variáveis de ambiente: `src/lib/site.ts` e `src/lib/env.ts`.

### Recursos necessários

- E-mail cadastrado do administrador: `nfgbrentano@gmail.com` (definido em configuração).
- Conta de teste sem privilégios (professor comum) para validação negativa de acesso ao painel admin.

---

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado um usuário anônimo (não logado), quando ele navega diretamente para qualquer URL de atividade publicada (ex.: `/play/daily-routines-quiz`), então a página carrega de imediato, a introdução é exibida e nenhum redirecionamento para `/login` ocorre.
- [x] **CA02:** Dado um usuário não logado jogando uma atividade, quando ele clica em "Começar" (Start), joga as rodadas e conclui a atividade, então o jogo flui normalmente, a tela de resultados é exibida e 0 erros são registrados no console.
- [x] **CA03:** Dado um usuário não autenticado na tela de introdução de uma atividade, quando ele visualiza as opções, então botões exclusivos de gestão do professor (como "Enviar tarefa") não são exibidos ou solicitam login ao clicar.
- [x] **CA04:** Dado o usuário logado com o e-mail cadastrado como ADM (`nfgbrentano@gmail.com`) e com a claim de admin, quando ele acessa `/admin` ou `/admin/new`, então o painel de administração e o formulário de cadastro de atividades abrem com sucesso.
- [x] **CA05 (negativo):** Dado um usuário logado cujo e-mail **não** é o e-mail de administrador (ex.: `professor.teste@gmail.com`), quando ele tenta acessar `/admin` ou qualquer sub-rota (`/admin/new`, `/admin/edit`), então ele é bloqueado com a mensagem "Acesso não autorizado" e nenhuma ferramenta de criação/edição é exibida.
- [x] **CA06 (segurança backend):** Dado um usuário sem credenciais de administrador, quando uma tentativa de requisição de escrita (create, update, delete) é enviada para a coleção `/activities` no Firestore, então a operação é rejeitada pelas regras de segurança com erro de permissão negada (`PERMISSION_DENIED`).
- [x] **CA07:** Dado o usuário administrador autenticado, quando ele abre o menu de perfil no cabeçalho do site (`AccountMenu`), então uma opção "Painel Admin" (ou "Admin") é exibida; para usuários não-administradores, essa opção permanece oculta.
- [x] **CA08:** Dado o terminal do projeto, quando o comando `npm run set-admin -- nfgbrentano@gmail.com` é executado, então a claim `admin: true` é atribuída com sucesso ao usuário correspondente.
- [x] **CA09 (caso limite):** Dado um acesso à rota `/play-shell` (atividade publicada dinamicamente sem página estática pré-compilada) por um visitante anônimo, quando a página é carregada, então o player dinâmico funciona sem exigir login.

---

## O que a atividade não inclui

- **Criação de sistema multi-tenant de autores de conteúdo:** motivo: o objetivo específico e explícito é centralizar o cadastro de atividades exclusivamente no administrador cadastrado.
- **Paywall ou cobrança por atividades:** motivo: o acesso às atividades passa a ser livre e gratuito para visitantes e alunos; cobranças ou planos futuros aplicam-se a serviços adicionais (agendamento 1:1, portal do aluno avançado).
- **Alteração nas áreas de professor (`/dashboard`, `/lousa`, `/classes`):** motivo: professores cadastrados continuam tendo acesso normal às suas ferramentas de gerenciamento de turmas, planejamento e lousa.

### Considerado para o futuro (P2)

- Possibilidade de configurar múltiplos e-mails de administradores adicionais através de lista separada por vírgula em variável de ambiente.
- Painel para o administrador auditar logs de atividades jogadas anonimamente.
- Opção para professores criarem atividades privadas (apenas para suas próprias turmas), sem publicação no catálogo geral.

---

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O e-mail do ADM deve ser fixo no código (`src/lib/site.ts`) ou configurável via variável de ambiente? | PO / Dev | Não | Recomendado configurável via `NEXT_PUBLIC_ADMIN_EMAIL` com fallback para `nfgbrentano@gmail.com`. |
| D02 | Usuários anônimos podem salvar pontuação no ranking? | PO | Não | Não há ranking público global; progresso pessoal continua sendo salvo apenas para usuários logados. |

---

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Acesso anônimo à atividade estática | E2E / Manual | CA01, CA02 | Abrir janela anônima e acessar `/play/any-activity` | Carrega normalmente, joga até o final sem pedir login |
| CT02 | Acesso anônimo à atividade via shell | E2E / Manual | CA09 | Abrir janela anônima e acessar rota dinâmica `/play-shell` | Carrega o player sem redirecionar para `/login` |
| CT03 | Acesso ao admin com e-mail do ADM | E2E / Manual | CA04, CA07 | Fazer login com `nfgbrentano@gmail.com` e acessar `/admin/new` | Formulário de criação de atividade disponível e link visível no menu |
| CT04 | Tentativa de acesso ao admin por professor comum | E2E / Manual | CA05 | Fazer login com conta de professor regular e acessar `/admin` | Tela de "Acesso não autorizado" exibida |
| CT05 | Tentativa de escrita direta no Firestore | Integração (Emulador) | CA06 | Tentar criar documento em `/activities` com token de professor comum | Rejeitado por `PERMISSION_DENIED` |
| CT06 | Execução do script set-admin | Unit / Script | CA08 | Executar `npm run set-admin -- nfgbrentano@gmail.com` | Claim `admin: true` confirmada no Firebase Auth |

---

## URL Complementar

- Documentação técnica:
  - `SDD/DONE/2026-09-30_painel-admin-de-conteudo.md` (especificação inicial do painel admin)
  - `SDD/DONE/2026-10-02_login-obrigatorio-para-atividades.md` (especificação anterior de login obrigatório que está sendo revertida)
- Protótipo / mockup: N/A
- Discussões relacionadas: Decisão de produto para aumentar a adesão do público e facilidade de acesso de novos alunos e visitantes.
- Referências de design: Catálogo e player abertos do Fun English
- Requisitos originais: Solicitação do usuário para remover a necessidade de acesso/login para atividades e restringir o cadastro de atividades apenas ao ADM (e-mail cadastrado).
- Issue / PR relacionado: N/A
