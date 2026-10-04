# [FEAT] Atualizar todos os prompts de imagens com resolução e proporção adequadas

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-03 · **Atualizada em:** 2026-10-03

## Detalhes da Atividade

- **O que precisa ser feito:** Atualizar todos os prompts de imagens armazenados nas atividades do repositório (`content/activities/`) e as funções geradoras de prompts no código para incluir explicitamente a proporção de tela adequada: `aspect ratio 16:10` para thumbnails e artes de categorias, e `square aspect ratio 1:1` para cards de opções de quiz, evitando duplicações e assegurando que ferramentas de IA generativa gerem arquivos nas proporções esperadas pelo sistema.
- **Problema e evidência:** Anteriormente, os 81 arquivos de atividades possuíam prompts sem instrução de aspect ratio no texto. Quando criadores ou ferramentas externas geram imagens com proporções arbitrárias (ex.: 1:1 ou 16:9 para thumbnails), o recorte posterior ou exibição visual sofre perdas de composição ou cortes indesejados.
- **Impacto de não fazer:** Imagens geradas com corte inadequado, elementos essenciais cortados no enquadramento 16:10 e necessidade constante de ajustes manuais nas imagens.
- **Para quem é destinado:** Administradores, criadores de conteúdo e ferramentas geradoras de imagem por IA.
- **História de usuário:** Como criador de conteúdo, quero que o prompt gerado para cada imagem informe explicitamente o aspect ratio adequado (16:10 para thumbnail e 1:1 para opções), para que a ferramenta de IA já componha a imagem na proporção certa.
- **Como saberemos que deu certo:** 100% dos thumbnails do catálogo possuem a instrução de aspect ratio 16:10 no prompt; as funções do admin constroem o prompt dinamicamente com base no destino da imagem; `npm run seed:check` e `npm test` continuam com 100% de sucesso.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Todos os thumbnails (`thumb.webp`) e artes em `/categories/` devem conter o sufixo `aspect ratio 16:10` no prompt | P0 | CA01 |
| RF02 | Imagens designadas para opções de resposta (`-option-*.webp`) devem conter o sufixo `square aspect ratio 1:1` no prompt | P1 | CA02 |
| RF03 | As funções de geração de prompt no admin (`promptFromAlt`, `findMissingImages`, `planImages`, `fillMissingPrompts`) devem anexar dinamicamente a proporção correspondente ao caminho da imagem | P0 | CA03 |
| RF04 | O guia de estilo de imagem (`content/prompts/image-style.md`) deve ser atualizado para documentar formalmente essas proporções | P1 | CA04 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Idempotência: rodar os scripts de planejamento ou atualização de prompts não pode duplicar sufixos de proporção | P0 | CA01, CA05 |
| RNF02 | Validade dos dados: todos os 81 arquivos JSON continuam estritamente compatíveis com o esquema Zod (`npm run seed:check`) | P0 | CA05 |
| RNF03 | Preservação do estilo visual: a descrição de assunto (`alt`) e os modificadores de estilo artístico são mantidos intactos | P0 | CA01 |

### Dependências técnicas

- Esquema Zod de imagens (`src/lib/activities/schema/common.ts`).
- Utilitários de imagens do admin (`src/lib/admin/plan-images.ts`, `missing-images.ts`, `image-paths.tsx`).
- Script de seed e suíte vitest.

### Recursos necessários

- Acesso aos arquivos em `content/activities/` e `src/lib/admin/`.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado qualquer thumbnail no catálogo (`thumb.webp` ou `/categories/`), quando inspeciono o campo `prompt`, então ele termina com ou inclui `aspect ratio 16:10`. _(validado: 81 de 81 thumbnails atualizados com sucesso)_
- [x] **CA02:** Dado qualquer imagem de opção de quiz (`-option-*.webp`), quando inspeciono o campo `prompt`, então ele inclui `square aspect ratio 1:1`. _(validado nos geradores de prompts e JSONs de atividades)_
- [x] **CA03:** Dado o clique no botão "Write prompt from alt" no editor admin, quando a imagem for um thumbnail, o prompt gerado deve conter `aspect ratio 16:10`. _(validado em src/components/admin/content/image-paths.tsx e image-fields.tsx)_
- [x] **CA04:** Dado o arquivo `content/prompts/image-style.md`, quando o leio, então constam as orientações de proporção 16:10 para thumbnails e 1:1 para opções. _(validado no guia de estilo de imagens)_
- [x] **CA05:** Dado a execução de `npm run seed:check` e `npm test`, quando finalizados, então 100% dos testes passam sem erros. _(validado: 81 arquivos válidos e 691 testes vitest passando)_

### Notas de implementação

- Todos os 81 arquivos JSON em `content/activities/` foram atualizados via `scripts/update-image-prompts-ratio.ts`.
- As funções geradoras de prompt (`promptFromAlt`, `findMissingImages`, `findMissingSiteImages`, `planImages`, `fillMissingPrompts`) agora injetam dinamicamente o aspect ratio adequado com base no caminho de destino do arquivo.
- O script é idempotente e pode ser executado a qualquer momento via `npm run images:update-prompts`.

## O que a atividade não inclui

- Regeração física imediata dos arquivos WebP já existentes: motivo: as imagens físicas já existentes no repositório foram redimensionadas/cropadas pelo sharp; os prompts atualizados instruem as novas gerações e regenerações.

### Considerado para o futuro (P2)

- Suporte a geração direta de imagem dentro da interface do admin com passagem automática de aspect ratio para a API do modelo generativo.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | As imagens de conteúdo gerais devem ter proporção fixa obrigatória? | PO | Não | Mantêm o enquadramento natural ou landscape livre, limitado a largura de 960px no upload. |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Verificação de prompts de thumbnails | unit / script | CA01 | Inspecionar prompts de todos os 81 thumbnails | 100% contêm 'aspect ratio 16:10' |
| CT02 | Verificação de prompts de opções | unit / script | CA02 | Inspecionar prompts de opções planejadas | Contêm 'square aspect ratio 1:1' |
| CT03 | Prompt gerado dinamicamente no admin | unit | CA03 | Testar `promptFromAlt` com caminhos de thumbnail e content | Retorna sufixo correto para cada tipo |
| CT04 | Validação global de integridade | integração | CA05 | Rodar `npm run seed:check` e `npm test` | 100% de sucesso |

## URL Complementar

- Documentação técnica: `content/prompts/image-style.md`
- Protótipo / mockup: N/A
- Discussões relacionadas: `SDD/DONE/2026-10-03_auto-resize-imagens-e-prompts.md`
- Referências de design: N/A
- Requisitos originais: Solicitação do usuário para atualizar todos os image prompts para ter a resolução adequada.
- Issue / PR relacionado: https://github.com/nfbrentano/FunEnglish
