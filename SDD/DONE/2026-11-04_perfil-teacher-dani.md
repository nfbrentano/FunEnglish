# [FEAT] Destaque da Professora Teacher Dani (Home e About)

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-11-04 · **Atualizada em:** 2026-11-04
> **Contexto:** Apresentação institucional da liderança pedagógica e curadoria de conteúdo educativo da plataforma Fun English.

## Detalhes da Atividade

- **O que precisa ser feito:** Destacar a professora Teacher Dani na plataforma Fun English com:
  1. **Seção de perfil completa na página "About" (`/about` em `content/pages/about.md`):** Detalhando sua trajetória, papel na coordenação pedagógica, abordagem prática de ensino de conversação/listening e suas principais dicas e recursos recomendados de estudo autônomo (com links para suas publicações na Skylimit Idiomas e referências externas).
  2. **Seção de destaque pedagógico na Home Page (`/` em `src/components/pages/home-view.tsx`):** Um bloco visual dedicado que apresenta a Teacher Dani como coordenadora pedagógica e curadora dos conteúdos, transmitindo autoridade educacional, credibilidade para os professores e estudantes, com link "Read more about Teacher Dani" direcionando para `/about`.
  3. **Conteúdo em inglês:** Alinhado com o idioma padrão do site, mantendo todas as referências, links e fontes citadas.
- **Problema e evidência:** Atualmente, a página `/about` cita apenas de forma muito breve que o Fun English é um projeto pessoal de Natanael Brentano, e a Home Page não apresenta quem assina o respaldo pedagógico, a revisão do nível das atividades ou as dicas de aprendizado. Isso deixa a plataforma com aspecto puramente técnico, sem evidenciar a metodologia pedagógica e a experiência docente por trás das atividades.
- **Impacto de não fazer:** Professores e alunos que chegam ao site não conhecem a autoridade e cuidado pedagógico da criação dos materiais; perde-se a oportunidade de engajar com dicas práticas reais de listening e pronúncia testadas em sala de aula.
- **Para quem é destinado:** Professores de ESL que buscam materiais confiáveis e qualificados para suas aulas; alunos autônomos que buscam orientação e dicas de estudo de inglês.
- **História de usuário:** Como professor ou estudante visitante, quero conhecer a professora e coordenadora pedagógica por trás do Fun English e suas dicas práticas de estudo, para confiar na qualidade metodológica das atividades e aprender métodos eficazes de conversação e listening.
- **Como saberemos que deu certo:** A seção da Teacher Dani na página inicial (`/`) renderizada com design harmonioso e responsivo; página `/about` atualizada com biografia, atividades, dicas práticas e links de referência clicáveis funcionando; 0 erros de build e acessibilidade (a11y) preservada.

---

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | **Perfil Pedagógico em `/about`:** Adicionar a seção "Meet Teacher Dani" (ou "Pedagogical Leadership") em `content/pages/about.md` com texto em inglês apresentando a professora, sua atuação em conversação, pronúncia e listening, e links de referência. | P0 | CA01, CA03 |
| RF02 | **Principais Atividades e Dicas da Professora em `/about`:** Estruturar na página Sobre três subseções claras: (1) Coordenação Pedagógica (liderança na Skylimit Idiomas e aprimoramento didático internacional), (2) Abordagem Prática (uso de adjetivos, expressões cotidianas e vocabulário contextual) e (3) Dicas de Listening (uso de séries/filmes com legendas em inglês e ferramentas recomendadas como ESL English Listening, Cyber Listening Lab e TalkEnglish.com). | P0 | CA01, CA03 |
| RF03 | **Destaque Pedagógico na Home Page (`/`):** Criar uma seção em destaque no componente `HomeView` com card ou banner institucional apresentando a Teacher Dani como Coordenadora Pedagógica e criadora de conteúdos do Fun English, com chamada para ação (CTA) que leva para `/about`. | P0 | CA02 |
| RF04 | **Rastreabilidade e Links Externos Seguros:** Todos os links externos citados (Skylimit Idiomas, redes sociais, ferramentas de listening) devem possuir `rel="noopener noreferrer"` e `target="_blank"`. | P0 | CA03 |
| RF05 | **Strings Centralizadas:** As mensagens e rótulos da seção da Home Page devem ser centralizados em `src/lib/strings.ts` (sob `strings.homePage.teacherSpotlight`). | P1 | CA04 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | **Identidade Visual e Tipografia:** O design da seção na Home Page deve seguir o design system existente do Tailwind CSS (classes de tema, bordas sutis, tipografia `font-display` e suporte completo a temas claro/escuro/sépia). | P0 | CA02 |
| RNF02 | **Responsividade:** A seção da Home deve adaptar-se elegantemente em dispositivos móveis (375px) e desktop (1920px), com leitura confortável e alinhamento fluído. | P0 | CA05 |
| RNF03 | **SEO e Metadados:** Os dados estruturados ou texto do `/about` devem enriquecer o SEO do site com informações sobre autoria e liderança pedagógica. | P1 | CA01 |

