# [FEAT] Pacotes de aulas, créditos e pagamentos

> **Status:** Em revisão
> **Autor:** Natanael Brentano · **Revisor:** · **Criada em:** 2026-10-05 · **Atualizada em:** 2026-10-05
> **Ordem de implementação:** 19 · **Depende de:** 17, 18 · **Por quê nesta posição:** O desconto de créditos usa o status das aulas da agenda (spec 18)

## Detalhes da Atividade

- **O que precisa ser feito:** Registrar o **pacote de créditos** de cada aluno (modelo principal: o aluno compra e paga, por exemplo, 10 aulas e vai gastando 1 crédito por aula agendada e dada; créditos não expiram), descontar créditos automaticamente quando a aula acontece, registrar **pagamentos** e mostrar quem está com aulas acabando ou pagamento atrasado. É um controle para o professor; o site **não** cobra nem processa pagamentos.
- **Problema e evidência:** Professores particulares controlam "quantas aulas faltam" e "quem já pagou" em planilha ou caderno, separado das aulas. Erros de contagem geram aula dada sem pagamento ou cobrança indevida.
- **Impacto de não fazer:** Perda de receita e conversas desconfortáveis com alunos; o professor continua precisando de outra ferramenta.
- **Para quem é destinado:** Professor particular com aulas 1:1 (dono do negócio).
- **História de usuário:** Como professor particular, quero que o sistema conte as aulas usadas de cada pacote e me avise de pagamentos pendentes, para não perder aulas nem dinheiro.
- **Como saberemos que deu certo:** Ver quantas aulas restam e o status do pagamento de qualquer aluno em 1 clique; registrar um pagamento em < 20 s; 0 diferenças entre aulas dadas (spec 18) e créditos consumidos.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Tipos de plano por aluno: **Pacote de créditos** (padrão e principal: N aulas pagas antecipadamente, **sem validade**; ao acabar, compra-se outro pacote), **Mensal** (opcional: N créditos adicionados no dia de vencimento) e **Avulsa** (paga por aula) | P0 | CA01 |
| RF02 | Preço (BRL), forma de pagamento usual (Pix, transferência, dinheiro, cartão, outro) e observações | P0 | CA01 |
| RF03 | Desconto automático (política decidida em D02), **somente para aulas confirmadas pelo aluno** (agendou, aceitou a proposta ou entrou na aula confirmando; spec 20): aula "Done" na agenda (spec 18) consome 1 crédito; "No-show" **consome**; "Cancelled by teacher/holiday" **não consome**; "Cancelled by student" consome se cancelou com **menos de 24 h** de antecedência e não consome com 24 h ou mais. Aula proposta pelo professor e não confirmada **nunca** consome. O prazo de 24 h é o padrão global, ajustável por aluno | P0 | CA02, CA03, CA15, CA16 |
| RF04 | Ajuste manual de créditos (+/−) com motivo obrigatório, registrado no histórico | P0 | CA04 |
| RF05 | Registrar pagamento: valor, data, forma, referência (mês ou pacote) e observação; pagamento de pacote novo adiciona os créditos | P0 | CA05 |
| RF06 | Status financeiro por aluno: Paid, Due soon (vence em ≤ 3 dias), Overdue, Low credits (≤ 1 aula), No credits | P0 | CA06 |
| RF07 | Painel "Billing" no dashboard: alunos com pagamento atrasado ou créditos baixos no topo; total recebido no mês e previsto | P0 | CA07 |
| RF08 | Na página do aluno, aba "Billing": plano atual, créditos restantes, extrato (aulas consumidas, ajustes, pagamentos) em ordem de data | P0 | CA08 |
| RF09 | Iniciar aula de aluno sem créditos mostra aviso "Ana has no lessons left" com "Start anyway" (a aula fica com saldo negativo) | P1 | CA09 |
| RF10 | Botão "Send reminder" abre o WhatsApp do aluno com mensagem de cobrança pré-preenchida e editável (sem envio automático) | P1 | CA10 |
| RF11 | Exportar extrato e recebimentos do mês em CSV | P1 | CA11 |
| RF12 | Plano mensal (opcional) adiciona N créditos no dia de vencimento; créditos não usados **sempre acumulam** (decisão D03), sem opção de expirar | P1 | CA12 |
| RF13 | **Saldo disponível** = saldo − aulas futuras confirmadas (crédito reservado); mostrado ao lado do saldo e usado pela spec 20 para permitir ou bloquear novos agendamentos | P0 | CA17 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Dados financeiros só do professor: `students/{id}/private/billing` (plano) e `students/{id}/ledger/{entryId}` `{ type: "lesson" \| "adjustment" \| "payment" \| "renewal", credits (±), amountCents?, method?, lessonId?, reason?, at, createdBy }`. O aluno (`portalUid`) **não lê** nada disso na v1 | P0 | CA13 |
| RNF02 | Saldo = soma de `credits` no extrato (fonte da verdade); `creditsBalance` em cache no plano atualizado na mesma transação | P0 | CA02, CA04 |
| RNF03 | Desconto automático **idempotente**: id do lançamento = `lesson_<lessonId>`; mudar o status da aula (ex.: Done → Cancelled) estorna com um lançamento compensatório | P0 | CA03, CA14 |
| RNF04 | Lançamentos de extrato são imutáveis (regras: `create` sim, `update`/`delete` não); correções só por novo lançamento | P0 | CA14 |
| RNF05 | Valores em centavos (inteiros) e formatados com `Intl.NumberFormat("pt-BR", { currency: "BRL" })`; moeda configurável no futuro | P0 | |
| RNF06 | Renovação mensal (RF12) feita por Cloud Function agendada diária (região `southamerica-east1`, `maxInstances` baixo) ou na primeira abertura do dashboard no dia, com id determinístico `renewal_<yyyy-mm>` | P1 | CA12 |
| RNF07 | Excluir o aluno (`deleteStudent`) inclui `ledger` e `private`; exportar CSV antes é sugerido no modal | P1 | |

