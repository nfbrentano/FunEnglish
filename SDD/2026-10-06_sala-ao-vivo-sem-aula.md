# [FIX] Abrir sala ao vivo a partir da lousa sem aula iniciada

> **Status:** Em validação (implementada; falta abrir a sala em produção com login de professor)
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-06 · **Atualizada em:** 2026-10-06

## Detalhes da Atividade

- **O que precisa ser feito:** Fazer o botão "Open live room" funcionar quando o professor está na `/lousa` sem uma aula (sessão) iniciada, e mostrar uma mensagem quando a abertura da sala falhar.
- **Problema e evidência:** Relato do professor em produção (2026-10-06): na `/lousa`, "Connect students" abre o modal da sala ao vivo, mas o botão "Open live room" não faz nada. Em `src/components/live/live-room-modal.tsx`, `handleStartRoom` começa com `if (!activeSession) return;`. Fora de uma aula não há sessão ativa, então o clique é ignorado em silêncio. A SDD `SDD/DONE/2026-10-06_atalho-lousa.md` (RF05/CA05) prometia abrir a sala a partir da lousa avulsa.
- **Impacto de não fazer:** A lousa avulsa não pode ser compartilhada com os alunos, e o professor não recebe nenhum aviso do motivo.
- **Para quem é destinado:** Professor usando a lousa fora de uma aula iniciada.
- **História de usuário:** Como professor, quero abrir uma sala ao vivo direto da lousa, para mostrar o quadro aos alunos sem precisar iniciar uma aula antes.
- **Como saberemos que deu certo:** Da `/lousa`, sem aula iniciada, "Connect students" → "Open live room" mostra o código da sala em 1 clique; uma falha mostra mensagem no modal (0 falhas silenciosas).

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Sem sessão ativa, "Open live room" cria uma sala avulsa: `sessionId` vazio, nome "Whiteboard", lista com todos os alunos do professor (para entrar com PIN ou pelo portal) e convidados permitidos (para entrar só com o código). | P0 | CA01 |
| RF02 | Com sessão ativa, o comportamento atual não muda (lista só da turma ou do aluno, convidados desligados). | P0 | CA02 |
| RF03 | Se a abertura falhar, o modal mostra "Couldn't open the live room. Try again." e o botão volta a ficar disponível. | P0 | CA03 |
| RF04 | O título do modal sem sessão diz "Open a live room for the whiteboard". | P1 | CA01 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Sem mudança nas regras do Realtime Database: `sessionId` já aceita qualquer string e `allowGuests` já é gravado na criação. | P0 | |

### Dependências técnicas

- `src/components/live/live-room-modal.tsx`, `src/lib/live/live-context.tsx` (`startRoom`), `src/lib/live/repository.ts` (`createLiveRoom`).

### Recursos necessários

- N/A: sem assets novos.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um professor na `/lousa` sem aula iniciada, quando clica em "Connect students" e depois em "Open live room", então a sala é criada, o modal mostra o código e "Guests: Allowed".
- [x] **CA02:** Dado um professor com aula iniciada, quando abre a sala, então a lista é a da turma e os convidados ficam desligados, como antes.
- [x] **CA03 (erro):** Dado que a criação da sala falha (ex.: sem conexão), quando clica em "Open live room", então aparece a mensagem de erro e o botão volta a "Open live room".

## O que a atividade não inclui

- Vincular a sala avulsa a uma aula depois: motivo: a lousa avulsa não tem resumo de aula (`SDD/DONE/2026-10-06_atalho-lousa.md`, D01).

### Considerado para o futuro (P2)

- Escolher a turma ao abrir a sala avulsa, em vez de listar todos os alunos.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | A sala avulsa deve aceitar convidados por padrão? | PO | Não | Sim: na lousa avulsa não há turma, e o professor pode desligar no próprio modal. |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Sala avulsa | unit (modal com contexto simulado) + manual em produção | CA01 | Sem sessão, clicar em "Open live room" | `startRoom` chamado com `sessionId: ""`, todos os alunos e `allowGuests: true` |
| CT02 | Sala da aula | unit | CA02 | Com sessão, clicar em "Open live room" | Lista da turma, `allowGuests` falso |
| CT03 | Falha | unit | CA03 | `startRoom` rejeita | Mensagem de erro visível; botão habilitado |

## URL Complementar

- Documentação técnica: `SDD/DONE/2026-10-06_atalho-lousa.md` (RF05, CA05), `SDD/DONE/2026-10-03_09-sala-ao-vivo.md`.
- Protótipo / mockup: N/A.
- Discussões relacionadas: relato do professor em 2026-10-06 ("esse botão também não funciona").
- Referências de design: N/A.
- Requisitos originais: N/A.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
