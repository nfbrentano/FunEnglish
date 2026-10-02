# Imagens das atividades

O **prompt de cada imagem fica no JSON da atividade**, no campo `prompt` ao lado de `src` e `alt`
(spec `SDD/2026-10-02_imagens-pelo-painel.md`). Estilo e regras: [`../image-style.md`](../image-style.md).

## Pelo painel (recomendado)

1. Conecte o GitHub uma vez em **/admin/settings** (token só deste repositório, permissão _Contents_).
2. No editor da atividade, em cada imagem: **Write prompt from alt** (se o prompt estiver vazio) →
   **Copy prompt** → gere a imagem na sua ferramenta de IA → **Upload image**.
3. O painel converte para WebP (≤ 200 KB; thumbnails 1280×800), faz o commit em
   `public/images/activities/<slug>/<nome>.webp` e a imagem entra no site no próximo deploy (~3 min).

A página **/admin/images** lista as imagens que ainda faltam, com o prompt e o nome do arquivo, e
aceita várias de uma vez ("Upload several") com arquivos nomeados `<slug>--<nome>.png`.

## Pelo terminal

Salve as imagens como `<slug>--<nome>.png` numa pasta e rode
`npm run images:import -- <pasta>` (mesmas regras de tamanho e formato).

## Regerar (revisão de 2026-10-01)

Estas imagens saíram com moldura redonda, mandala no centro, fundo com ruído ou texto ("at"). Os
prompts nos JSONs já estão corrigidos; gere de novo e envie pelo painel:

- `picture-description-1--thumb.png`
- `picture-description-1--1.png`
- `picture-description-1--2.png`
- `picture-description-1--3.png`
- `picture-description-1--4.png`
- `picture-description-1--5.png`
- `picture-description-1--6.png`
- `prepositions-of-time-in-on-at--thumb.png`
- `present-perfect-or-past-simple--thumb.png`
- `quiz-board-basic-1--thumb.png`
- `reading-signs-and-notices--thumb.png`
- `reading-text-messages-1--thumb.png`
- `short-ads-and-notices--thumb.png`
- `sintel-watch-and-answer--thumb.png`
- `some-or-any--thumb.png`
- `story-starters-1--thumb.png`
- `ted-keep-your-goals-to-yourself--thumb.png`
- `this-or-that-1--thumb.png`
- `whats-the-best-reply--thumb.png`
- `would-you-rather-1--thumb.png`
- `writing-emails-1--thumb.png`

**Dica:** gere **cada imagem numa conversa nova** da ferramenta (ou anexe uma imagem boa como
referência, por exemplo `public/images/activities/kitchen-items/kettle.webp`, dizendo "same style
as this reference"). Na mesma conversa, a ferramenta tende a copiar elementos das imagens
anteriores, como a moldura.
