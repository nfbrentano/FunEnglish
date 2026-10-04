# Image style guide

All activity images share one look, so the catalog feels like one collection. It matches the site's
palette (nfgbrentano.art.br): calm, warm, minimal, with a touch of gold.

## Style (paste at the end of every prompt)

> Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue,
> cream) with a small touch of muted gold, very subtle, even paper grain, simple rounded shapes,
> gentle soft lighting, centered composition with generous empty space around the subject,
> mid-tone background that works on both dark and light pages. No text, no letters, no numbers,
> no logos, no brand names, no real or famous people, no watermark. Full-bleed flat background
> color from edge to edge: no frame, no border, no round or oval vignette, no wreath, no mandala
> or ornament in the middle of the image.

## Rules

- **Format:** thumbnails and category art 960×600 (aspect ratio 16:10); question options 480×480 (square aspect ratio 1:1); content images up to 960 px wide.
- **Export:** WebP, ≤ 200 KB for thumbnails, ≤ 100 KB for content, ≤ 40 KB for options (e.g. `cwebp -q 80 in.png -o thumb.webp`).
- **Where:** `public/images/activities/<slug>/thumb.webp` (and item images `question-1.webp`, `card-1.webp`…).
- **Never** text inside the image: it can't be translated and it isn't accessible.
- **People:** diverse, friendly, generic characters; never real people.
- **Classroom-safe:** nothing violent, scary or suggestive, even for teen/adult activities.
- The `alt` text in the activity JSON describes the image; keep the image faithful to it.
- Check that the tool's terms allow public use of the generated images.
- Generate **each image in a new chat** (or attach a good image as a style reference): in one long
  chat the tool copies elements from earlier images, like a round frame or a central ornament.

## Workflow

Each image's prompt is stored in the activity JSON (`prompt`, next to `src` and `alt`): the
subject from the `alt` text followed by the style above. In the admin editor, **Write prompt from
alt** builds it, **Copy prompt** copies it and **Upload image** sends the generated file. Details
and the terminal alternative: [`images/README.md`](images/README.md).
