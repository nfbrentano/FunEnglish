# [FIX] Aluno não consegue entrar na sala ao vivo

> **Status:** Em validação (implementada e coberta por testes unitários; falta entrar numa sala em produção)
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-06 · **Atualizada em:** 2026-10-06

## Detalhes da Atividade

- **O que precisa ser feito:** Permitir que o aluno entre na sala ao vivo pela `/live` com o código, sem estar logado, seja como convidado, com PIN ou pelo portal.
- **Problema e evidência:** Relato do professor em produção (2026-10-06): "não consigo logar na living room, dá erro". No código:
  1. `subscribeLiveRoom` (`src/lib/live/repository.ts`) lê `liveRooms/{code}` assim que o código é digitado, mas o login anônimo só acontece depois, dentro de `joinLiveRoom`. A regra `liveRooms/$code/.read` exige `auth != null`, então a leitura é negada e a tela mostra "Class not found".
  2. `joinLiveRoom` também faz `get(liveRooms/{code})` antes do login anônimo, com o mesmo problema.
  3. O participante convidado é gravado com `studentId`, `pinHash` e `deviceId` como `undefined`; o SDK do Realtime Database rejeita valores `undefined` em `set()`.
- **Impacto de não fazer:** Nenhum aluno sem conta consegue entrar na sala; a lousa ao vivo e as atividades ao vivo não chegam aos alunos.
- **Para quem é destinado:** Aluno entrando pelo celular ou computador com o código da sala.
- **História de usuário:** Como aluno, quero entrar na sala com o código que o professor passou, para acompanhar a lousa e as atividades.
- **Como saberemos que deu certo:** Um aluno sem conta abre `/live?code=XXXXXX`, vê o nome da turma e entra como convidado ou com PIN, sem erro.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Antes de ler a sala, a `/live` garante um usuário do Firebase: espera a sessão salva ser restaurada e, se não houver ninguém logado, faz login anônimo. Vale para a assinatura da sala e para a entrada. | P0 | CA01, CA03 |
| RF02 | O participante é gravado sem campos `undefined`. | P0 | CA02 |
| RF03 | Se o login anônimo falhar (ex.: desativado no projeto), a tela mostra uma mensagem clara em vez de "Class not found". | P1 | CA04 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Sem mudança nas regras do Realtime Database. | P0 | |
| RNF02 | Um professor ou aluno do portal já logado não é trocado por um usuário anônimo. | P0 | CA03 |

### Dependências técnicas

- `src/lib/live/repository.ts` (`subscribeLiveRoom`, `joinLiveRoom`), `src/lib/auth/firebase-auth.ts` (`loadAuth`).
- Login anônimo habilitado no Firebase Authentication do projeto.

### Recursos necessários

- N/A: sem assets novos.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado um aluno sem conta, quando abre `/live?code=ABCDEF` de uma sala aberta, então vê o nome da turma e o formulário de entrada (não "Class not found").
- [ ] **CA02:** Dado uma sala com convidados permitidos, quando o aluno entra como convidado com um nome, então ele aparece na lista do professor.
- [x] **CA03:** Dado um aluno já logado no portal, quando abre a `/live`, então continua com a própria conta (sem login anônimo).
- [x] **CA04 (erro):** Dado que o login anônimo falha, quando o aluno abre a `/live` com um código, então vê "Couldn't connect to the class. Try again in a moment.".

## O que a atividade não inclui

- Mudar as regras de leitura do Realtime Database para leitura pública: motivo: exporia salas e respostas sem nenhuma autenticação.

### Considerado para o futuro (P2)

- Escolher a turma ao abrir uma sala pela lousa avulsa, para a lista de alunos não incluir todos.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O login anônimo está habilitado no Firebase Authentication de produção? | Dev | Não | A confirmar; sem ele a entrada falha mesmo com esta correção (CA04 mostra a mensagem). |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Leitura após login anônimo | unit (SDK simulado) + manual em produção | CA01 | Assinar a sala sem usuário | `signInAnonymously` antes de `onValue` |
| CT02 | Convidado sem `undefined` | unit | CA02 | Entrar como convidado | Objeto gravado sem chaves `undefined` |
| CT03 | Usuário já logado | unit | CA03 | Assinar com `currentUser` definido | Sem `signInAnonymously` |
| CT04 | Falha no login anônimo | unit | CA04 | `signInAnonymously` rejeita | Mensagem de erro de conexão |

## URL Complementar

- Documentação técnica: `SDD/DONE/2026-10-03_09-sala-ao-vivo.md`, `database.rules.json`.
- Protótipo / mockup: N/A.
- Discussões relacionadas: relato do professor em 2026-10-06.
- Referências de design: N/A.
- Requisitos originais: N/A.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
