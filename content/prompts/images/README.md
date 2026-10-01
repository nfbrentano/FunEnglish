# Prompts de imagem

Todas as imagens do acervo, uma por linha. Cada uma tem um **nome de arquivo único**: salve a imagem gerada com esse nome e o comando de importação faz o resto.

## Como usar

1. Crie uma pasta para as imagens, por exemplo `~/Downloads/fun-english-images`.
2. Para cada linha abaixo: copie o prompt, gere a imagem na sua ferramenta de IA e **salve na pasta com o nome da coluna "Arquivo"** (pode ser `.png`, `.jpg` ou `.webp`).
3. Rode `npm run images:import -- ~/Downloads/fun-english-images`. Ele converte para WebP, ajusta o tamanho e coloca cada imagem em `public/images/activities/<slug>/`, e lista as que ainda faltam.
4. Faça commit das imagens (ou peça ao Claude). No próximo deploy elas aparecem no site.

Estilo e regras: [`../image-style.md`](../image-style.md). Os mesmos prompts estão um por arquivo em `<slug>/<nome>.txt`.

## Lista (38 imagens)

| #   | Arquivo                                           | Atividade                                 | Tamanho               |
| --- | ------------------------------------------------- | ----------------------------------------- | --------------------- |
| 1   | `big-buck-bunny-watch-and-answer--thumb.png`      | Big Buck Bunny: Watch and Answer          | 1280x800              |
| 2   | `emoji-food-vocabulary--thumb.png`                | Emoji Food Vocabulary                     | 1280x800              |
| 3   | `emoji-idioms--thumb.png`                         | Emoji Idioms                              | 1280x800              |
| 4   | `emoji-stories-what-happened--thumb.png`          | Emoji Stories: What Happened?             | 1280x800              |
| 5   | `everyday-dialogues-at-the-cafe--thumb.png`       | Everyday Dialogues: At the Café           | 1280x800              |
| 6   | `guess-the-idiom-1--thumb.png`                    | Guess the Idiom 1                         | 1280x800              |
| 7   | `kitchen-items--cutting-board.png`                | Kitchen Items                             | até 1600px de largura |
| 8   | `kitchen-items--frying-pan.png`                   | Kitchen Items                             | até 1600px de largura |
| 9   | `kitchen-items--kettle.png`                       | Kitchen Items                             | até 1600px de largura |
| 10  | `kitchen-items--thumb.png`                        | Kitchen Items                             | 1280x800              |
| 11  | `kitchen-items--whisk.png`                        | Kitchen Items                             | até 1600px de largura |
| 12  | `linking-words-1--thumb.png`                      | Linking Words: because, so, but, although | 1280x800              |
| 13  | `listen-and-choose-numbers-and-prices--thumb.png` | Listen and Choose: Numbers and Prices     | 1280x800              |
| 14  | `minimal-pairs-ship-or-sheep--thumb.png`          | Minimal Pairs: Ship or Sheep?             | 1280x800              |
| 15  | `odd-one-out-1--thumb.png`                        | Odd One Out 1                             | 1280x800              |
| 16  | `opposites-1--thumb.png`                          | Opposites 1                               | 1280x800              |
| 17  | `phrasal-verbs-with-get--thumb.png`               | Phrasal Verbs with GET                    | 1280x800              |
| 18  | `picture-description-1--1.png`                    | Picture Description 1 (rascunho)          | até 1600px de largura |
| 19  | `picture-description-1--2.png`                    | Picture Description 1 (rascunho)          | até 1600px de largura |
| 20  | `picture-description-1--3.png`                    | Picture Description 1 (rascunho)          | até 1600px de largura |
| 21  | `picture-description-1--4.png`                    | Picture Description 1 (rascunho)          | até 1600px de largura |
| 22  | `picture-description-1--5.png`                    | Picture Description 1 (rascunho)          | até 1600px de largura |
| 23  | `picture-description-1--6.png`                    | Picture Description 1 (rascunho)          | até 1600px de largura |
| 24  | `picture-description-1--thumb.png`                | Picture Description 1 (rascunho)          | 1280x800              |
| 25  | `prepositions-of-time-in-on-at--thumb.png`        | Prepositions of Time: in, on, at          | 1280x800              |
| 26  | `present-perfect-or-past-simple--thumb.png`       | Present Perfect or Past Simple?           | 1280x800              |
| 27  | `quiz-board-basic-1--thumb.png`                   | Quiz Board Basic 1                        | 1280x800              |
| 28  | `reading-signs-and-notices--thumb.png`            | Reading Signs and Notices                 | 1280x800              |
| 29  | `reading-text-messages-1--thumb.png`              | Reading Text Messages 1                   | 1280x800              |
| 30  | `short-ads-and-notices--thumb.png`                | Short Ads and Notices                     | 1280x800              |
| 31  | `sintel-watch-and-answer--thumb.png`              | Sintel: Watch and Answer                  | 1280x800              |
| 32  | `some-or-any--thumb.png`                          | Some or Any                               | 1280x800              |
| 33  | `story-starters-1--thumb.png`                     | Story Starters 1                          | 1280x800              |
| 34  | `ted-keep-your-goals-to-yourself--thumb.png`      | TED: Keep Your Goals to Yourself          | 1280x800              |
| 35  | `this-or-that-1--thumb.png`                       | This or That 1                            | 1280x800              |
| 36  | `whats-the-best-reply--thumb.png`                 | What's the Best Reply?                    | 1280x800              |
| 37  | `would-you-rather-1--thumb.png`                   | Would You Rather? 1                       | 1280x800              |
| 38  | `writing-emails-1--thumb.png`                     | Writing Emails 1                          | 1280x800              |

