# Activity generation guide

How to generate new activities with AI (Claude, ChatGPT, Gemini…) so they pass `npm run seed:check`
on the first try. Review every generated activity before publishing (see the admin review queue).

## Where files go

`content/activities/ai/<category>/<slug>.json` — the `ai/` folder marks them as AI-generated and
pending review. Categories: fun, grammar, listening, pictures, reading, speaking, videos,
vocabulary, writing. Schemas: `src/lib/activities/schema/` (the validator explains any error).

## Prompt to use

> You are an experienced ESL teacher writing activities for {LEVEL} students ({CEFR}).
> Write one **{TYPE}** activity for the **{CATEGORY}** category about **{TOPIC}**.
> Rules:
>
> - American English. Vocabulary and grammar appropriate for {CEFR}. Sentences short and natural.
> - Original text only: never copy textbooks, exams (Cambridge, TOEFL…), song lyrics or websites.
> - Classroom-safe for all ages: no stereotypes, violence, politics, religion or brands.
> - {TYPE_RULES}
> - Output **only** JSON matching this template, no comments:
>   {TEMPLATE}

| Level        | CEFR  | Notes                                                          |
| ------------ | ----- | -------------------------------------------------------------- |
| beginner     | A1–A2 | Present simple/continuous, everyday words, ≤ 10-word sentences |
| intermediate | B1–B2 | Past/perfect tenses, phrasal verbs, idioms with context        |
| advanced     | C1–C2 | Nuance, register, longer texts, inference                      |

## Type rules and templates

### quiz

8–10 questions, 3–4 options, **exactly one** `"correct": true` (several only if the question says
"choose all"). Every question has a one-sentence `explanation` that teaches the rule.
Optional `media`: `{"kind": "tts", "text": "..."}` for listening, `{"kind": "youtube", "videoId":
"...", "start": 0, "end": 45}` for video (official channels only; run `npm run content:check-videos`).

```json
{
  "slug": "present-continuous-1",
  "title": "Present Continuous 1",
  "description": "One sentence for the card and search results.",
  "category": "grammar",
  "type": "quiz",
  "levelMin": "beginner",
  "levelMax": "intermediate",
  "tags": ["present continuous", "verbs"],
  "status": "published",
  "thumbnail": {
    "src": "/images/activities/present-continuous-1/thumb.webp",
    "alt": "What the thumbnail shows",
    "source": "ai"
  },
  "content": {
    "questions": [
      {
        "prompt": "Look! The children ___ in the park.",
        "options": [
          { "text": "are playing", "correct": true },
          { "text": "play" },
          { "text": "plays" }
        ],
        "explanation": "Use the present continuous for actions happening now (Look!)."
      }
    ]
  }
}
```

### fill-blanks

6–10 items. Mark each gap as `[[answer]]` or `[[answer|alternative]]`. `mode` is `typing` or
`word-bank` (add `distractors` for the bank). Song excerpts: only the lines of the clip, with credit.

### flashcards

10–20 cards. `front` has `text` and/or `image`; `back.text` is the word, plus `definition` and an
`example` sentence. Each image needs an `alt` and a prompt file in `content/prompts/images/`.

### quiz-board

4–6 categories × 3–5 clues, values 100, 200, 300… harder as the value goes up.

### prompt-cards

6–10 cards with a `prompt`, optional two `options` ("This or That"), `followUps` and `vocabulary`.
Set `"writing": true` for writing tasks.

## After generating

1. `npm run seed:check` — fix anything it reports.
2. Add a thumbnail prompt in `content/prompts/images/<slug>/thumb.txt` (see `image-style.md`).
3. `npm run seed:emulator` to try it locally; publish with `npm run seed -- --production`.
