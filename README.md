# Fun English

Interactive English activities, games and quizzes for ESL teachers. Inspired by
[Cool English](https://www.coolenglish.org/activities), with the look of
[nfgbrentano.art.br](https://nfgbrentano.art.br).

Every feature starts as a spec in [`SDD/`](SDD/) (see [`CLAUDE.md`](CLAUDE.md)).

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript strict) + Tailwind CSS v4
- Firebase Authentication + Cloud Firestore
- Hosting on **Firebase App Hosting** (Next.js SSR/ISR on Cloud Run), Blaze plan within the free quota
- Vitest + Testing Library (unit), Playwright (e2e), `@firebase/rules-unit-testing` (security rules)

## Requirements

- Node.js 24 LTS (`nvm use`; `>=22.12` works)
- Java 21+, only for the Firebase emulators and `npm run test:emulator` (`brew install openjdk@21`)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the Firebase values
npm run dev                  # http://localhost:3000
```

### Firebase project (one-time)

1. Create a project at <https://console.firebase.google.com> and upgrade it to the **Blaze** plan
   (required by App Hosting). Then create a budget alert in Google Cloud Billing
   (e.g. US$ 5/month with alerts at 50/90/100%).
2. Add a **Web app** and copy its config into the `NEXT_PUBLIC_FIREBASE_*` variables of `.env.local`.
3. Enable **Authentication** (Email/Password and Google) and create a **Firestore** database.
4. For local scripts (seed, set-admin), generate a service account key (Project settings > Service accounts)
   and paste it as single-line JSON into `FIREBASE_SERVICE_ACCOUNT_KEY`. Never commit it.
5. Link the CLI to the project and publish the rules:

   ```bash
   npx firebase login
   npx firebase use --add
   npm run deploy:rules
   ```

### Local development with emulators

```bash
npm run emulators            # Auth :9099, Firestore :8080, UI :4000
```

Then set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` in `.env.local` and run `npm run dev`. Nothing
touches the production project.

## Scripts

| Script                                  | What it does                                            |
| --------------------------------------- | ------------------------------------------------------- |
| `npm run dev` / `build` / `start`       | Next.js dev server, production build, production server |
| `npm run lint` / `typecheck` / `format` | ESLint, TypeScript, Prettier                            |
| `npm test`                              | Unit tests (Vitest)                                     |
| `npm run test:e2e`                      | End-to-end tests (Playwright, desktop + mobile)         |
| `npm run test:emulator`                 | Rules + seed tests against the emulator (needs Java)    |
| `npm run emulators`                     | Firebase Emulator Suite                                 |
| `npm run seed:check`                    | Validate `content/activities/**/*.json`                 |
| `npm run seed:emulator`                 | Upsert the activities into the running emulator         |
| `npm run seed -- --production`          | Upsert into the real project (needs service account)    |
| `npm run deploy:rules`                  | Publish `firestore.rules` and `firestore.indexes.json`  |

## Deploy (Firebase App Hosting)

1. Firebase console > **App Hosting** > Get started: connect the GitHub repo `nfbrentano/FunEnglish`,
   root directory `/`, live branch `main`, backend id `fun-english`.
2. Fill in `apphosting.yaml`: `NEXT_PUBLIC_SITE_URL` (the backend URL shown in the console) and the
   `NEXT_PUBLIC_FIREBASE_*` web config. Commit and push.
3. Every push to `main` starts a new rollout. `maxInstances: 2` in `apphosting.yaml` caps the cost.
4. Add the `*.hosted.app` domain to Firebase Authentication > Settings > Authorized domains.