## Prompts

### 1. `big-buck-bunny-watch-and-answer--thumb.png`

Big Buck Bunny: Watch and Answer · 1280x800 (16:10)

```text
A big friendly rabbit standing in a sunny forest. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 2. `emoji-food-vocabulary--thumb.png`

Emoji Food Vocabulary · 1280x800 (16:10)

```text
A plate of colorful fruit and vegetables. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 3. `emoji-idioms--thumb.png`

Emoji Idioms · 1280x800 (16:10)

```text
A cat peeking out of a shopping bag. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 4. `emoji-stories-what-happened--thumb.png`

Emoji Stories: What Happened? · 1280x800 (16:10)

```text
A comic strip made of emoji in three panels. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 5. `everyday-dialogues-at-the-cafe--thumb.png`

Everyday Dialogues: At the Café · 1280x800 (16:10)

```text
A barista handing a cup of coffee to a customer. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 6. `guess-the-idiom-1--thumb.png`

Guess the Idiom 1 · 1280x800 (16:10)

```text
A speech bubble full of colorful question marks. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 7. `kitchen-items--cutting-board.png`

Kitchen Items · up to 1600px wide

```text
A wooden cutting board. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 8. `kitchen-items--frying-pan.png`

Kitchen Items · up to 1600px wide

```text
A frying pan. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 9. `kitchen-items--kettle.png`

Kitchen Items · up to 1600px wide

```text
A kettle. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 10. `kitchen-items--thumb.png`

Kitchen Items · 1280x800 (16:10)

```text
Illustrated kitchen shelf with pots, cups and a kettle. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 11. `kitchen-items--whisk.png`

Kitchen Items · up to 1600px wide

```text
A metal whisk. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 12. `linking-words-1--thumb.png`

Linking Words: because, so, but, although · 1280x800 (16:10)

```text
Puzzle pieces connected by a chain. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 13. `listen-and-choose-numbers-and-prices--thumb.png`

Listen and Choose: Numbers and Prices · 1280x800 (16:10)

```text
A price tag, a clock and a phone keypad. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 14. `minimal-pairs-ship-or-sheep--thumb.png`

Minimal Pairs: Ship or Sheep? · 1280x800 (16:10)

```text
A small ship and a fluffy sheep side by side. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 15. `odd-one-out-1--thumb.png`

