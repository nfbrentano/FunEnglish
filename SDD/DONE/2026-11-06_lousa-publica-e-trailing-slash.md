# [FEAT] Acesso público à lousa digital e suporte a trailingSlash no GitHub Pages

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** Equipe · **Criada em:** 2026-11-06 · **Atualizada em:** 2026-11-06

## Detalhes da Atividade

- **O que precisa ser feito:** 
  1. Tornar a Lousa Digital (`/lousa`) de acesso público e irrestrito, removendo o bloqueio de autenticação obrigatória (`RequireAuth`) para que professores e visitantes possam desenhar e usar as ferramentas do quadro imediatamente, com salvamento local no `localStorage`.
  2. Disponibilizar o link "Lousa" no cabeçalho de navegação (`SiteHeader`) para todos os visitantes e professores (mantendo oculto apenas no modo aluno).
  3. Ativar `trailingSlash: true` no `next.config.ts` para que todas as rotas exportadas no modo estático gerem estruturas de pastas com `index.html` (ex.: `/lousa/index.html`), garantindo que URLs com barra no final (`https://nfbrentano.github.io/FunEnglish/lousa/`) não retornem HTTP 404 no GitHub Pages.
  4. Garantir que o link gerado para compartilhamento da sala ao vivo (`LiveRoomModal`) respeite o `withBasePath`, prevenindo URLs quebradas sob o subdiretório `/FunEnglish`.
- **Problema e evidência:** Ao acessar a lousa no GitHub Pages (`https://nfbrentano.github.io/FunEnglish/lousa`), usuários deslogados eram redirecionados para a tela de login. Como o domínio `nfbrentano.github.io` necessita de configuração manual no Firebase Console para login com Google, o usuário não conseguia entrar e ficava impedido de usar a lousa. Além disso, acessar `/lousa/` com barra no final resultava em HTTP 404 no GitHub Pages.
- **Impacto de não fazer:** A Lousa permanece bloqueada para qualquer visitante que não possua login prévio ativo, e links com barra final continuam quebrando com erro 404.
- **Para quem é destinado:** Professores, alunos e visitantes que desejam utilizar a lousa interativa sem barreiras de login.
- **História de usuário:** Como professor ou visitante, quero acessar a Lousa diretamente pelo menu principal ou URL sem obrigatoriedade de login, para utilizar as ferramentas de desenho e anotações com rapidez em qualquer dispositivo.
- **Como saberemos que deu certo:** Acesso à URL `/FunEnglish/lousa` e `/FunEnglish/lousa/` carregando a lousa digital interativa em 100% dos testes sem redirecionamento para login; presença do link "Lousa" no menu principal; 100% dos testes unitários passando.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | **Acesso irrestrito à lousa:** Permitir acesso direto à rota `/lousa` sem autenticação obrigatória, utilizando sessão padrão de quadro autônomo (`standalone-whiteboard`) persistida no `localStorage`. | P0 | CA01 |
| RF02 | **Link "Lousa" no cabeçalho:** Exibir o atalho "Lousa" no menu de navegação do `SiteHeader` para todos os usuários deslogados e professores logados. | P0 | CA02 |
| RF03 | **Suporte a trailingSlash no Next.js:** Configurar `trailingSlash: true` no `next.config.ts` para exportar páginas como `[rota]/index.html`. | P0 | CA03 |
| RF04 | **Compatibilidade de URL na Live Room:** Utilizar `withBasePath` na construção de URLs de convite e QR Code no `LiveRoomModal`. | P1 | CA04 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | **Preservação do modo aluno:** Usuários explicitamente logados como aluno (`user.role === "student"`) continuam sem visualizar o atalho da lousa no cabeçalho. | P0 | CA02 |
| RNF02 | **Sem quebra de testes:** 100% da suíte de testes unitários existente deve continuar passando. | P0 | CA05 |

### Dependências técnicas

- Arquivo de configuração: `next.config.ts`.
- Componentes: `src/app/lousa/page.tsx`, `src/components/layout/site-header.tsx`, `src/components/live/live-room-modal.tsx`.
- Utilitário: `src/lib/site.ts`.

### Recursos necessários

- Acesso ao repositório Git para versionamento e PR.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado um usuário não autenticado, quando acessa `/lousa`, então a lousa digital é carregada diretamente com ferramentas de desenho, sem redirecionar para `/login`.
- [x] **CA02:** Dado o cabeçalho do site (`SiteHeader`), quando visualizado por visitante ou professor, então o item "Lousa" está visível no menu de navegação; quando visualizado por aluno, o item não é exibido.
- [x] **CA03:** Dado o build estático exportado (`out/`), quando inspecionado, então as páginas possuem a estrutura de pastas `out/lousa/index.html` e respondem com 200 OK tanto para `/lousa` quanto para `/lousa/`.
- [x] **CA04:** Dado o modal de sala ao vivo (`LiveRoomModal`), quando aberto, então o link gerado inclui o subcaminho `NEXT_PUBLIC_BASE_PATH` quando este estiver configurado.
- [x] **CA05:** Dado o comando `npm test`, quando executado, então 100% dos testes passam sem falhas.

## O que a atividade não inclui

- Remoção do sistema de autenticação para outras áreas protegidas (como `/admin` ou `/dashboard`). Motivo: Áreas administrativas continuam protegidas.
- Alteração no Firebase Console. Motivo: Configuração externa que complementa o login com Google quando necessário.

### Considerado para o futuro (P2)

- Salvar o estado da lousa em nuvem vinculado à conta do professor quando autenticado.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Alunos deslogados devem ter acesso à lousa? | PO | Não | Sim, a lousa pública standalone permite que qualquer usuário desenhe e utilize o quadro livremente. |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Acesso anônimo à lousa | Unit / Integração | CA01 | Renderizar página da lousa sem sessão ativa | Carrega `WhiteboardPageView` diretamente |
| CT02 | Visibilidade no cabeçalho | Unit | CA02 | Renderizar `SiteHeader` como visitante e como aluno | "Lousa" visível para visitante, oculta para aluno |
| CT03 | Export estático com trailingSlash | Integração / Build | CA03 | Rodar `npm run build` e checar `out/lousa/index.html` | Arquivo existe na estrutura de pasta |
| CT04 | Suíte de testes unitários | Unit | CA05 | Rodar `npm test` | Todos os testes passam |

## URL Complementar

- Documentação técnica: https://nextjs.org/docs/app/api-reference/next-config-js/trailingSlash
- Protótipo / mockup: N/A
- Discussões relacionadas: Validação do GitHub Pages e funcionalidade da lousa
- Referências de design: N/A
- Requisitos originais: Solicitação do usuário para liberar a lousa e corrigir problema de acesso no GitHub Pages.
- Issue / PR relacionado: N/A
