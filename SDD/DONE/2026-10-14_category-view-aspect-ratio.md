# [FIX] Ajuste de Classe de Aspect Ratio no CategoryView

> **Status:** Concluída
> **Autor:** Antigravity · **Revisor:** Natanael Brentano · **Criada em:** 2026-10-14 · **Atualizada em:** 2026-10-14

## Detalhes da Atividade

- **O que precisa ser feito:** Corrigir a classe de proporção do esqueleto de carregamento em `src/components/catalog/category-view.tsx` de `aspect-[4/3]` para a sintaxe nativa do Tailwind v4 `aspect-4/3`.
- **Problema e evidência:** O linter do Tailwind v4 emite o aviso: `"The class aspect-[4/3] can be written as aspect-4/3"` na linha 117 de `src/components/catalog/category-view.tsx`.
- **Impacto de não fazer:** O código mantém sintaxe arbitrária desnecessária, gerando avisos de linter e inconsistência com o design system do projeto.
- **Para quem é destinado:** Desenvolvedores e mantenedores do projeto.
- **História de usuário:** Como mantenedor do código, quero que todas as classes utilitárias de CSS usem as convenções nativas do Tailwind CSS v4, eliminando alertas de linter.
- **Como saberemos que deu certo:** O aviso do linter desaparece e os testes unitários e de build continuam passando com sucesso.

## Requisitos da Atividade

### Requisitos funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RF01 | Substituir `aspect-[4/3]` por `aspect-4/3` no skeleton de `CategoryView`. | P0 | CA01 |

### Requisitos não-funcionais

| ID | Descrição | Prioridade | CAs |
|----|-----------|------------|-----|
| RNF01 | Manter compatibilidade com Tailwind CSS v4. | P0 | CA01 |
| RNF02 | Passar em `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`. | P0 | CA02 |

### Dependências técnicas

- `src/components/catalog/category-view.tsx`

### Recursos necessários

- N/A

## Critérios de Aceitação / Entregas

- [x] **CA01:** Dado o arquivo `src/components/catalog/category-view.tsx`, quando inspecionado pelo linter, então a classe `aspect-4/3` é utilizada no lugar de `aspect-[4/3]` e nenhum aviso é gerado.
- [x] **CA02:** Dado que a correção foi aplicada, quando executados os testes e o build, então todo o conjunto passa sem erros.

## O que a atividade não inclui

- Alterações estruturais ou funcionais no `CategoryView`.

### Considerado para o futuro (P2)

- N/A

## Dúvidas em aberto

| # | Dúvida | Responsável (PO/dev/design) | Bloqueante? | Resposta |
|---|--------|-----------------------------|-------------|----------|
| D01 | N/A | Dev | Não | N/A |

## Sugestões de casos de teste

| # | Cenário | Tipo (unit/integração/e2e/manual) | Cobre | Passos | Resultado esperado |
|---|---------|-----------------------------------|-------|--------|--------------------|
| CT01 | Teste unitário de CategoryView | unit | CA02 | Executar `npx vitest run tests/unit/catalog/category-view.test.tsx` | Testes passam |
| CT02 | Build do projeto | build | CA02 | Executar `npm run build` | Build conclui com sucesso |

## URL Complementar

- Documentação técnica: https://tailwindcss.com/docs/aspect-ratio