Odd One Out 1 · 1280x800 (16:10)

```text
Four colorful boxes, one of them a different shape. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 16. `opposites-1--thumb.png`

Opposites 1 · 1280x800 (16:10)

```text
A sun and a snowflake facing each other. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 17. `phrasal-verbs-with-get--thumb.png`

Phrasal Verbs with GET · 1280x800 (16:10)

```text
The word GET surrounded by arrows pointing in different directions. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 18. `picture-description-1--1.png`

Picture Description 1 · up to 1600px wide

```text
A busy farmers' market with stalls of fruit and vegetables. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 19. `picture-description-1--2.png`

Picture Description 1 · up to 1600px wide

```text
A family having a picnic in a park on a sunny day. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 20. `picture-description-1--3.png`

Picture Description 1 · up to 1600px wide

```text
A crowded train station at rush hour. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 21. `picture-description-1--4.png`

Picture Description 1 · up to 1600px wide

```text
A classroom where students are doing a science experiment. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 22. `picture-description-1--5.png`

Picture Description 1 · up to 1600px wide

```text
A rainy street with people holding umbrellas. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 23. `picture-description-1--6.png`

Picture Description 1 · up to 1600px wide

```text
A beach with people swimming, surfing and building sandcastles. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 24. `picture-description-1--thumb.png`

Picture Description 1 · 1280x800 (16:10)

```text
A busy city street scene full of people. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 25. `prepositions-of-time-in-on-at--thumb.png`

Prepositions of Time: in, on, at · 1280x800 (16:10)

```text
A clock, a calendar page and a sun over the word 'at'. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 26. `present-perfect-or-past-simple--thumb.png`

Present Perfect or Past Simple? · 1280x800 (16:10)

```text
A calendar with some days crossed out and an arrow pointing to today. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 27. `quiz-board-basic-1--thumb.png`

Quiz Board Basic 1 · 1280x800 (16:10)

```text
A colorful game board with numbered tiles. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 28. `reading-signs-and-notices--thumb.png`

Reading Signs and Notices · 1280x800 (16:10)

```text
A wall of colorful street and shop signs. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 29. `reading-text-messages-1--thumb.png`

Reading Text Messages 1 · 1280x800 (16:10)

```text
A smartphone screen with chat bubbles. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 30. `short-ads-and-notices--thumb.png`

Short Ads and Notices · 1280x800 (16:10)

```text
A community notice board covered with paper ads. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 31. `sintel-watch-and-answer--thumb.png`

Sintel: Watch and Answer · 1280x800 (16:10)

```text
A young woman with a staff standing on a snowy mountain. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 32. `some-or-any--thumb.png`

Some or Any · 1280x800 (16:10)

```text
A kitchen table with a few apples and an empty fruit bowl. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 33. `story-starters-1--thumb.png`

Story Starters 1 · 1280x800 (16:10)

```text
An open notebook with a pencil and stars floating out of the pages. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 34. `ted-keep-your-goals-to-yourself--thumb.png`

TED: Keep Your Goals to Yourself · 1280x800 (16:10)

```text
A person writing goals in a notebook with a finger on their lips. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 35. `this-or-that-1--thumb.png`

This or That 1 · 1280x800 (16:10)

```text
Two doors side by side, one blue and one orange. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 36. `whats-the-best-reply--thumb.png`

What's the Best Reply? · 1280x800 (16:10)

```text
Two people chatting with speech bubbles. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 37. `would-you-rather-1--thumb.png`

Would You Rather? 1 · 1280x800 (16:10)

```text
A road splitting into two paths with signs pointing left and right. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```

### 38. `writing-emails-1--thumb.png`

Writing Emails 1 · 1280x800 (16:10)

```text
An envelope with an @ symbol and a paper airplane. Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue, cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes, gentle soft lighting, centered composition with generous empty space around the subject, mid-tone background that works on both dark and light pages. No text, no letters, no numbers, no logos, no brand names, no real or famous people, no watermark.
```
