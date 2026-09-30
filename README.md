# Fun English

Interactive English activities, games and quizzes for ESL teachers. Inspired by
[Cool English](https://www.coolenglish.org/activities), with the look of
[nfgbrentano.art.br](https://nfgbrentano.art.br).

Every feature starts as a spec in [`SDD/`](SDD/) (see [`CLAUDE.md`](CLAUDE.md)).

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript strict) + Tailwind CSS v4
- Firebase Authentication + Cloud Firestore
- **Static export** (`output: "export"`) hosted on **Firebase Hosting**, free **Spark** plan (no server at runtime)
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

1. Create a project at <https://console.firebase.google.com> (Spark plan, no card needed).
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

| Script                                  | What it does                                           |
| --------------------------------------- | ------------------------------------------------------ |
| `npm run dev` / `build`                 | Next.js dev server; static export to `out/`            |
| `npm run preview`                       | Serve `out/` locally                                   |
| `npm run lint` / `typecheck` / `format` | ESLint, TypeScript, Prettier                           |
| `npm test`                              | Unit tests (Vitest)                                    |
| `npm run test:e2e`                      | End-to-end tests (Playwright, desktop + mobile)        |
| `npm run test:emulator`                 | Rules + seed tests against the emulator (needs Java)   |
| `npm run emulators`                     | Firebase Emulator Suite                                |
| `npm run seed:check`                    | Validate `content/activities/**/*.json`                |
| `npm run seed:emulator`                 | Upsert the activities into the running emulator        |
| `npm run seed -- --production`          | Upsert into the real project (needs service account)   |
| `npm run deploy:rules`                  | Publish `firestore.rules` and `firestore.indexes.json` |
| `npm run deploy`                        | Build and deploy to Firebase Hosting from your machine |

## Deploy (Firebase Hosting via GitHub Actions)

The site is static: `next build` writes `out/`, which Firebase Hosting serves. Two workflows do it:

- [`deploy.yml`](.github/workflows/deploy.yml): lint, test, build and deploy to production on every
  push to `main`, once a day (so activities published in the admin get static pages) and on demand.
- [`preview.yml`](.github/workflows/preview.yml): deploys each pull request to a preview channel
  (expires in 7 days) and comments the URL on the PR.

One-time setup:

1. Google Cloud console > IAM > Service accounts: create `github-deploy` with the roles
   **Firebase Hosting Admin**, **Firebase Authentication Admin**, **API Keys Viewer** and
   **Cloud Run Viewer**. Create a JSON key for it.
2. GitHub > repo Settings > Secrets and variables > Actions:
   - Secret `FIREBASE_SERVICE_ACCOUNT`: the whole JSON key.
   - Variables `NEXT_PUBLIC_SITE_URL` (`https://<project-id>.web.app`) and the
     `NEXT_PUBLIC_FIREBASE_*` web config.
3. Push to `main` (or run the Deploy workflow by hand). The site is at `https://<project-id>.web.app`.
