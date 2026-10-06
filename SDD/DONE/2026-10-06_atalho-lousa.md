# [FEAT] Atalho e Página Dedicada para Lousa Digital

> **Status:** Concluída
> **Autor:** AI · **Revisor:** Natanael Brentano · **Criada em:** 2026-10-06 · **Atualizada em:** 2026-10-06

## Detalhes da Atividade

- **O que precisa ser feito:** Criar uma rota dedicada `/lousa` (e `/whiteboard` como redirect/alias) acessível diretamente, adicionando atalhos no cabeçalho de navegação (para professores) e um card/botão de acesso rápido no Dashboard do professor. A página deve carregar a lousa completa com ferramentas de desenho, marca-texto, caixas de texto, colagem de imagens e exportação para PNG, com opção de conectar/iniciar sala ao vivo para compartilhamento em tempo real.
- **Problema e evidência:** Em produção, a lousa só podia ser acessada se o professor iniciasse previamente uma turma/sessão ativa em `Start class`. Professores que desejam desenhar rapidamente, preparar material antes da aula ou usar o quadro branco livremente não encontravam a lousa na navegação do site.
- **Impacto de não fazer:** A funcionalidade de lousa permanece oculta para a maioria dos usuários e inacessível fora de uma sessão com turma formalmente iniciada.
- **Para quem é destinado:** Professores autenticados que desejam utilizar a lousa a qualquer momento (em sala presencial projetada, preparação de aula ou aula remota).
- **História de usuário:** Como professor, quero acessar a lousa através de um atalho no Dashboard e no menu superior, para poder utilizá-la imediatamente sem precisar abrir e gerenciar uma sessão de turma previamente.
- **Como saberemos que deu certo:** Quando um professor logado puder clicar no botão "Lousa" no menu ou no Dashboard, ser direcionado para `/lousa`, e utilizar todas as ferramentas de desenho e texto com zero atrito (<= 1 clique a partir do Dashboard).

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Criar a rota de página `/lousa` exibindo a lousa digital em visualização expandida/tela cheia. | P0 | CA01 |
| RF02 | Adicionar um link/botão "Lousa" na navegação superior (`SiteHeader` / `AccountArea`) visível para professores logados. | P0 | CA02 |
| RF03 | Adicionar um botão de ação rápida "Abrir Lousa" no painel principal do professor (`/dashboard`). | P0 | CA03 |
| RF04 | A página da lousa deve carregar as ferramentas completas: caneta (cores e espessuras), marca-texto, borracha, caixas de texto, multi-páginas e exportar PNG. | P0 | CA04 |
| RF05 | A página deve oferecer botão integrado para iniciar/abrir Sala Ao Vivo (Live Room) para compartilhamento em tempo real com alunos. | P1 | CA05 |
| RF06 | Redirecionar `/whiteboard` para `/lousa`. | P1 | CA06 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | A página `/lousa` deve ser responsiva e adaptar o canvas para diferentes resoluções de tela e dispositivos touch (Pointer Events). | P0 | CA01 |
| RNF02 | Acesso restrito a professores ou usuários logados (se deslogado, redireciona para `/login?next=/lousa`). | P0 | CA07 |
| RNF03 | Carregamento da página e canvas em menos de 1 segundo em conexões padrão. | P1 | |

### Dependências técnicas

- Componente de lousa existente (`ClassroomBoard`).
- Contexto de Live Room (`useLiveRoom`).
- Sistema de autenticação (`useAuth`).

### Recursos necessários

- Ícone de quadro/lápis da biblioteca `lucide-react`.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado um professor logado, quando ele acessa `/lousa`, então a página exibe a lousa digital interativa em área cheia com a barra de ferramentas completa.
- [x] **CA02:** Dado um professor logado, quando ele visualiza o cabeçalho superior do site, então o link "Lousa" está visível e ao clicar direciona para `/lousa`.
- [x] **CA03:** Dado um professor no Dashboard (`/dashboard`), quando ele visualiza as ações rápidas, então há um botão "Abrir Lousa" que o leva diretamente para `/lousa`.
- [x] **CA04:** Dado o professor na página `/lousa`, quando ele utiliza caneta, texto ou borracha, então os traços são renderizados e podem ser exportados como PNG.
- [x] **CA05:** Dado o professor na página `/lousa`, quando ele clica para ativar a sala ao vivo, então uma Live Room é iniciada e o código é exibido para os alunos poderem acompanhar.
- [x] **CA06:** Dado um usuário acessando `/whiteboard`, quando a rota carrega, então ele é redirecionado para `/lousa`.
- [x] **CA07:** Dado um usuário anônimo acessando `/lousa`, quando a página carrega, então ele é redirecionado para a tela de login.

## O que a atividade não inclui

- Permitir que alunos editem ou criem salas de lousa independentes: motivo: a lousa é uma ferramenta de condução pedagógica do professor.
- Histórico compartilhado com turmas passadas fora de sessão: motivo: a lousa standalone tem persistência local rápida; persistência por turma continua atrelada às sessões de aula.

### Considerado para o futuro (P2)

- Salvar templates de lousa customizados do professor na nuvem.
- Gravação em vídeo dos traços do quadro.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | A lousa standalone deve sincronizar com o resumo de aula? | Dev | Não | Não, é uma sessão de quadro livre independente, mas se houver sessão de turma em andamento pode integrar. |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Acesso direto à rota `/lousa` | manual / e2e | CA01, CA04 | 1. Logar como professor.<br>2. Navegar para `/lousa`. | A lousa abre com todas as ferramentas de desenho e texto. |
| CT02 | Atalho no cabeçalho | manual | CA02 | 1. Logar como professor.<br>2. Observar menu superior. | Link "Lousa" visível; ao clicar, abre `/lousa`. |
| CT03 | Atalho no Dashboard | manual | CA03 | 1. Acessar `/dashboard`.<br>2. Clicar no botão da Lousa. | Redireciona para `/lousa`. |
| CT04 | Redirecionamento de `/whiteboard` | manual | CA06 | 1. Digitar `/whiteboard` no navegador. | Redireciona para `/lousa`. |
| CT05 | Acesso não autenticado | manual / unit | CA07 | 1. Deslogar.<br>2. Tentar acessar `/lousa`. | Redireciona para `/login?next=/lousa`. |

## URL Complementar

- Documentação técnica: SDD/DONE/2026-10-03_07-lousa-virtual.md e SDD/DONE/2026-10-06_lousa-interativa.md
- Protótipo / mockup: N/A
- Discussões relacionadas: Pergunta do usuário sobre acesso em produção
- Referências de design: UI padrão do Fun English (tema HSL, Tailwind, Lucide icons)
- Requisitos originais: Solicitação do usuário de criar atalho para a lousa
- Issue / PR relacionado: N/A
