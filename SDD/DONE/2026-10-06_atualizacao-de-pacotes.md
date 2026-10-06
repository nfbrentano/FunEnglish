# [CHORE] Atualização de Pacotes (Dependencies)

> **Status:** Aprovada
> **Autor:** Antigravity · **Revisor:** Desenvolvedor · **Criada em:** 2026-10-06 · **Atualizada em:** 2026-10-06

## Detalhes da Atividade

- **O que precisa ser feito:** Atualizar os pacotes do projeto (npm) para as versões indicadas pelo comando `npm outdated`.
- **Problema e evidência:** O projeto está com bibliotecas desatualizadas (como `@types/node`, `eslint`, `react`, `typescript`, etc). Manter pacotes atualizados previne vulnerabilidades de segurança e oferece melhorias de desempenho.
- **Impacto de não fazer:** Acúmulo de débito técnico, potenciais falhas de segurança por bibliotecas antigas, incompatibilidades futuras e perda de novas features e otimizações.
- **Para quem é destinado:** Desenvolvedores e sistema (manutenção/infraestrutura).
- **História de usuário:** Como desenvolvedor, quero que as dependências do projeto estejam atualizadas para suas versões estáveis mais recentes, para garantir a segurança, performance e uso das novas funcionalidades sem quebrar o sistema atual.
- **Como saberemos que deu certo:** `npm outdated` deve retornar vazio (ou listar apenas quebras de versão major que decidirmos ignorar temporariamente para evitar refatorações grandes). A aplicação deve compilar e iniciar (`npm run build` e `npm run dev`) sem erros ou avisos graves.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Atualizar pacotes de dependências normais e de desenvolvimento para as versões mais recentes (Wanted ou Latest, a avaliar o impacto). | P0 | CA01, CA02 |
| RF02 | Garantir que o build e os testes (se existirem) passem corretamente com as novas versões. | P0 | CA03 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Nenhuma nova vulnerabilidade grave deve ser reportada por `npm audit`. | P0 | CA04 |

### Dependências técnicas

- Acesso ao repositório para alterar `package.json` e gerar o arquivo `package-lock.json` atualizado.

### Recursos necessários

- Terminal executando Node.js e npm.

## Critérios de Aceitação / Entregas

- [ ] **CA01:** Dado que o `package.json` foi atualizado, quando executarmos `npm install`, então os pacotes devem ser atualizados localmente na pasta `node_modules`.
- [ ] **CA02:** Dado que atualizamos os pacotes, quando executarmos `npm outdated`, então a lista de pacotes a atualizar deve ser vazia (exceto versões *major* cujo update foi adiado por segurança).
- [ ] **CA03:** Dado que as bibliotecas foram atualizadas, quando executarmos `npm run build`, então o sistema deve compilar com sucesso.
- [ ] **CA04:** Dado que as bibliotecas foram atualizadas, quando executarmos `npm audit`, então não devem haver novas vulnerabilidades severas não mitigadas.

## O que a atividade não inclui

- Atualizações de configuração arquitetural drástica motivadas por *breaking changes* de versões *major* (ex: refatorar todo o código para migrar para Eslint 10.x ou Typescript 7.x, caso exijam alto esforço agora). motivo: [complexo demais agora e foge do escopo de apenas manter estabilidade atual]

### Considerado para o futuro (P2)

- Atualização gradual das *breaking changes* de bibliotecas com versão major ignorada agora.

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | Devemos atualizar pacotes com quebra de versão Major imediatamente (ex: typescript 5.x para 7.x, eslint 9.x para 10.x)? | Desenvolvedor | Não | Tentar atualizar primeiro. Se quebrar algo complexo, manter o update de segurança na major atual (usando a tag 'wanted'). |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Build do projeto | Integração | CA03 | Rodar `npm run build` na raiz do projeto | O comando finaliza com código 0 (sucesso) |
| CT02 | Auditoria de pacotes | Integração | CA04 | Rodar `npm audit` | Nenhuma vulnerabilidade alta/crítica é reportada |
| CT03 | Verificação de pacotes antigos | Integração | CA02 | Rodar `npm outdated` | A lista de pacotes deve ser reduzida drasticamente |

## URL Complementar

- N/A