### Dependências técnicas

- Spec 17 (aluno, `private/profile`, WhatsApp) e spec 18 (`lessons` com status e motivo do cancelamento).
- Cloud Functions (spec 00) para desconto automático por trigger em `users/{uid}/lessons/{id}` e renovação agendada.
- `firestore.rules`, `firestore.indexes.json`, testes de regras e de Functions no emulador.

### Recursos necessários

- Mockup do painel "Billing" e da aba "Billing" do aluno.
- Texto padrão da mensagem de lembrete de pagamento (PT-BR).

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado "Ana", quando cadastro o Pacote de créditos "10 aulas, R$ 800,00, Pix" e registro o pagamento, então a aba Billing mostra o pacote, "10 lessons left" e nenhuma data de validade.
- [ ] **CA02:** Dado "Ana" com 10 créditos, quando uma aula dela fica "Done", então o saldo passa a 9 e o extrato mostra "Lesson 07/10 · −1".
- [ ] **CA03:** Dado "Ana" com 7 créditos, quando eu cancelo uma aula com motivo "Holiday", então o saldo continua 7; quando "Ana" cancela com 2 h de antecedência, então o saldo passa a 6; e quando "Ana" cancela com 30 h de antecedência, então o saldo não muda.
- [ ] **CA04:** Dado "Ana" com 6 créditos, quando adiciono +1 com o motivo "Bonus lesson", então o saldo passa a 7 e o motivo aparece no extrato; sem motivo, o ajuste não é salvo.
- [ ] **CA05:** Dado "Bruno" no plano Pacote de 10 aulas, quando registro o pagamento de R$ 700,00 via Pix para "Package 10", então o pagamento aparece no extrato e o saldo dele aumenta 10.
- [ ] **CA06:** Dado o vencimento de "Ana" no dia 5 sem pagamento registrado, quando abro o dashboard no dia 6, então "Ana" aparece como "Overdue"; e no dia 3 aparece como "Due soon".
- [ ] **CA07:** Dado 2 alunos atrasados e 1 com 1 crédito, quando abro "Billing", então os 3 aparecem no topo e vejo o total recebido no mês.
- [ ] **CA08:** Dado "Ana" com aulas, um ajuste e um pagamento, quando abro a aba Billing, então o extrato lista os 3 tipos em ordem de data com o saldo após cada lançamento.
- [ ] **CA09:** Dado "Bruno" com 0 créditos, quando clico em "Start lesson", então vejo "Bruno has no lessons left" e, com "Start anyway", a aula começa e o saldo fica −1 depois de concluída.
- [ ] **CA10:** Dado "Ana" atrasada e com WhatsApp cadastrado, quando clico em "Send reminder", então abre o WhatsApp com a mensagem pré-preenchida com nome, valor e vencimento.
- [ ] **CA11:** Dado pagamentos em outubro, quando exporto o CSV do mês, então o arquivo tem uma linha por pagamento com data, aluno, valor e forma.
- [ ] **CA12:** Dado "Bruno" no plano Mensal de 8 créditos com 2 créditos sobrando, quando chega o dia 5, então é lançada a renovação e o saldo passa a 10 (os 2 acumulam), uma única vez mesmo que o processo rode duas vezes.
- [ ] **CA13 (negativo):** Dado "Ana" logada no portal ou o professor B, quando tentam ler `students/{id}/ledger` ou `private/billing` pelo SDK, então recebem `permission-denied`.
- [ ] **CA15:** Dado "Ana" com 5 créditos e uma aula confirmada marcada como "No-show", quando o status é salvo, então o saldo passa a 4 com o lançamento "No-show · −1".
- [ ] **CA16 (negativo):** Dado uma aula proposta pelo professor que "Ana" não aceitou nem entrou, quando o horário passa ou o professor marca "No-show", então nenhum crédito é consumido.
- [ ] **CA17:** Dado "Ana" com saldo 5 e 2 aulas futuras confirmadas, quando abro a aba Billing, então vejo "5 lessons · 3 available to book".
- [ ] **CA14 (negativo):** Dado um lançamento já criado, quando alguém tenta editá-lo ou apagá-lo pelo SDK, então a escrita é negada; e mudar a aula de Done para Cancelled gera um estorno de +1, sem apagar o lançamento original.

