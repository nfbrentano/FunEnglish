# [FEAT] Lousa Interativa para Ensino

> **Status:** Rascunho
> **Autor:** AI · **Revisor:** Desenvolvedor · **Criada em:** 2026-10-06 · **Atualizada em:** 2026-10-06

## Detalhes da Atividade

- **O que precisa ser feito:** Criar uma funcionalidade de lousa (whiteboard) interativa dentro do ambiente de sala de aula virtual, permitindo que o professor escreva e desenhe em tempo real para os alunos.
- **Problema e evidência:** Atualmente, durante a aula, o professor não tem uma ferramenta visual livre (como um quadro branco físico) para explicar conceitos, desenhar diagramas ou anotar palavras importantes de forma dinâmica.
- **Impacto de não fazer:** Aulas podem se tornar menos engajadoras e mais difíceis de acompanhar, especialmente para explicações gramaticais ou de vocabulário que demandam apoio visual rápido.
- **Para quem é destinado:** Professores (para desenhar/escrever) e Alunos (para visualizar em tempo real).
- **História de usuário:** Como professor, quero acessar uma lousa interativa na sala de aula virtual, para poder escrever e desenhar livremente durante a explicação do conteúdo.
- **Como saberemos que deu certo:** Quando o professor puder abrir a lousa, desenhar/escrever, e essas interações aparecerem na tela dos alunos com latência imperceptível (< 500ms).

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | O professor deve poder ativar e desativar o modo "Lousa" na interface da aula. | P0 | CA01, CA02 |
| RF02 | A lousa deve fornecer ferramentas básicas: caneta (desenho livre), borracha e limpar tudo. | P0 | CA03 |
| RF03 | O que o professor desenha deve ser sincronizado em tempo real para os alunos presentes na sessão. | P0 | CA04, CA06 |
| RF04 | A lousa deve suportar escolha de cores básicas (ex: preto, vermelho, azul). | P1 | CA05 |
| RF05 | Importação Rápida de Templates/Planos de Fundo (Imagens/PDFs) para a lousa. | P2 | |
| RF06 | Múltiplas Páginas/Quadros (Canvas Multi-página) com navegação. | P2 | |
| RF07 | Ferramenta Laser Pointer (Traço temporário que some após 2 segundos). | P2 | |
| RF08 | Reações Rápidas e Carimbos na Lousa (Stickers/Emojis) disparados pelos alunos. | P2 | |
| RF09 | Modo Co-autoria Controlada ("Passar a Paleta") para um aluno específico desenhar. | P2 | |
| RF10 | Exportação Instantânea para PDF compilando todas as páginas da lousa. | P2 | |
| RF11 | Gravação de Traços (Playback do Quadro) sincronizada cronologicamente. | P2 | |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | A latência da sincronização do desenho deve ser menor que 500ms. O tráfego deve ser otimizado via *throttling* (15-30fps) e agrupamento de coordenadas (*batching*). | P0 | |
| RNF02 | O componente de lousa deve ser responsivo para funcionar bem em telas touch e desktops, usando `touch-action: none` e ajustando o canvas via escala proporcional. | P0 | |
| RNF03 | O uso de memória no cliente não deve exceder limites razoáveis (monitorar degradação de FPS no canvas por uso prolongado). | P0 | |
| RNF04 | O frontend deve lidar graciosamente com instabilidade de rede do professor, armazenando traços em fila e sincronizando (*flush*) ao reconectar. | P1 | |

### Dependências técnicas

- **Firebase Realtime Database (RTDB)** (ou WebSocket dedicado) para lidar com a alta frequência de pequenas mensagens. (Firestore não recomendado devido ao alto custo de *writes*).
- **React-Konva** para renderização, gerenciamento do canvas e escalonamento responsivo.
- **Perfect-Freehand** (opcional) para algoritmos de suavização de traços.

### Recursos necessários

- Ícones para as ferramentas (caneta, borracha, lixeira, paleta de cores).
- Definição da stack técnica em tempo real (Firebase Realtime Database ou WebSocket).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que o professor está na sala de aula, quando ele clica no botão "Abrir Lousa", então a área principal de conteúdo é substituída por um canvas em branco e a barra de ferramentas de desenho é exibida.
- [ ] **CA02:** Dado que a lousa está aberta, quando o professor clica em "Fechar Lousa", então a lousa é ocultada e a visualização retorna ao material de aula anterior.
- [ ] **CA03:** Dado que o professor selecionou a caneta, quando ele arrasta o cursor sobre a lousa, então traços são desenhados acompanhando o movimento.
- [ ] **CA04:** Dado que o professor está desenhando na lousa, quando ele faz um traço, então esse mesmo traço aparece na tela dos alunos quase instantaneamente.
- [ ] **CA05:** Dado que o professor está usando a lousa, quando ele seleciona a cor vermelha, então os próximos traços desenhados ficam vermelhos tanto para ele quanto para os alunos.
- [ ] **CA06 (Late Joiner):** Dado que um aluno entra na aula após o professor já ter desenhado, quando ele se conecta, então o estado completo e atual da lousa é carregado de imediato.

