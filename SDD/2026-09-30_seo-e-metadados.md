# [SEO] SEO, metadados e compartilhamento social

> **Status:** Rascunho
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-09-30

## Detalhes da Atividade

- **O que precisa ser feito:** Garantir que catálogo, categorias e atividades sejam indexáveis e bem apresentados em buscadores e redes sociais: títulos e descrições únicos, Open Graph/Twitter cards com thumbnail, `sitemap.xml`, `robots.txt`, URLs canônicas e dados estruturados (JSON-LD).
- **Problema e evidência:** Professores buscam no Google termos como "present perfect game ESL" ou "jeopardy ESL kids". Sem SEO, o site depende apenas de divulgação direta.
- **Impacto de não fazer:** Baixa descoberta orgânica; links compartilhados em WhatsApp/Facebook aparecem sem imagem nem título.
- **Para quem é destinado:** Professor de ESL buscando atividades (visitante anônimo vindo do Google ou de redes sociais).
- **História de usuário:** Como professor, quero encontrar atividades do site pelo Google e ver uma prévia bonita quando um colega compartilha um link, para chegar rápido ao conteúdo certo.
- **Como saberemos que deu certo:** Lighthouse SEO = 100 nas páginas públicas; 100% das atividades publicadas no sitemap; prévia com imagem ao colar um link de atividade no WhatsApp.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | `generateMetadata` por página: título no formato "{Atividade} – {Categoria} ESL Activity \| Fun English" e descrição (≤ 160 caracteres) a partir da `description` | P0 | CA01 |
| RF02 | Open Graph e Twitter card com `og:image` = thumbnail da atividade (ou imagem padrão por categoria) | P0 | CA02 |
| RF03 | `sitemap.xml` dinâmico com catálogo, 9 categorias e todas as atividades publicadas (`lastModified` = `updatedAt`) | P0 | CA03 |
| RF04 | `robots.txt` permitindo páginas públicas e bloqueando `/admin`, `/dashboard`, `/login`, `/signup` e URLs com `mode=student` | P0 | CA04 |
| RF05 | URL canônica em todas as páginas; páginas com filtros (`?q=`, `?level=`) apontam o canônico para a URL sem filtros | P0 | CA05 |
| RF06 | JSON-LD `LearningResource` nas páginas de atividade (nome, descrição, nível educacional, `inLanguage: en`, `isAccessibleForFree: true`) e `BreadcrumbList` | P1 | CA06 |
| RF07 | Página de atividade com conteúdo textual indexável fora do jogo (título, descrição, categoria, nível, instruções) renderizado no servidor | P0 | CA07 |
| RF08 | `noindex` em atividades `draft`, dashboard, admin e student mode | P0 | CA08 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Core Web Vitals "Good" em mobile nas páginas públicas (LCP < 2.5 s, INP < 200 ms, CLS < 0.1) | P1 | |
| RNF02 | `<html lang="en">` | P0 | |
| RNF03 | Sitemap gerado com ISR (sem consultar o Firestore a cada requisição de crawler) | P0 | |

### Dependências técnicas

- [FEAT] Catálogo, [FEAT] Página de categoria e [FEAT] Motor de atividades (páginas a otimizar).
- URL base via `NEXT_PUBLIC_SITE_URL` (ver spec de Setup); v1 no domínio padrão do App Hosting (`*.hosted.app`).

### Recursos necessários

- Imagem OG padrão (1200×630) do site e uma por categoria.
- Acesso ao Google Search Console.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado a atividade "Some or Any" (Grammar), quando inspeciono o HTML, então o `<title>` é "Some or Any – Grammar ESL Activity | Fun English" e há `meta description` não vazia.
- [ ] **CA02:** Dado o link de uma atividade, quando o colo no WhatsApp ou no validador de cards, então aparece a prévia com título, descrição e thumbnail.
- [ ] **CA03:** Dado 42 atividades publicadas e 3 em rascunho, quando acesso `/sitemap.xml`, então ele lista as 42 (e não as 3), as 9 categorias e o catálogo.
- [ ] **CA04:** Dado `/robots.txt`, quando o leio, então `/admin` e `/dashboard` estão em `Disallow` e o sitemap está referenciado.
- [ ] **CA05:** Dado `/activities?level=advanced`, quando inspeciono, então o `canonical` aponta para `/activities`.
- [ ] **CA06:** Dado uma página de atividade, quando a valido no Rich Results Test, então o JSON-LD é reconhecido sem erros.
- [ ] **CA07:** Dado JavaScript desabilitado, quando abro uma página de atividade, então título, descrição, categoria e nível estão presentes no HTML.
- [ ] **CA08 (negativo):** Dado uma URL `?mode=student` ou `/dashboard`, quando inspeciono, então há `<meta name="robots" content="noindex">`.

## O que a atividade não inclui

- Blog e conteúdo editorial para SEO: motivo: outra iniciativa.
- Versões em outros idiomas (hreflang): motivo: interface só em inglês na v1.
- Analytics/marketing (GA4, pixels): motivo: exige banner de consentimento; outra spec.

### Considerado para o futuro (P2)

- Blog com artigos para professores.
- Imagens OG geradas dinamicamente (`next/og`) com título da atividade.
- Analytics com consentimento (cookie banner).

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Domínio definitivo antes do lançamento? (canônicos e sitemap dependem dele) | PO | Não | Ainda não haverá domínio próprio: usar o domínio `*.hosted.app` do App Hosting via `NEXT_PUBLIC_SITE_URL`; ao migrar, conectar o domínio próprio no App Hosting, configurar redirect 301 do `*.hosted.app` para o novo e reenviar o sitemap no Search Console |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Title e description | e2e | CA01 | Ler `<head>` da atividade | Formato esperado |
| CT02 | Prévia social | manual | CA02 | Colar link no WhatsApp | Card com imagem |
| CT03 | Sitemap | integração | CA03 | Seed 42 + 3 drafts | 42 atividades + 9 categorias + catálogo |
| CT04 | Robots | e2e | CA04 | GET `/robots.txt` | Disallow e Sitemap |
| CT05 | Canônico com filtros | e2e | CA05 | Ler `link[rel=canonical]` | `/activities` |
| CT06 | JSON-LD | manual | CA06 | Rich Results Test | Sem erros |
| CT07 | SSR | e2e | CA07 | Requisição sem JS (`curl`) | Textos no HTML |
| CT08 | Noindex | e2e | CA08 | Ler meta robots | `noindex` |

## URL Complementar

- Documentação técnica: https://nextjs.org/docs/app/building-your-application/optimizing/metadata · https://schema.org/LearningResource
- Protótipo / mockup: N/A.
- Discussões relacionadas: N/A.
- Referências de design: N/A.
- Requisitos originais: Pedido de criar um site semelhante ao Cool English.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
