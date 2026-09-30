# [UI] Layout base, cabeçalho, barra de categorias e rodapé

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Criar o layout global do site (em inglês): cabeçalho fixo com logo, links (Home, Activities) e botões Log in / Sign up (ou avatar quando logado); barra horizontal de categorias com ícone e cor por categoria; barra de navegação inferior no mobile; rodapé com links institucionais; e o design system base (cores, tipografia, temas, botões, badges, cards).
- **Identidade visual (decisão):** a *estrutura* segue o Cool English (hero com busca, barra de categorias, carrosséis de cards); a *estética* segue o site nfgbrentano.art.br: visual minimalista e elegante, muito espaço em branco, títulos em serifa **Cormorant Garamond**, interface em `system-ui`, acento dourado, bordas sutis, transições suaves de fade e três temas (dark, light, sepia). Tokens de referência do nfgbrentano.art.br:
  - Dark: `--bg-primary #050505`, `--bg-secondary #0a0a0a`, `--bg-elevated #121212`, `--text-primary #e2e2e2`, `--text-secondary #a3a3a3`, `--text-muted #8a8a8a`, `--accent #c5a880`, `--border-subtle #1a1a1a`, `--border-strong #333`.
  - Light: `--bg-primary #fdfdfd`, `--bg-elevated #fff`, `--text-primary #1a1a1a`, `--text-secondary #4a4a4a`, `--accent #7a6441`, `--border-subtle #eee`.
  - Sepia: `--bg-primary #f4ecd8`, `--bg-elevated #faf6ec`, `--text-primary #433422`, `--accent #735610`, `--border-subtle #d9cdb3`.
  - Estados: `--error #cc4a4a`, `--success #3a8c54`. Espaçamentos de 0.25rem a 8rem; container principal de 1200 px.
  - As 9 cores de categoria são versões dessaturadas/terrosas, que convivem com o acento dourado nos três temas.
- **Problema e evidência:** O site de referência mantém um cabeçalho limpo e uma barra de categorias rolável (Fun, Grammar, Listening…) visível em todas as páginas de atividades, o que permite trocar de categoria em 1 clique. Sem um layout comum, cada página seria construída de forma inconsistente.
- **Impacto de não fazer:** Navegação inconsistente e retrabalho visual em todas as páginas.
- **Para quem é destinado:** Professor de ESL (visitante ou logado).
- **História de usuário:** Como professor, quero navegar entre categorias e áreas do site a partir de qualquer página, para encontrar atividades rapidamente.
- **Como saberemos que deu certo:** Qualquer categoria é acessível em ≤ 1 clique a partir de qualquer página; Lighthouse Accessibility ≥ 95 no layout; sem rolagem horizontal da página em 360 px.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Cabeçalho fixo (sticky) com logo "Fun English" (link para Home), links "Home" e "Activities" com indicação da página ativa | P0 | CA01 |
| RF02 | Área de conta no cabeçalho: "Log in" e "Sign up" para visitantes; avatar com menu (Dashboard, Log out) para usuários logados | P0 | CA02 |
| RF03 | Barra de categorias com as 9 categorias (ícone + nome + cor), rolável horizontalmente com setas em telas estreitas, destacando a categoria ativa | P0 | CA03 |
| RF04 | Em telas < 768 px, barra de navegação inferior fixa (no estilo do nfgbrentano.art.br) com ícone + rótulo: Activities, Search, Favorites, Account, Settings; o cabeçalho superior fica reduzido ao logo | P0 | CA04 |
| RF05 | Rodapé com: About, FAQ, Contact, Privacy, Terms e links de redes sociais (configuráveis) | P1 | CA05 |
| RF06 | Componentes base reutilizáveis: `Button` (primary/secondary/ghost), `Badge`, `LevelPill`, `CategoryIcon`, `Card`, `Skeleton` | P0 | CA06 |
| RF07 | Página 404 no layout padrão com link para Activities | P1 | CA07 |
| RF08 | Design tokens como CSS custom properties em `:root` e `:root[data-theme="light"\|"sepia"]`, expostos ao Tailwind; nenhuma cor fixa (hardcoded) nos componentes | P0 | CA09 |
| RF09 | Seletor de tema (Dark / Light / Sepia / System) no cabeçalho (desktop) e em Settings (mobile); padrão "System" (segue `prefers-color-scheme`); escolha salva em `localStorage` e aplicada antes da pintura, sem piscar | P0 | CA10 |
| RF10 | Tipografia: Cormorant Garamond (títulos/hero, via `next/font`), `system-ui` (interface), Merriweather opcional para textos longos de leitura (Reading) | P0 | CA09 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Responsivo de 360 px a 1920 px, sem rolagem horizontal da página | P0 | CA04 |
| RNF02 | Contraste de texto WCAG AA (≥ 4.5:1) nos três temas e foco visível em todos os elementos interativos | P0 | CA08 |
| RNF06 | Transições de tema e fade respeitam `prefers-reduced-motion` | P1 | |
| RNF03 | Navegação completa por teclado (Tab/Shift+Tab/Enter/Esc no menu) | P0 | CA08 |
| RNF04 | Toda a interface em inglês; textos centralizados em um arquivo de strings para facilitar i18n futura | P1 | CA01 |
| RNF05 | Fonte carregada via `next/font` sem layout shift (CLS < 0.1) | P1 | |

### Dependências técnicas

- [CHORE] Setup do projeto.
- Lista de categorias do [FEAT] Modelo de dados.
- Estado de autenticação do [FEAT] Autenticação (pode usar mock até lá).

### Recursos necessários

- Logo e favicon do "Fun English" (SVG), no estilo minimalista do nfgbrentano.art.br.
- Ícones de traço fino (ex.: Lucide, como no nfgbrentano.art.br) e paleta dessaturada por categoria.
- Referências visuais: https://www.coolenglish.org/activities (estrutura) e https://nfgbrentano.art.br (estética).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que estou em qualquer página, quando olho o cabeçalho, então vejo o logo, "Home" e "Activities", com o link da página atual destacado.
- [ ] **CA02:** Dado que não estou logado, quando vejo o cabeçalho, então aparecem "Log in" e "Sign up"; dado que estou logado, então aparece meu avatar com menu contendo "Dashboard" e "Log out".
- [ ] **CA03:** Dado que estou na página de uma categoria, quando vejo a barra de categorias, então aquela categoria aparece destacada, e clicar em outra leva à página dela.
- [ ] **CA04:** Dado uma tela de 360 px, quando abro o site, então vejo a barra de navegação inferior com Activities, Search, Favorites, Account e Settings, a barra de categorias rola horizontalmente e a página não tem rolagem horizontal.
- [ ] **CA05:** Dado qualquer página, quando rolo até o fim, então vejo o rodapé com os links institucionais funcionando (ou apontando para páginas placeholder).
- [ ] **CA06:** Dado os componentes base, quando renderizados em uma página de exemplo (`/dev/ui`, só em desenvolvimento), então todas as variações aparecem conforme o design.
- [ ] **CA07:** Dado uma URL inexistente, quando a acesso, então vejo a página 404 com cabeçalho, rodapé e link para Activities.
- [ ] **CA08 (negativo):** Dado que navego só com teclado, quando percorro o cabeçalho e o menu, então nenhum elemento interativo fica sem foco visível ou inalcançável.
- [ ] **CA09:** Dado a página `/dev/ui`, quando alterno entre os temas, então todos os componentes mudam de cor só via tokens (nenhum componente com cor fixa) e os títulos usam Cormorant Garamond.
- [ ] **CA10:** Dado que escolhi o tema "Sepia", quando recarrego a página, então ela já abre em sepia sem piscar outro tema; e dado "System" com o sistema operacional em modo claro, o site abre em Light.

## O que a atividade não inclui

- Conteúdo das páginas institucionais (FAQ, Privacy, Terms): motivo: spec própria.
- Página "Pricing": motivo: sem pagamento na v1.
- Seletor de idioma: motivo: interface apenas em inglês na v1.
- Temas além de Dark/Light/Sepia (ex.: alto contraste): motivo: baixo impacto agora.

### Considerado para o futuro (P2)

- Tema de alto contraste usando os mesmos tokens.
- Internacionalização (PT-BR) reaproveitando o arquivo de strings.
- Link "Pricing" no cabeçalho quando houver planos pagos.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Identidade visual própria (cores/logo) ou seguir estilo próximo ao de referência (verde-azulado + gradiente azul)? | Design/PO | Não | Estrutura do Cool English com a estética do nfgbrentano.art.br (ver "Identidade visual" em Detalhes) |
| D03 | O tema padrão para quem nunca escolheu deve ser "System" ou sempre Dark, como no nfgbrentano.art.br? | PO | Não | Proposta: "System" |
| D02 | Quais redes sociais entram no rodapé? | PO | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Link ativo | e2e | CA01 | Acessar `/activities` | "Activities" com `aria-current="page"` |
| CT02 | Visitante x logado | componente | CA02 | Renderizar header com e sem usuário mockado | Botões ou avatar corretos |
| CT03 | Categoria ativa | e2e | CA03 | Acessar `/activities/grammar` e clicar "Listening" | Destaque muda; URL `/activities/listening` |
| CT04 | Mobile | e2e | CA04 | Viewport 360×800 | Barra inferior visível; `scrollWidth <= innerWidth` |
| CT05 | Rodapé | e2e | CA05 | Clicar cada link do rodapé | Nenhum 404 |
| CT06 | Vitrine de componentes | manual | CA06 | Abrir `/dev/ui` | Variações renderizadas |
| CT07 | 404 | e2e | CA07 | Acessar `/xyz` | Status 404 e link para Activities |
| CT08 | Teclado e contraste | manual + axe | CA08 | Navegar com Tab; rodar axe nos 3 temas | 0 violações sérias |
| CT09 | Tokens e tipografia | manual + lint | CA09 | Alternar temas em `/dev/ui`; `grep` por cores hex em `components/` | Tudo muda; 0 cores fixas |
| CT10 | Persistência do tema sem piscar | e2e | CA10 | Escolher Sepia e recarregar; emular `prefers-color-scheme: light` | `data-theme` correto já no primeiro paint |

## URL Complementar

- Documentação técnica: https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: https://www.coolenglish.org/activities (estrutura: cabeçalho e barra de categorias) · https://nfgbrentano.art.br (estética: tokens, tipografia, temas, barra inferior no mobile)
- Requisitos originais: Pedido de criar um site semelhante ao Cool English, interface em inglês.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