## Arquitetura, Edge Cases e Segurança

- **Telas Touch vs Mouse:** Utilizar os eventos unificados `Pointer Events` (`pointerdown`, `pointermove`, `pointerup`) para suportar perfeitamente iPads e desktops, desativando ações padrão de toque do navegador no canvas.
- **Segurança e Firebase Rules:** Regras do banco de dados (RTDB) devem validar se `auth.uid == teacherId` para permitir escrita, impedindo que requisições maliciosas alterem o quadro. Alunos recebem apenas permissão de leitura (`read-only`).
- **Prevenção contra DoS:** O backend (ou Security Rules) deve impor limites ao tamanho do payload (comprimento máximo de array), evitando ataques de sobrecarga que travem a rede dos alunos.
- **Observabilidade:** Coletar métricas no cliente (taxa de quadros de renderização) e no servidor (taxa de queda/reconexão) para refinar os limites de throttling do desenho.

## O que a atividade não inclui (no MVP)

- Ferramenta de texto (digitar pelo teclado): motivo: escopo inicial é focado em escrita manual e desenho rápido. Pode ser adicionado futuramente.
- Exportação PDF, Múltiplas Páginas, Backgrounds e Modo Colaborativo: motivo: Funcionalidades mapeadas como prioridade secundária (P2) listadas abaixo, não bloqueantes para o lançamento do MVP (RF01 a RF04).

### Considerado para o futuro (P2)

As funcionalidades avançadas listadas de RF05 a RF11 compõem o roadmap futuro (P2) da lousa, garantindo melhor didática, engajamento e organização:
- **RF05:** Importação de templates e planos de fundo (Imagens/PDF).
- **RF06:** Criação e navegação entre múltiplas páginas/quadros para não perder o histórico.
- **RF07:** Ferramenta *Laser Pointer* para destacar áreas temporariamente (2 segundos).
- **RF08:** Stickers, reações e carimbos disparados pelos alunos na lousa de forma não-destrutiva.
- **RF09:** Modo Co-autoria controlada, permitindo passar permissão temporária a um aluno para resolução de exercícios.
- **RF10:** Exportação instantânea da lousa (todas as páginas) para PDF ao fim da sessão.
- **RF11:** Gravação e playback da lousa em ordem cronológica para facilitar revisão assíncrona.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Qual tecnologia usaremos para sincronização de estado do mouse/canvas em tempo real? | Dev/Arquitetura | Sim | **Firebase Realtime Database (RTDB)** (evita custos altos de cotas do Firestore). |
| D02 | Qual biblioteca de canvas vamos adotar no frontend? | Dev | Sim | **React-Konva** (gerenciamento) + **Perfect-Freehand** (fluidez do traço). |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Abrir e fechar a lousa | manual | CA01, CA02 | 1. Entrar como professor.<br>2. Clicar em "Lousa".<br>3. Clicar em fechar. | A lousa abre mostrando ferramentas e depois fecha retornando ao estado anterior. |
| CT02 | Desenhar e ver sincronização | e2e / manual | CA03, CA04 | 1. Entrar como prof e aluno em janelas diferentes.<br>2. Prof desenha um "X". | O aluno vê o "X" aparecendo na sua tela com atraso mínimo. |
| CT03 | Trocar de cor e apagar | manual | CA05 | 1. Prof escolhe vermelho, desenha.<br>2. Usa borracha. | Traço fica vermelho. Borracha apaga a parte tocada, refletido para o aluno. |
| CT04 | Aluno entra atrasado (Late joiner) | manual | CA06 | 1. Prof desenha na lousa.<br>2. Aluno entra na sala. (Busca estado inicial lendo nó raiz do RTDB ao montar). | O aluno visualiza tudo que foi desenhado antes de sua entrada. |

## URL Complementar

- Documentação técnica: N/A
- Protótipo / mockup: N/A
- Discussões relacionadas: N/A
- Referências de design: tldraw, excalidraw (como referências de UX).
- Requisitos originais: Solicitação para acessar a lousa e dar a aula escrevendo, desenhando.
- Issue / PR relacionado: N/A
