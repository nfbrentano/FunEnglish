# [FEAT] Autenticação (Sign up, Log in, Log out, reset de senha)

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Permitir que professores criem conta e façam login com e-mail/senha ou Google via Firebase Authentication, com páginas `/signup`, `/login` e `/reset-password`, logout e criação do perfil do usuário no Firestore.
- **Problema e evidência:** Favoritos e dashboard exigem identificar o usuário. O site de referência oferece "Log in" e "Sign up" no cabeçalho.
- **Impacto de não fazer:** Não há como salvar favoritos nem montar dashboard pessoal.
- **Para quem é destinado:** Professor de ESL (visitante que quer salvar conteúdo).
- **História de usuário:** Como professor, quero criar uma conta rapidamente (de preferência com Google), para salvar minhas atividades favoritas e acessá-las de qualquer dispositivo.
- **Como saberemos que deu certo:** Cadastro com Google em ≤ 2 cliques; cadastro com e-mail em < 1 min; 0 senhas armazenadas pela aplicação (somente Firebase Auth).

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Página `/signup` com nome, e-mail, senha (mín. 8 caracteres) e botão "Continue with Google" | P0 | CA01, CA02 |
| RF02 | Página `/login` com e-mail/senha, "Continue with Google" e link "Forgot password?" | P0 | CA03 |
| RF03 | Página `/reset-password` que envia e-mail de redefinição do Firebase | P0 | CA04 |
| RF04 | Ao criar conta, criar documento `users/{uid}` com `displayName`, `email`, `photoURL`, `createdAt`, `role: "teacher"` | P0 | CA01 |
| RF05 | Logout pelo menu do avatar, redirecionando para `/activities` | P0 | CA05 |
| RF06 | Após login, redirecionar para a página de origem (`?next=`), validando que é uma rota interna | P0 | CA06, CA09 |
| RF07 | Mensagens de erro amigáveis em inglês para: e-mail já usado, senha incorreta, usuário inexistente, senha fraca, muitas tentativas | P0 | CA07 |
| RF08 | Sessão persistente entre recargas; estado de auth disponível via hook/contexto (`useAuth`) | P0 | CA08 |
| RF09 | Guarda **no cliente** para rotas protegidas (`/dashboard`, `/admin`): enquanto o estado de auth carrega, mostra skeleton; sem usuário, redireciona para `/login?next=...`. Não há middleware (site estático); a proteção real dos dados é feita pelas regras do Firestore | P0 | CA06 |
| RF10 | Verificação de e-mail enviada no cadastro (não bloqueante) | P1 | CA01 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Senhas nunca trafegam para servidores próprios; somente SDK do Firebase Auth | P0 | |
| RNF02 | Regras do Firestore: usuário só lê/escreve `users/{uid}` próprio; campo `role` não pode ser alterado pelo cliente | P0 | CA10 |
| RNF03 | Formulários acessíveis (labels, mensagens de erro ligadas por `aria-describedby`) | P0 | CA07 |
| RNF04 | Proteção contra open redirect no parâmetro `next` | P0 | CA09 |

### Dependências técnicas

- [CHORE] Setup do projeto (Firebase configurado).
- [UI] Layout base (área de conta no cabeçalho).

### Recursos necessários

- Provedor Google habilitado no console do Firebase; domínios do Firebase Hosting (`*.web.app` e `*.firebaseapp.com`) adicionados aos domínios autorizados.
- Template de e-mail (verificação/reset) personalizado com o nome "Fun English".

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que estou em `/signup`, quando preencho nome, e-mail válido e senha de 8+ caracteres e envio, então a conta é criada, o documento `users/{uid}` existe com `role: "teacher"`, recebo e-mail de verificação e fico logado.
- [ ] **CA02:** Dado que clico "Continue with Google", quando autorizo no popup, então fico logado e, se for o primeiro acesso, o documento `users/{uid}` é criado.
- [ ] **CA03:** Dado uma conta existente, quando faço login com e-mail e senha corretos, então o cabeçalho passa a mostrar meu avatar.
- [ ] **CA04:** Dado que informo meu e-mail em `/reset-password`, quando envio, então vejo "If an account exists, we sent you a reset link" (mesma mensagem para e-mail inexistente).
- [ ] **CA05:** Dado que estou logado, quando clico "Log out", então a sessão termina e sou levado a `/activities`.
- [ ] **CA06:** Dado que não estou logado, quando acesso `/dashboard`, então sou redirecionado a `/login?next=/dashboard`, e após o login volto para `/dashboard`.
- [ ] **CA07:** Dado que tento cadastrar um e-mail já existente, quando envio, então vejo "This email is already registered. Log in instead?" junto ao campo.
- [ ] **CA08:** Dado que estou logado, quando recarrego a página ou fecho e reabro o navegador, então continuo logado.
- [ ] **CA09 (negativo):** Dado a URL `/login?next=https://evil.com`, quando faço login, então sou levado a `/activities`, e não ao domínio externo.
- [ ] **CA10 (negativo):** Dado um usuário logado, quando tenta alterar o próprio `role` para `admin` via SDK, então a escrita é negada.

## O que a atividade não inclui

- Login com Apple/Microsoft/Facebook: motivo: baixo impacto; Google cobre a maioria dos professores.
- Contas de alunos: motivo: alunos acessam por link compartilhado sem login.
- Exclusão de conta pela UI: motivo: pode ser feita manualmente sob pedido na v1.
- Planos de equipe/escola: motivo: sem pagamento na v1.

### Considerado para o futuro (P2)

- Página de perfil (editar nome/foto, excluir conta — requisito LGPD/GDPR).
- Login com Microsoft (comum em escolas).
- Contas de equipe (Team Plan) com gerenciamento de membros.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Exigir verificação de e-mail para usar favoritos? | PO | Não | Sugestão: não exigir na v1 |
| D02 | Coletar dados extras no cadastro (país, tipo de escola)? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Cadastro por e-mail | e2e (emulador) | CA01 | Preencher e enviar `/signup` | Usuário + doc criados |
| CT02 | Google | manual | CA02 | Clicar Google em produção/preview | Logado, doc criado |
| CT03 | Login | e2e (emulador) | CA03 | Login com credenciais de teste do seed | Avatar no header |
| CT04 | Reset | e2e (emulador) | CA04 | Enviar e-mail existente e inexistente | Mesma mensagem |
| CT05 | Logout | e2e | CA05 | Clicar Log out | Redireciona, header de visitante |
| CT06 | Rota protegida | e2e | CA06 | Acessar `/dashboard` deslogado | Redirect com `next` e retorno |
| CT07 | E-mail duplicado | e2e (emulador) | CA07 | Cadastrar e-mail existente | Mensagem amigável |
| CT08 | Persistência | e2e | CA08 | Logar e recarregar | Continua logado |
| CT09 | Open redirect | unit | CA09 | `safeNext("https://evil.com")` | Retorna `/activities` |
| CT10 | Regras de role | integração | CA10 | rules-unit-testing alterando `role` | `PERMISSION_DENIED` |

## URL Complementar

- Documentação técnica: https://firebase.google.com/docs/auth/web/start · https://firebase.google.com/docs/auth/web/google-signin
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: https://www.coolenglish.org/login · https://www.coolenglish.org/signup
- Requisitos originais: Escopo v1 definido: login + favoritos, sem pagamento.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
