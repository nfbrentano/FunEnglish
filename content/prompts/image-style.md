# Image style guide

All activity images share one look, so the catalog feels like one collection. It matches the site's
palette (nfgbrentano.art.br): calm, warm, minimal, with a touch of gold.

## Style (paste at the end of every prompt)

> Flat vector illustration, soft warm earthy palette (terracotta, sage green, ochre, muted blue,
> cream) with a small touch of muted gold, subtle paper grain texture, simple rounded shapes,
> gentle soft lighting, centered composition with generous empty space around the subject,
> mid-tone background that works on both dark and light pages. No text, no letters, no numbers,
> no logos, no brand names, no real or famous people, no watermark.

## Rules

- **Format:** thumbnails 1280×800 (16:10); content images up to 1600 px wide.
- **Export:** WebP, ≤ 200 KB each (e.g. `cwebp -q 80 in.png -o thumb.webp`).
- **Where:** `public/images/activities/<slug>/thumb.webp` (and `1.webp`, `2.webp`… for content images).
- **Never** text inside the image: it can't be translated and it isn't accessible.
- **People:** diverse, friendly, generic characters; never real people.
- **Classroom-safe:** nothing violent, scary or suggestive, even for teen/adult activities.
- The `alt` text in the activity JSON describes the image; keep the image faithful to it.
- Check that the tool's terms allow public use of the generated images.

## Workflow

1. Open the prompt file in `content/prompts/images/<slug>/` (one `.txt` per image).
2. Generate with your image tool, pick the best result, export as WebP.
3. Save it at the path written in the prompt file and commit. The site shows the image automatically
   on the next build (until then, cards show the category placeholder).
