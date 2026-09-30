# Instruções do projeto

## Spec Driven Development (SDD)

Toda nova feature, correção ou atividade deve ter uma especificação escrita **antes** da implementação.

### Regras

1. **Sempre** crie a especificação como um arquivo `.md` **dentro da pasta [`SDD/`](SDD/)**. Nunca crie especificações na raiz ou em outras pastas.
2. **Sempre** use como base o modelo [`SDD/modelo_feature.md`](SDD/modelo_feature.md): copie a estrutura e preencha todas as seções, na mesma ordem:
   - Título da Atividade (com tag, ex.: `[FEAT]`, `[FIX]`, `{SEO}`, `(UI)`)
   - Detalhes da Atividade
   - Requisitos da Atividade
   - Critérios de Aceitação / Entregas
   - O que a atividade não inclui
   - Sugestões de casos de teste
   - URL Complementar
3. **Não altere** o arquivo `SDD/modelo_feature.md`. Ele é o modelo de referência.
4. Os critérios de aceitação devem seguir o formato: _"Dado que [contexto], quando [ação], então [resultado esperado]"_.
5. Se alguma seção não se aplicar, mantenha o título e escreva `N/A` com uma breve justificativa. Não remova seções.
6. A implementação só deve começar depois que a especificação estiver criada e, se possível, revisada.
7. **Sempre** que concluir uma feature (implementada e validada com os casos de teste), **mova** o arquivo `.md` da especificação de `SDD/` para a pasta [`SDD/DONE/`](SDD/DONE/), mantendo o mesmo nome de arquivo. Crie a pasta `SDD/DONE/` caso ela ainda não exista. Na raiz de `SDD/` devem ficar apenas o modelo e as especificações pendentes ou em andamento.

### Nomenclatura dos arquivos

Use o padrão `AAAA-MM-DD_nome-da-feature.md`, em minúsculas e com hífens, por exemplo:

```
SDD/2026-09-23_busca-de-poemas.md
SDD/2026-09-23_modo-escuro.md
```

### Fluxo

1. Copiar `SDD/modelo_feature.md` para `SDD/AAAA-MM-DD_nome-da-feature.md`.
2. Preencher todas as seções.
3. Implementar seguindo os requisitos e critérios de aceitação.
4. Validar com os casos de teste sugeridos antes de concluir.
5. Após concluir, mover o arquivo para `SDD/DONE/AAAA-MM-DD_nome-da-feature.md` (ex.: `mv SDD/2026-09-23_modo-escuro.md SDD/DONE/`, ou `git mv` se o arquivo já estiver versionado).

## Next.js

@AGENTS.md
