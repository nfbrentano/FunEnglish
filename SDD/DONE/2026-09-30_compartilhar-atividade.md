# [FEAT] Compartilhar atividade com alunos

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-10-01

## Detalhes da Atividade

- **O que precisa ser feito:** Adicionar o botão "Share" nos cards e no player, abrindo um modal com o link da atividade, botão "Copy link", QR code (para projetar em sala) e compartilhamento nativo (Web Share API) em dispositivos móveis. O link abre o player em "student mode": sem necessidade de login e com interface simplificada.
- **Problema e evidência:** O site de referência oferece "student share links" para que alunos façam a atividade no próprio dispositivo. Em sala, projetar um QR code é a forma mais rápida de distribuir o link.
- **Impacto de não fazer:** Atividades só podem ser usadas projetadas pelo professor; não há uso individual por alunos.
- **Para quem é destinado:** Professor de ESL (quem compartilha) e aluno (quem recebe, anônimo).
- **História de usuário:** Como professor, quero compartilhar um link ou QR code da atividade, para que meus alunos a façam no celular sem criar conta.
- **Como saberemos que deu certo:** Link copiado em ≤ 2 cliques; aluno abre a atividade pelo QR em < 5 s sem login.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Botão "Share" nos cards e no player, disponível para visitantes e logados | P0 | CA01 |
| RF02 | Modal com URL `https://<domínio>/play/[slug]?mode=student`, botão "Copy link" com feedback "Copied!" | P0 | CA01, CA02 |
| RF03 | QR code do link gerado no cliente, com opção "Show fullscreen" para projeção | P0 | CA03 |
| RF04 | Em dispositivos com Web Share API, botão "Share…" que abre o compartilhamento nativo | P1 | CA04 |
| RF05 | Student mode: oculta cabeçalho do site, favoritos, botão share e links de navegação; mostra só a atividade e um rodapé mínimo "Made with Fun English" | P0 | CA05 |
| RF06 | Student mode não exige login e não registra histórico | P0 | CA05, CA07 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | QR code legível a 3 m de distância quando projetado em tela cheia (mín. 60% da menor dimensão da tela) | P1 | CA03 |
| RNF02 | Geração de QR sem serviços externos (biblioteca no cliente) | P0 | CA03 |
| RNF03 | Modal acessível: foco preso no modal, fecha com Esc, retorna o foco ao botão de origem | P0 | CA06 |

### Dependências técnicas

- [FEAT] Motor de atividades (rota `/play/[slug]` e suporte a `mode=student`).
- [FEAT] Catálogo de atividades (card).

### Recursos necessários

- Biblioteca de QR code (ex.: `qrcode`).

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado um card, quando clico em "Share", então abre um modal com o link da atividade em student mode.
- [x] **CA02:** Dado o modal aberto, quando clico "Copy link", então o link vai para a área de transferência e o botão mostra "Copied!" por 2 s.
- [x] **CA03:** Dado o modal aberto, quando clico "Show fullscreen", então o QR code ocupa a tela, e lê-lo com a câmera de um celular abre a atividade. _(Automatizado: QR gerado no cliente e ≥ 60% da tela. Leitura com a câmera: validação manual do PO no celular.)_
- [x] **CA04:** Dado um celular com Web Share API, quando toco em "Share…", então o menu nativo de compartilhamento abre com título e link da atividade. _(Automatizado com mock; menu real: validação manual do PO no Android/iOS.)_
- [x] **CA05:** Dado um aluno sem conta, quando abre o link `?mode=student`, então vê apenas a atividade (sem header, favoritos ou share) e consegue concluí-la.
- [x] **CA06:** Dado o modal aberto, quando pressiono Esc, então ele fecha e o foco volta para o botão "Share".
- [x] **CA07 (negativo):** Dado um aluno usando o student mode, quando conclui a atividade, então nenhuma escrita é feita no Firestore.
- [x] **CA08 (limite):** Dado um navegador sem permissão de clipboard, quando clico "Copy link", então o texto do link fica selecionado no campo e aparece "Press Ctrl+C to copy".

## O que a atividade não inclui

- Links com expiração (30 dias, como na referência): motivo: sem planos pagos, não há o que restringir na v1.
- Coleta de respostas/nota dos alunos para o professor: motivo: complexo demais agora (exige turmas e armazenamento de resultados).
- Compartilhar listas inteiras: motivo: ver spec de Favoritos (P2).

### Considerado para o futuro (P2)

- Links de "assignment" com código, coleta de pontuação e relatório por turma.
- Expiração de links para planos pagos.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Alguns tipos (ex.: Jeopardy, cartões de conversa) são para uso em grupo. Devem ter share desabilitado? | PO | Não | Permitir, com o aviso "Best used in class" no modal para Quiz Board e Discussion Cards |
| D02 | Usar a URL do site configurada (`NEXT_PUBLIC_SITE_URL`) ou a origem atual no link? | Dev | Não | Origem atual (`window.location.origin`): funciona igual em produção, nos canais de preview e no emulador |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Abrir modal | e2e | CA01 | Clicar Share | Modal com URL `?mode=student` |
| CT02 | Copiar | e2e | CA02 | Clicar Copy link (permissão concedida) | Clipboard contém a URL |
| CT03 | QR | manual | CA03 | Projetar e ler com celular | Atividade abre |
| CT04 | Web Share | manual | CA04 | Tocar Share… no Android/iOS | Menu nativo |
| CT05 | Student mode | e2e | CA05 | Abrir URL anônimo | Sem header/favoritos; conclusão possível |
| CT06 | Acessibilidade do modal | e2e | CA06 | Esc | Foco retorna ao botão |
| CT07 | Sem escrita | integração | CA07 | Monitorar Firestore em student mode | 0 writes |
| CT08 | Clipboard negado | componente | CA08 | Mock de `writeText` rejeitado | Fallback exibido |

## URL Complementar

- Documentação técnica: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share · https://www.npmjs.com/package/qrcode
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: https://www.coolenglish.org/pricing ("student share links")
- Requisitos originais: Pedido de criar um site semelhante ao Cool English.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
