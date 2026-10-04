# Fun English

Interactive English activities, games and quizzes for ESL teachers. Inspired by
[Cool English](https://www.coolenglish.org/activities), with the look of
[nfgbrentano.art.br](https://nfgbrentano.art.br).

Every feature starts as a spec in [`SDD/`](SDD/) (see [`CLAUDE.md`](CLAUDE.md)).

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript strict) + Tailwind CSS v4
- [Next.js](https://nextjs.org) (App Router, TypeScript strict) + Tailwind CSS v4
- Firebase Authentication + Cloud Firestore (`southamerica-east1`)
- Cloud Functions 2ª geração (TypeScript, Node 22, `southamerica-east1`)
- Cloud Storage (`us-central1`) + Realtime Database (`us-central1`)
- **Static export** (`output: "export"`) hosted on **Firebase Hosting** (Blaze plan)
- Vitest + Testing Library (unit), Playwright (e2e), `@firebase/rules-unit-testing` (security rules)

## Requirements

- Node.js 24 LTS (`nvm use`; `>=22.12` works)
- Java 21+, only for the Firebase emulators and `npm run test:emulator` (`brew install openjdk@21`)

## Getting started

```bash
npm install
npm --prefix functions install
cp .env.example .env.local   # fill in the Firebase values
npm run dev                  # http://localhost:3000
```

### Firebase project (one-time)

1. Project on Blaze plan (`fun-english-972a2`).
2. Add a **Web app** and copy its config into the `NEXT_PUBLIC_FIREBASE_*` variables of `.env.local`.
3. Enable **Authentication** (Email/Password, Google and Anonymous), **Firestore** (`southamerica-east1`), **Storage** (`us-central1`) and **Realtime Database** (`us-central1`).
4. For local scripts (seed, set-admin), generate a service account key (Project settings > Service accounts),
   keep the file outside the repo and point `GOOGLE_APPLICATION_CREDENTIALS` at it (or paste it as
   single-line JSON into `FIREBASE_SERVICE_ACCOUNT_KEY`). Never commit it.
5. Link the CLI to the project and publish the rules:

   ```bash
   npx firebase login
   npx firebase use --add
   npm run deploy:rules
   ```

### Regions & Architecture

| Resource | Region | Rationale |
| --- | --- | --- |
| **Firestore** | `southamerica-east1` (São Paulo) | Lowest latency for users in Brazil. |
| **Cloud Functions** | `southamerica-east1` (São Paulo) | Co-located with Firestore to eliminate cross-region egress costs and triggers latency. |
| **Cloud Storage** | `us-central1` (Iowa) | Free tier eligible (5 GB storage, 1 GB/day egress free). Latency difference is negligible for images/whiteboard assets. |
| **Realtime Database** | `us-central1` (Iowa) | RTDB is not offered in South America; `us-central1` is the lowest-latency available region (~120–150 ms). |

### Cost Protection & Budget Limits

- **Budget Alert**: US$ 10/month configured in Google Cloud Billing with alert thresholds at 50%, 90% and 100% sent to the project owner's email.
- **Instance Cap**: All Cloud Functions use `maxInstances: 10` and `minInstances: 0` to prevent runaway concurrency and eliminate idle costs.
- **Storage Lifecycle**: Files in `tmp/` expire after 1 day via `storage.lifecycle.json`:
  ```bash
  gcloud storage buckets update gs://fun-english-972a2.firebasestorage.app --lifecycle-file=storage.lifecycle.json
  ```
- **Secrets Management**: Secrets for Functions must be registered in Secret Manager via `defineSecret(...)` and never committed or exposed via `NEXT_PUBLIC_*`.
- **What to do if a budget alert fires**: Check the GCP Billing Reports page to identify the culprit service. If caused by unexpected traffic or loop in Functions, adjust `maxInstances` in `functions/src/index.ts` or disable the function via Cloud Console.

### Local development with emulators

```bash
npm run emulators            # Auth :9099, Functions :5001, Firestore :8080, Database :9000, Storage :9199, UI :4000
```

Then set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` in `.env.local` and run `npm run dev`. Nothing
touches the production project.

## Scripts

| Script                                  | What it does                                                    |
| --------------------------------------- | --------------------------------------------------------------- |
| `npm run dev` / `build`                 | Next.js dev server; static export to `out/`                     |
| `npm run preview`                       | Serve `out/` locally                                            |
| `npm run lint` / `typecheck` / `format` | ESLint, TypeScript, Prettier                                    |
| `npm test`                              | Unit tests (Vitest)                                             |
| `npm run test:e2e`                      | End-to-end tests (Playwright, desktop + mobile)                 |
| `npm run test:emulator`                 | Rules (Firestore, Storage, RTDB) + Functions + seed in emulator |
| `npm run emulators`                     | Firebase Emulator Suite (Auth, Functions, Firestore, DB, Storage)|
| `npm run build:functions`               | Compile TypeScript functions (`functions/lib`)                  |
| `npm run lint:functions`                | Lint `functions/`                                               |
| `npm run test:functions`                | Unit tests for functions (`functions/`)                         |
| `npm run deploy:functions`              | Deploy Cloud Functions to Firebase                             |
| `npm run deploy:storage-rules`          | Deploy `storage.rules`                                          |
| `npm run deploy:database-rules`         | Deploy `database.rules.json`                                    |
| `npm run deploy:rules`                  | Publish Firestore, Storage and Realtime Database rules          |
| `npm run seed:check`                    | Validate `content/activities/**/*.json`                         |
| `npm run seed:emulator`                 | Upsert the activities into the running emulator                 |
| `npm run seed -- --production`          | Upsert into the real project (needs service account)            |
| `npm run deploy`                        | Build and deploy to Firebase Hosting from your machine          |

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
