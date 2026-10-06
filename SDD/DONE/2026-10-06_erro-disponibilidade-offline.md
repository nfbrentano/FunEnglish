# [FIX] Tratar falha ao carregar disponibilidade no dashboard

> **Status:** Concluída
> **Autor:** Natanael Brentano (com Claude) · **Revisor:** · **Criada em:** 2026-10-06 · **Atualizada em:** 2026-10-06

## Detalhes da Atividade

- **O que precisa ser feito:** A seção de disponibilidade do dashboard deve lidar com falha ao ler as configurações do Firestore, em vez de deixar a promise rejeitada sem tratamento.
- **Problema e evidência:** O workflow `Deploy` (run 37472802903, commit 61e737d) falhou em `npm test`: 913 testes passaram, mas o Vitest acusou 2 *Unhandled Rejection* `FirebaseError: Failed to get document because the client is offline` vindas de `tests/unit/dashboard/dashboard.test.tsx`. A origem é `getAvailabilitySettings(...).then(...)` em `src/components/dashboard/availability-section.tsx`, sem `.catch`.
- **Impacto de não fazer:** Deploy bloqueado; em produção, sem conexão a seção fica em loading para sempre.
- **Para quem é destinado:** Professor(a) usando o dashboard; dev que depende do deploy.
- **História de usuário:** Como professor(a), quero que o dashboard não trave se a disponibilidade não carregar, para continuar usando as outras seções.
- **Como saberemos que deu certo:** `npm test` termina com 0 erros e o workflow `Deploy` passa.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Erro em `getAvailabilitySettings` é capturado, logado e encerra o loading (mesmo padrão do `BillingPanel`). | P0 | CA01, CA02 |
| RF02 | `student-profile.test.tsx` mocka `getStudentPrivateProfile` e `getPastSessions`, sem depender do Firestore real (no CI o timeout offline estourava o `waitFor`, run 37475304038). | P0 | CA03 |
| RF03 | `functions/src/billing.ts` e `booking.ts` obtêm o Firestore via `getAdminFirestore()` dentro dos handlers (não no topo do módulo, onde falhava com `app/no-app`), e o build das functions não tem variáveis sem uso (TS6133). Run 37475807065. | P0 | CA04 |
| RF04 | `dashboard.test.tsx` mocka as seções com testes próprios (pendências, billing, alunos, disponibilidade, turmas, homework, trilhas), que chamavam o Firestore e logavam após o teardown (`Closing rpc while "onUserConsoleLog" was pending`, run 37483230393). | P0 | CA02 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | 0 *unhandled errors* na suíte de testes. | P0 | CA02 |

### Dependências técnicas

- `src/lib/schedule/repository.ts` (`getAvailabilitySettings`).

### Recursos necessários

- N/A: nenhuma credencial ou asset novo.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que o Firestore está indisponível, quando o dashboard carrega a seção de disponibilidade, então o erro é logado e a seção sai do estado de loading com os valores padrão.
- [x] **CA03:** Dado o CI sem acesso ao Firestore, quando os testes de `StudentProfileView` rodam, então nenhuma chamada real ao Firestore é feita e "Student not found" aparece dentro do timeout.
- [x] **CA04:** Dado o CI, quando `npm run test:functions` e `npm run build:functions` rodam, então ambos terminam com código 0.
- [x] **CA02:** Dado o CI sem acesso ao Firestore, quando `npm test` roda, então não há *Unhandled Rejection* e o processo termina com código 0.

## O que a atividade não inclui

- Mostrar mensagem de erro na UI: motivo: baixo impacto; mantém o padrão das outras seções.
- Revisar todas as chamadas Firestore sem `.catch`: motivo: outra iniciativa.

### Considerado para o futuro (P2)

- Mockar os repositórios de agenda/billing no `dashboard.test.tsx` para não depender do Firestore real.

## Dúvidas em aberto

N/A: correção pontual sem dúvidas pendentes.

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Suíte completa offline | unit | CA01, CA02 | `npm test` | 0 erros, todos os testes passam |
| CT03 | Perfil sem Firestore | unit | CA03 | `npx vitest run tests/unit/dashboard/student-profile.test.tsx` | Passa, sem logs do Firestore |
| CT04 | Functions | unit | CA04 | `npm run test:functions && npm run build:functions` | Sem `app/no-app` nem erros TS |
| CT02 | Deploy | integração | CA02 | Push para `main` | Workflow `Deploy` verde |

## URL Complementar

- Documentação técnica: N/A
- Protótipo / mockup: N/A
- Discussões relacionadas: N/A
- Referências de design: N/A
- Requisitos originais: N/A
- Issue / PR relacionado: GitHub Actions run 37472802903
