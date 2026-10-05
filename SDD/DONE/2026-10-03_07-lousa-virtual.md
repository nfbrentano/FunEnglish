# [FEAT] Lousa virtual simples (Whiteboard)

> **Status:** Concluído
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-03 · **Atualizada em:** 2026-10-04  
> **Ordem de implementação:** 07 (sequência 00 a 11) · **Depende de:** 00 (Storage para imagens) · **Por quê nesta posição:** Plugado na aba Board pela spec 08; o RF05 (enviar palavras) é ligado na 08

## Detalhes da Atividade

- **O que precisa ser feito:** Criar uma lousa rápida dentro da sessão de aula, com desenho à mão livre, caixas de texto e imagens coladas, sem abrir outra aba. As palavras digitadas na lousa podem ser enviadas com um clique ao vocabulário dos alunos presentes.
- **Problema e evidência:** Para explicar uma palavra ou corrigir uma frase, o professor abre Jamboard, Miro ou o Paint. A troca de aba aparece na tela projetada e o que foi escrito se perde ao fim da aula.
- **Impacto de não fazer:** O professor continua dependendo de ferramentas externas, e o vocabulário explicado na lousa não chega ao aluno.
- **Para quem é destinado:** Professor conduzindo aula projetada ou com tela compartilhada.
- **História de usuário:** Como professor, quero rabiscar, digitar vocabulário e colar imagens numa lousa ao lado da atividade, para explicar algo na hora sem sair do Fun English.
- **Como saberemos que deu certo:** Da sessão aberta até o primeiro traço em ≤ 1 clique; traço sem atraso perceptível (< 16 ms por quadro) em um notebook comum.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Ferramentas: caneta (3 espessuras, 6 cores), marca-texto, borracha, texto, desfazer/refazer (até 50 passos) e "Clear board" com confirmação | P0 | CA01, CA02 |
| RF02 | Colar imagem com `Ctrl/Cmd+V` ou arrastar e soltar; a imagem pode ser movida e redimensionada | P0 | CA03 |
| RF03 | A lousa abre na aba Board da barra e pode ser expandida para a área central ("Expand board"), sobrepondo a atividade | P0 | CA04 |
| RF04 | Várias páginas por sessão (até 10), com navegação entre elas | P1 | CA05 |
| RF05 | "Send words to students": extrai os textos das caixas de texto, o professor escolhe quais são vocabulário e eles vão para a revisão do resumo da sessão | P1 | CA06 |
| RF06 | Exportar a página atual como PNG | P1 | CA07 |
| RF09 | "Save to Google Drive": envia o PNG da página para o Drive do professor (Google Identity Services, escopo `drive.file`, autorização pontual no clique). Nenhum token é guardado; só o `fileId` fica salvo no resumo da sessão | P2 | |
| RF07 | Fundos: branco, quadriculado, pautado | P2 | |
| RF08 | A lousa acompanha a sessão: recarregar a página ou trocar de dispositivo mantém o conteúdo. Ao encerrar a sessão, as páginas ficam anexadas ao resumo da aula (visíveis no portal) por 90 dias | P0 | CA08 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Traços e textos em formato vetorial, gravados em `users/{uid}/sessions/{id}/board/{pageId}` (com debounce de 2 s e cópia local em IndexedDB para recuperação offline). Imagens coladas vão para o **Cloud Storage** em `boards/{teacherUid}/{sessionId}/{imageId}.webp` (spec 00); a página guarda só o caminho e a posição | P0 | CA08 |
| RNF07 | `storage.rules`: o professor (`teacherUid` do caminho) escreve imagens de até 2 MB e só `image/*`; a leitura é feita pela URL de download com token, compartilhada com os alunos da sala ao vivo (spec 09) e com o portal. A regra de ciclo de vida do bucket apaga `boards/` após 90 dias | P0 | CA09 |
| RNF08 | Ao encerrar, um PNG de cada página é gerado no cliente e enviado para o Storage, para o resumo e o portal mostrarem a lousa sem renderizar os vetores | P1 | |
| RNF02 | Só o texto das caixas (sem traços nem imagens) é salvo em `sessions/{id}.boardText` para o resumo, até 5.000 caracteres | P0 | |
| RNF03 | Imagens coladas são reduzidas no cliente para no máximo 1600 px no maior lado (reaproveitar a lógica de resize do painel admin) | P1 | CA03 |
| RNF04 | Suporte a mouse, touch e caneta (Pointer Events) | P0 | |
| RNF05 | Sem biblioteca pesada: canvas nativo ou uma dependência ≤ 50 KB gzip; a lousa só é carregada (`dynamic import`) quando a aba é aberta | P0 | |
| RNF06 | Botões com `aria-label` e ferramentas acessíveis por teclado | P1 | |