## O que a atividade não inclui

- Cobrança e processamento de pagamentos (Pix automático, cartão, boleto, Stripe/Mercado Pago): motivo: complexo demais agora e envolve taxas e compliance; o controle manual resolve o problema principal.
- Emissão de nota fiscal ou recibo oficial: motivo: obrigação fiscal fora do escopo do produto.
- Aluno ver o próprio saldo no portal: motivo: decidir depois (D01); começa visível só ao professor.
- Relatórios contábeis/impostos: motivo: baixo impacto para a v1.

### Considerado para o futuro (P2)

- Aluno ver as aulas restantes no portal.
- Recibo simples em PDF para o aluno.
- Cobrança Pix com QR Code (copia e cola) gerado com a chave do professor.
- Gráfico de receita mensal.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | O aluno deve ver quantas aulas restam no portal? | PO | Não | Sugestão: não na v1 |
| D02 | Política padrão de falta (no-show) e prazo de cancelamento: consome crédito? 24 h? | PO | Não | Sim (2026-10-05): no-show consome; cancelamento pelo aluno com menos de 24 h consome; com 24 h ou mais, não consome |
| D03 | Créditos do plano mensal acumulam ou expiram por padrão? | PO | Não | Acumulam (2026-10-05). Modelo principal é o pacote: o aluno compra e paga, por exemplo, 10 aulas e gasta 1 crédito por aula; créditos não expiram |
| D06 | O aluno vai agendar as próprias aulas (escolher horário e gastar crédito sozinho) ou o professor agenda após combinar pelo WhatsApp? | PO | Não | Os dois (2026-10-05): o aluno agenda pelo portal; o professor também pode agendar, mas só consome crédito se o aluno aceitar ou entrar na aula confirmando. Detalhado na spec 20 |
| D04 | Precisamos de mais de uma moeda (alunos do exterior)? | PO | Não | Sugestão: só BRL na v1 |
| D05 | Renovação por Cloud Function agendada (custo baixo, mas mais infra) ou ao abrir o dashboard? | dev | Não | |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Cadastro do pacote | e2e (emulador) | CA01 | Criar pacote de 10 + pagamento | "10 lessons left", sem validade |
| CT02 | Desconto por aula | integração (Functions) | CA02 | Lesson → done | Lançamento −1, saldo 9 |
| CT03 | Política de cancelamento | unit | CA03, CA15, CA16 | Motivos; antecedência 2 h, 23h59, 24 h, 30 h; no-show confirmado e não confirmado | Consome (< 24 h, no-show confirmado) ou não (≥ 24 h, professor/feriado, não confirmada) |
| CT15 | Saldo disponível | unit | CA17 | Saldo 5, 2 futuras confirmadas | 3 disponíveis |
| CT04 | Ajuste manual | e2e + rules | CA04 | +1 com e sem motivo | Salvo / recusado |
| CT05 | Pagamento | e2e | CA05 | Pagamento de pacote | Extrato + créditos |
| CT06 | Status financeiro | unit (relógio fixo) | CA06 | Dias 3 e 6 | Due soon / Overdue |
| CT07 | Painel Billing | e2e | CA07 | 3 alunos em alerta | Ordem e totais |
| CT08 | Extrato | unit | CA08 | 3 tipos | Saldo acumulado correto |
| CT09 | Sem créditos | e2e | CA09 | Start anyway | Saldo −1 |
| CT10 | Lembrete | unit | CA10 | Montar URL `wa.me` | Texto codificado correto |
| CT11 | CSV | unit | CA11 | Exportar mês | Linhas e colunas |
| CT12 | Renovação idempotente | integração (Functions) | CA12 | Rodar 2 vezes no dia 5 | 1 renovação, saldo 10 (acumulado) |
| CT13 | Regras de leitura | integração (rules) | CA13 | Portal e professor B | `permission-denied` |
| CT14 | Imutabilidade e estorno | integração (rules + Functions) | CA14 | Editar lançamento; Done → Cancelled | Negado / estorno +1 |

## URL Complementar

- Documentação técnica: `SDD/2026-10-05_17-alunos-individuais-e-aula-1a1.md`; `SDD/2026-10-05_18-agenda-de-aulas-individuais.md`; `SDD/DONE/2026-10-03_00-infra-blaze-functions-storage.md`.
- Protótipo / mockup:
- Discussões relacionadas: pedido do PO em 2026-10-05 (pacotes/créditos de aulas e pagamentos).
- Referências de design:
- Requisitos originais:
- Issue / PR relacionado:
