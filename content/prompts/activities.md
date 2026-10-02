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

Same fields as the quiz template above, with `"type": "fill-blanks"` and this `content`:

```json
{
  "mode": "word-bank",
  "items": [
    { "text": "If it [[rains]], we'll stay home.", "hint": "first conditional" },
    { "text": "She [[has lived|'s lived]] here since 2019." }
  ],
  "distractors": ["rained", "lives"]
}
```

Optional per item: `media` (same kinds as the quiz). Optional for songs:
`"credit": { "title": "Song", "artist": "Artist", "url": "https://www.youtube.com/watch?v=..." }`.

### flashcards

10–20 cards. `front` has `text` and/or `image`; `back.text` is the word, plus `definition` and an
`example` sentence. Each image needs an `alt` and a prompt file in `content/prompts/images/`.

`"type": "flashcards"` and this `content` (`speak` is optional: what the speaker button says):

```json
{
  "cards": [
    {
      "front": {
        "image": {
          "src": "/images/activities/kitchen-items/kettle.webp",
          "alt": "A kettle",
          "source": "ai"
        }
      },
      "back": {
        "text": "kettle",
        "definition": "A pot for boiling water.",
        "example": "Can you put the kettle on?"
      },
      "speak": "kettle"
    },
    { "front": { "text": "🍎" }, "back": { "text": "apple" } }
  ]
}
```

### quiz-board

4–6 categories × 3–5 clues, values 100, 200, 300… harder as the value goes up.

`"type": "quiz-board"` and this `content` (at least 3 categories with 3 clues each):

```json
{
  "categories": [
    {
      "name": "Animals",
      "clues": [
        { "value": 100, "question": "This animal says 'moo'.", "answer": "A cow" },
        { "value": 200, "question": "The largest animal on Earth.", "answer": "The blue whale" },
        { "value": 300, "question": "A baby kangaroo is called a…", "answer": "Joey" }
      ]
    },
    {
      "name": "Food",
      "clues": [
        { "value": 100, "question": "A yellow fruit monkeys love.", "answer": "A banana" },
        {
          "value": 200,
          "question": "Italian dish with cheese and tomato on bread.",
          "answer": "Pizza"
        },
        { "value": 300, "question": "Dried grapes are called…", "answer": "Raisins" }
      ]
    },
    {
      "name": "Colors",
      "clues": [
        { "value": 100, "question": "The color of the sky on a sunny day.", "answer": "Blue" },
        { "value": 200, "question": "Mix red and white to get…", "answer": "Pink" },
        { "value": 300, "question": "Mix blue and yellow to get…", "answer": "Green" }
      ]
    }
  ]
}
```

### prompt-cards

6–10 cards with a `prompt`, optional two `options` ("This or That"), `followUps` and `vocabulary`.
Set `"writing": true` for writing tasks.

`"type": "prompt-cards"` and this `content` (a card can show an `image` instead of, or with, the
prompt):

```json
{
  "writing": false,
  "cards": [
    {
      "prompt": "Which would you rather have: a cat or a dog?",
      "options": ["A cat", "A dog"],
      "followUps": ["Why?", "Have you ever had a pet?"],
      "vocabulary": ["pet", "take care of", "walk the dog"]
    }
  ]
}
```

## After generating

1. `npm run seed:check` — fix anything it reports.
2. Give every image a `prompt` (the `alt` subject + the style in `image-style.md`), or use
   **Write prompt from alt** in the admin editor.
3. `npm run seed:emulator` to try it locally; publish with `npm run seed -- --production`.