### Dependências técnicas

- [FEAT] Sessão de aula.
- [FEAT] Banco de vocabulário do aluno (para RF05). Sem ele, as palavras ficam só no resumo.
- [CHORE] Infraestrutura do plano Blaze (spec 00): Cloud Storage e `storage.rules`.
- Lógica de redimensionamento de imagem existente (`SDD/DONE/2026-10-03_auto-resize-imagens-e-prompts.md`).

### Recursos necessários

- Ícones das ferramentas (lucide-react já disponível).

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado a aba Board aberta, quando desenho com a caneta vermelha grossa, então o traço aparece em tempo real com essa cor e espessura.
- [x] **CA02:** Dado três traços desenhados, quando aperto desfazer duas vezes e refazer uma, então restam dois traços.
- [x] **CA03:** Dado uma imagem de 4000 px na área de transferência, quando colo na lousa, então ela aparece reduzida para no máximo 1600 px e pode ser movida e redimensionada.
- [x] **CA04:** Dado a lousa na barra lateral, quando clico em "Expand board", então ela ocupa a área central com o mesmo conteúdo, e "Collapse" volta à atividade.
- [x] **CA05:** Dado a página 1 com conteúdo, quando crio a página 2 e volto para a 1, então o conteúdo da página 1 está intacto.
- [x] **CA06:** Dado caixas de texto com "suitcase" e "boarding pass", quando clico em "Send words to students" e confirmo as duas, então elas aparecem na seção de vocabulário da revisão do resumo.
- [x] **CA07:** Dado uma página com desenho e imagem, quando clico em "Export PNG", então baixo um arquivo PNG com o conteúdo visível.
- [x] **CA08 (erro/limite):** Dado uma lousa com conteúdo, quando recarrego a página ou abro a sessão em outro computador, então o conteúdo volta; quando encerro a sessão, as páginas aparecem no resumo da aula; e a sessão seguinte começa com a lousa vazia.
- [x] **CA09 (negativo):** Dado que colo um arquivo que não é imagem (PDF, por exemplo), quando solto na lousa, então nada é inserido e aparece "Only images can be pasted"; e uma tentativa de upload direto no Storage de um arquivo não imagem, maior que 2 MB ou no caminho de outro professor é negada pelas regras.

## O que a atividade não inclui

- Colaboração em tempo real (o aluno desenhando junto): motivo: complexo demais agora.
- Formas geométricas, setas e conectores: motivo: baixo impacto para aula de idioma.
- Reconhecimento de escrita à mão: motivo: complexo demais agora.

### Considerado para o futuro (P2)

- Fundos pautado e quadriculado (RF07).
- "Save to Google Drive" (RF09).

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Usar canvas próprio ou uma biblioteca (ex.: `perfect-freehand` para traços, ~3 KB)? | Dev | Não | |
| D02 | No modo projeção, a lousa deve esconder algo? | PO | Não | Sugestão: não; a lousa é pública por natureza |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Traço com cor e espessura | manual + e2e (snapshot do canvas) | CA01 | Desenhar | Traço vermelho grosso |
| CT02 | Desfazer/refazer | unit (pilha de comandos) | CA02 | 3 traços, desfazer 2x, refazer 1x | 2 traços |
| CT03 | Colar imagem grande | unit (resize) + manual | CA03 | Colar 4000 px | ≤ 1600 px, movível |
| CT04 | Expandir | e2e | CA04 | Expand e Collapse | Mesmo conteúdo |
| CT05 | Páginas | unit | CA05 | Criar página 2 e voltar | Página 1 intacta |
| CT06 | Enviar palavras | integração | CA06 | Selecionar 2 textos | 2 palavras no resumo |
| CT07 | Exportar PNG | e2e (download) | CA07 | Export | Arquivo `.png` baixado |
| CT08 | Persistência | e2e (emulador) | CA08 | Recarregar; outro navegador; encerrar | Conteúdo volta; PNG no resumo; nova lousa vazia |
| CT09 | Arquivo não imagem | unit + integração (storage rules) | CA09 | Soltar PDF; upload direto inválido | Mensagem; upload negado |

## URL Complementar

- Documentação técnica: `SDD/DONE/2026-10-03_auto-resize-imagens-e-prompts.md`.
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: Excalidraw (simplicidade); Classroomscreen (drawing).
- Requisitos originais: "Lousa Virtual Simples (Whiteboard)" (ideias de 2026-10-03).
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