### Dependências técnicas

- Página e conteúdo Sobre: `src/app/about/page.tsx`, `content/pages/about.md` e `src/lib/pages/content.ts`.
- Componente da Home: `src/components/pages/home-view.tsx`.
- Dicionário de strings: `src/lib/strings.ts`.

### Recursos necessários

- Textos originais e links fornecidos:
  - Artigo Skylimit Adjetivos: `https://skylimitidiomas.com.br/adjetivos-em-ingles-para-descrever-a-personalidade/`
  - Artigo Skylimit Estudar Sozinho: `https://skylimitidiomas.com.br/dicas-para-estudar-ingles-sozinho/`
  - Artigo Material Didático Premiado: `https://skylimitidiomas.com.br/material-didatico-da-skylimit-e-premiado/`
  - Post Skylimit Ciclista / Vocabulário Prático: `https://www.facebook.com/skylimtidiomas/photos/-voc%C3%AA-%C3%A9-ciclista-ou-anda-de-bicicleta-de-vez-em-quando-ent%C3%A3o-salve-este-post-par/4747307878707120/?locale=zh_CN`
  - Sites de listening recomendados: ESL English Listening, Cyber Listening Lab (`https://www.esl-lab.com`), TalkEnglish (`https://www.talkenglish.com`).

---

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que um usuário acessa `/about`, quando a página carrega, então ele visualiza a seção dedicada à Teacher Dani detalhando sua biografia, atuação como coordenadora pedagógica e dicas de estudo.
- [x] **CA02:** Dado que um visitante acessa a Home Page (`/`), quando navega pela página, então encontra uma seção de destaque ("Pedagogical Leadership / Meet Teacher Dani") com resumo de sua abordagem prática e um botão/link que direciona para `/about`.
- [x] **CA03:** Dado os links de artigos e recursos da Teacher Dani na página `/about`, quando o usuário clica em qualquer um dos links, então a página de destino abre em nova aba sem comprometer a navegação do site (`target="_blank"` e `rel="noopener noreferrer"`).
- [x] **CA04:** Dado o arquivo `src/lib/strings.ts`, quando a aplicação compila, então todos os textos da nova seção na Home Page estão devidamente declarados no objeto de strings sem strings mágicas hardcoded no componente.
- [x] **CA05 (responsividade):** Dado um smartphone com tela de 375px de largura, quando o usuário visualiza a seção da professora na Home e no About, então não há overflow horizontal e os textos e links possuem espaçamento e toque confortáveis (mín. 44px para botões).

---

## O que a atividade não inclui

- **Página de blog completa ou sistema de posts no Fun English:** motivo: as dicas da professora são integradas diretamente nas páginas institucionais e links externos.
- **Área restrita ou agendamento direto com a Teacher Dani:** motivo: fora do escopo institucional inicial; agendamentos de aulas particulares seguem a especificação de aulas 1:1.

### Considerado para o futuro (P2)

- Galeria de vídeos curtos com dicas de pronúncia gravadas pela Teacher Dani.
- Filtro no catálogo de atividades para "Recomendadas pela Teacher Dani".

---

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Incluir foto de perfil da Teacher Dani? | PO / Design | Não | Se houver foto/avatar disponível, pode ser adicionado; caso contrário, utiliza-se avatar com ícone/iniciais estilizado harmonioso. |
| D02 | Posicionamento da seção na Home Page: antes ou depois das categorias? | Design | Não | Sugestão: Logo após as categorias ou antes da seção de cadastro/CTA final. |

---

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Renderização na página About | E2E / Manual | CA01 | Acessar `/about` | Conteúdo da Teacher Dani visível e formatado |
| CT02 | Renderização da seção na Home | E2E / Manual | CA02 | Acessar `/` | Seção visível com título, texto e link funcional |
| CT03 | Navegação do link da Home para o About | E2E | CA02 | Clicar no link "Meet Teacher Dani" na Home | Usuário é levado para a página `/about` |
| CT04 | Links externos seguros | Unit / E2E | CA03 | Inspecionar tags `<a>` dos links externos | Atributos `target="_blank"` e `rel="noopener noreferrer"` presentes |
| CT05 | Teste de Responsividade Mobile | Manual | CA05 | Redimensionar viewport para 375px | Layout responsivo sem overflow horizontal |

---

## URL Complementar

- Documentação técnica: `SDD/DONE/2026-09-30_paginas-institucionais.md`
- Protótipo / mockup: N/A
- Discussões relacionadas: Alinhamento das referências pedagógicas da Teacher Dani
- Referências de design: Layout das páginas institucionais e HomeView do Fun English
- Requisitos originais: Solicitação do usuário para pontuar a professora Teacher Dani na página do Fun English com sua biografia, coordenação pedagógica, abordagem prática e dicas de listening
- Issue / PR relacionado: N/A
