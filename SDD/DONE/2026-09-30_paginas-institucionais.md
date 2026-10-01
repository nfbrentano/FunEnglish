# [FEAT] Páginas institucionais (Home, About, FAQ, Contact, Privacy, Terms)

> **Status:** Concluída
> **Autor:** Natanael Brentano · **Revisor:** Natanael Brentano · **Criada em:** 2026-09-30 · **Atualizada em:** 2026-10-01

## Detalhes da Atividade

- **O que precisa ser feito:** Criar as páginas de apoio linkadas no cabeçalho e no rodapé: Home (landing) com proposta de valor e CTA para as atividades, About, FAQ (acordeão), Contact (formulário), Privacy Policy e Terms of Use, todas em inglês.
- **Problema e evidência:** O site de referência tem Home, FAQ, Contact, Privacy e Terms. Como o site coleta dados de conta (e-mail, nome), política de privacidade e termos são obrigatórios (LGPD/GDPR) e exigidos pelo Google para o login OAuth em produção.
- **Impacto de não fazer:** Links quebrados no rodapé; risco legal; tela de consentimento do Google OAuth não pode ser publicada sem URL de política de privacidade.
- **Para quem é destinado:** Visitante anônimo e professor.
- **História de usuário:** Como professor visitando o site pela primeira vez, quero entender o que é o Fun English, tirar dúvidas e saber como meus dados são usados, para decidir se crio uma conta.
- **Como saberemos que deu certo:** 0 links quebrados no rodapé; formulário de contato entrega 100% das mensagens válidas.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Home `/`: hero com proposta de valor, CTA "Browse activities", destaques (nº de atividades, 9 categorias, gratuito), 6 atividades em destaque (`featured`) e CTA "Sign up free" | P1 | CA01 |
| RF02 | `/about`: texto sobre o projeto | P2 | |
| RF03 | `/faq`: perguntas em acordeão acessível, conteúdo em arquivo Markdown/JSON | P1 | CA02 |
| RF04 | `/contact`: formulário (nome, e-mail, assunto, mensagem) gravando em `contactMessages` no Firestore, com honeypot anti-spam e limite de tamanho | P1 | CA03, CA06 |
| RF05 | `/privacy` e `/terms`: conteúdo em Markdown com data de "Last updated" | P0 | CA04 |
| RF06 | Todas as páginas usam o layout base e têm metadados de SEO | P0 | CA05 |
| RF07 | Privacy Policy cobre os tópicos mínimos listados em "Recursos necessários" | P0 | CA04 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Regras do Firestore: `contactMessages` aceita apenas `create` (sem leitura pública), com validação de campos e tamanho (mensagem ≤ 2.000 caracteres) | P0 | CA06 |
| RNF02 | Páginas estáticas geradas no build; os destaques da Home vêm do `catalog/index` | P0 | |
| RNF03 | Acordeão do FAQ com `button` + `aria-expanded` | P0 | CA02 |

### Dependências técnicas

- [UI] Layout base e navegação.
- [FEAT] Modelo de dados (campo `featured`) para a Home.

### Recursos necessários

- Textos de About, FAQ, Privacy e Terms redigidos por IA e revisados pelo PO antes do lançamento. A Privacy Policy deve cobrir, no mínimo: dados coletados (nome, e-mail, foto do Google, favoritos, histórico, mensagens de contato), finalidade, provedores (Firebase/Google Cloud, embeds do YouTube), direitos do titular (LGPD/GDPR: acesso, correção, exclusão), contato do responsável e ausência de venda de dados.
- A URL de `/privacy` é exigida pela tela de consentimento OAuth do Google para publicar o login com Google.
- E-mail de contato oficial.

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado que acesso `/`, quando a página carrega, então vejo a proposta de valor, o botão "Browse activities" (leva a `/activities`) e 6 atividades em destaque.
- [x] **CA02:** Dado a página FAQ, quando clico numa pergunta, então a resposta expande e `aria-expanded` passa a `true`; clicar de novo recolhe.
- [x] **CA03:** Dado o formulário de contato preenchido corretamente, quando envio, então vejo "Thanks! We'll get back to you soon." e um documento é criado em `contactMessages`.
- [x] **CA04:** Dado `/privacy` e `/terms`, quando os acesso, então vejo o conteúdo revisado pelo PO, a data "Last updated", e a Privacy Policy menciona dados coletados, provedores (Firebase/Google Cloud, YouTube), direitos do titular e contato. _(Textos em `content/pages/` revisados e aprovados pelo PO em 2026-10-01.)_
- [x] **CA05:** Dado cada link do rodapé, quando clico, então a página correspondente abre (nenhum 404).
- [x] **CA06 (negativo):** Dado um envio com o campo honeypot preenchido ou mensagem > 2.000 caracteres, quando envio, então nada é gravado; e ninguém consegue ler `contactMessages` pelo SDK do cliente.
- [x] **CA07 (erro):** Dado um e-mail inválido no formulário, quando envio, então vejo "Please enter a valid email" e o envio não ocorre.

## O que a atividade não inclui

- Envio de e-mail automático ao receber contato: motivo: adiado; exigiria Cloud Functions (só no Blaze) ou serviço externo. Na v1, as mensagens são lidas no console do Firebase/admin.
- Newsletter e podcast: motivo: outra iniciativa.
- Página Pricing: motivo: sem pagamento na v1.

### Considerado para o futuro (P2)

- Notificação por e-mail de novos contatos (ex.: serviço gratuito de formulários ou Cloud Functions no Blaze).
- Listagem de mensagens de contato no painel admin.
- Newsletter.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Quem redige/revisa Privacy Policy e Terms? | PO | Não | Redigidos por IA; revisados pelo PO (Natanael) antes do lançamento |
| D02 | A Home é uma landing separada ou `/` redireciona para `/activities` na v1? | PO | Não | Landing separada (decisão do PO em 2026-10-01) |
| D03 | Qual e-mail de contato oficial? | PO | Não | nfgbrentano@gmail.com (Contact e Privacy Policy) |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Home | e2e | CA01 | Abrir `/` e clicar CTA | Destaques; navega para `/activities` |
| CT02 | Acordeão | componente | CA02 | Clicar pergunta 2× | Expande/recolhe; aria correto |
| CT03 | Contato válido | e2e (emulador) | CA03 | Enviar formulário | Mensagem de sucesso; doc criado |
| CT04 | Privacy/Terms | e2e | CA04 | Abrir páginas | Conteúdo + data |
| CT05 | Links do rodapé | e2e | CA05 | Percorrer links | Todos 200 |
| CT06 | Anti-spam e regras | integração | CA06 | Honeypot; msg longa; ler coleção | Nada gravado; leitura negada |
| CT07 | E-mail inválido | componente | CA07 | Enviar "abc" | Mensagem de erro |

## URL Complementar

- Documentação técnica: https://firebase.google.com/docs/firestore/security/rules-structure
- Protótipo / mockup:
- Discussões relacionadas: N/A.
- Referências de design: https://www.coolenglish.org/ · https://www.coolenglish.org/faq · https://www.coolenglish.org/contact
- Requisitos originais: Pedido de criar um site semelhante ao Cool English.
- Issue / PR relacionado: Repositório: https://github.com/nfbrentano/FunEnglish
