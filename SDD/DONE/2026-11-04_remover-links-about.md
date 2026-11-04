# [CHORE] Remover links externos da página About

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-11-04 · **Atualizada em:** 2026-11-04
> **Contexto:** Ajuste no conteúdo da página Sobre para remover links externos mantendo o texto informativo e institucional.

## Detalhes da Atividade

- **O que precisa ser feito:** Remover todos os links externos adicionados na seção da Teacher Dani em `content/pages/about.md` (links para Skylimit Idiomas, Facebook, ESL English Listening e TalkEnglish), mantendo os textos descritivos, nomes das ferramentas e dicas como texto simples.
- **Problema e evidência:** A inclusão de links externos em páginas institucionais pode dispersar a navegação dos usuários para fora do site Fun English e gerar dependência de URLs de terceiros.
- **Impacto de não fazer:** Visitantes clicam em links externos e saem da plataforma.
- **Para quem é destinado:** Visitantes e professores que leem a página `/about`.
- **História de usuário:** Como visitante da página Sobre, quero ler a biografia e dicas pedagógicas da Teacher Dani de forma clara e fluida, sem links que me redirecionem para fora do site.
- **Como saberemos que deu certo:** A página `/about` renderizada não contém links externos na seção da Teacher Dani; 0 links quebrados ou saídas indesejadas; build estático sem erros.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Converter links externos de artigos e materiais da Skylimit Idiomas em texto plano informativo. | P0 | CA01 |
| RF02 | Converter links externos das ferramentas de listening recomendadas (ESL Lab e TalkEnglish) em texto plano. | P0 | CA01 |
| RF03 | Manter o link interno de contato (`/contact`) preservado para suporte. | P0 | CA02 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Formatação Markdown válida e compatível com o parser `marked` do build. | P0 | CA01 |

### Dependências técnicas

- Arquivo de conteúdo: `content/pages/about.md`.

### Recursos necessários

- N/A

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que um usuário acessa `/about`, quando ele lê a seção da Teacher Dani, então todo o conteúdo sobre a Skylimit Idiomas, adjetivos, expressões e ferramentas de listening é exibido como texto normal sem nenhum link externo clicável.
- [x] **CA02:** Dado que o usuário lê a seção "How the activities are made", quando visualiza o link para relatar erros, então o link interno `/contact` permanece funcional.

## O que a atividade não inclui

- Alteração na Home Page ou em outras páginas: motivo: o pedido é específico para remover os links da página About.

### Considerado para o futuro (P2)

- N/A

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Manter o link interno `/contact`? | PO | Não | Sim, apenas links externos são removidos. |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Verificação de links na página About | Manual / E2E | CA01, CA02 | Inspecionar elementos `<a>` em `/about` | Nenhum link externo para skylimit, facebook ou esl-lab |

## URL Complementar

- Documentação técnica: N/A
- Protótipo / mockup: N/A
- Discussões relacionadas: N/A
- Referências de design: N/A
- Requisitos originais: Solicitação do usuário: "pode tirar os links do about"
- Issue / PR relacionado: N/A
