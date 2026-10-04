# [FEAT] Auto-resize de imagens no upload e melhoria nos prompts de geração

> **Status:** Rascunho
> **Autor:** Antigravity · **Revisor:** N/A · **Criada em:** 2026-10-03 · **Atualizada em:** 2026-10-03

## Detalhes da Atividade

- **O que precisa ser feito:** Implementar no painel administrativo (ou API de upload) o redimensionamento e recorte (crop) automático das imagens enviadas. Além disso, ajustar os prompts de geração de imagem (IA) para que eles instruam explicitamente a IA sobre a proporção (aspect ratio) desejada para cada caso.
- **Problema e evidência:** Atualmente, imagens upadas via painel admin ou geradas por IA não garantem o tamanho e a proporção exigidos pelo sistema (ex.: thumbnails precisam ser 16:10). Com isso, quando o repositório sofre commits (ex.: a partir do admin), os testes de integração do GitHub Actions (`tests/unit/activities/images.test.ts`) falham e bloqueiam o deploy.
- **Impacto de não fazer:** Deploys falhando frequentemente sempre que um novo conteúdo de imagem é adicionado via interface, exigindo que um dev baixe as imagens, as redimensione em script e suba um commit corretivo.
- **Para quem é destinado:** Administradores, criadores de conteúdo do sistema e o time de desenvolvimento.
- **História de usuário:** Como administrador, quero que as imagens sejam ajustadas e cropadas automaticamente para os tamanhos adequados durante o upload, para que eu não quebre o site e seus deploys sem querer. Como criador de conteúdo usando IA, quero que a ferramenta saiba que estou pedindo um thumbnail e já o gere numa proporção adequada (16:10).
- **Como saberemos que deu certo:** 0 quebras no GitHub Actions causadas por erros no `images.test.ts` após inclusões normais de imagens no admin; diminuição de distorções visuais na aplicação.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | O sistema deve redimensionar imagens comuns (pictures) enviadas no admin para a largura máxima de 960px. | P0 | CA01 |
| RF02 | O sistema deve ajustar (crop + resize) thumbnails e artes de categoria para a dimensão de 960x600 (garantindo proporção de 16:10). | P0 | CA02 |
| RF03 | O sistema deve redimensionar imagens classificadas como respostas (answers) para largura máxima de 480px. | P0 | CA03 |
| RF04 | A camada de prompts (na funcionalidade de gerar imagem por IA) deve adicionar dinamicamente instruções de proporção (ex.: "aspect ratio 16:10", "landscape") dependendo do tipo da imagem. | P0 | CA04 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | O formato de saída das imagens manipuladas no servidor deve continuar sendo exclusivamente WebP com uma taxa de compressão configurada (ex: `quality: 80`) para garantir arquivos ≤ 200 KB. | P0 | CA01, CA02, CA03 |
| RNF02 | A biblioteca utilizada no servidor (provavelmente `sharp`) deve ser capaz de fazer essa transformação de forma performática (< 2s de acréscimo no upload). | P1 | CA01, CA02 |

### Dependências técnicas

- O pacote `sharp` já se encontra presente no projeto e deve ser integrado na rota de uploads da API do Next.js.
- Rotas de API que acionam modelos de IA precisam ter seu construtor de prompts localizado e adaptado.

### Recursos necessários

- Acesso ao código fonte do Admin Panel (pastas `/src/app/admin/` ou `/src/app/api/`).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que faço o upload de uma imagem comum ("picture") com tamanho de 2000x2000, quando o upload for finalizado, então a imagem salva no diretório final (WebP) deve ter exatamente 960px de largura, mantendo a altura proporcionalmente (960x960).
- [ ] **CA02:** Dado que faço o upload de uma arte de categoria ou thumbnail original com tamanho 1920x1080 (16:9), quando salvo, então a imagem final WebP deve ter 960x600 (proporção 16:10), cortando sobras de imagem necessárias (fit: cover).
- [ ] **CA03:** Dado que faço o upload de uma imagem designada para um card de resposta com 1200px de largura, quando salvo, então a imagem deve estar com no máximo 480px de largura.
- [ ] **CA04:** Dado que aciono a funcionalidade "Gerar Thumbnail com IA", quando o prompt for construído para o LLM, então ele deve conter os sufixos estritos de proporção "aspect ratio 16:10" (ou similar compreendido pela IA).

## O que a atividade não inclui

- [Processamento e compressão de vídeos]: motivo: o sistema atualmente não lida nem avalia requisitos técnicos estritos para vídeos nos testes que estão falhando; isso seria escopo de outro projeto.
- [Refatoração das imagens preexistentes]: motivo: os scripts corretivos já sanearam as imagens atuais. O foco desta especificação é a prevenção.
- [Redimensionamento client-side via Canvas API no navegador]: motivo: para essa primeira iteração de mitigação, a segurança de que o servidor fará isso (usando `sharp`) com precisão resolve a quebra de deploy de forma mais controlada.

### Considerado para o futuro (P2)

- Fazer crop e resize em client-side (no browser) *antes* do POST do formulário, para poupar banda do cliente (se as imagens passarem a ser originadas de câmeras de celular de alta densidade).

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | É desejável que o usuário escolha o crop (enquadramento manual) via UI do Admin, ou um crop central via \`sharp\` já é o suficiente no momento? | PO | Não | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Upload Server-side Picture | integração | CA01 | 1. Invocar rota de upload enviando uma imagem JPEG de 2500x1200 na categoria "picture". 2. Analisar metadata do output recebido. | WebP com largura 960, altura 461. |
| CT02 | Upload Server-side Thumb | integração | CA02 | 1. Invocar rota de upload de "thumb" com uma imagem JPEG de 1920x1080. 2. Analisar metadata. | WebP com dimensões exatas de 960x600. |
| CT03 | Geração de Prompts de IA | unitário | CA04 | 1. Chamar a função construtora de prompts passando "thumbnail" como tipo. | A string retornada contém instruções para formatar no formato 16:10. |

## URL Complementar

- Documentação técnica: N/A
- Protótipo / mockup: N/A
- Discussões relacionadas: Logs do CI mostrando falhas no test runner de imagens.
- Issue / PR relacionado: N/A
