# Fun English

Interactive English activities, games and quizzes for ESL teachers. Inspired by
[Cool English](https://www.coolenglish.org/activities), with the look of
[nfgbrentano.art.br](https://nfgbrentano.art.br).

Every feature starts as a spec in [`SDD/`](SDD/) (see [`CLAUDE.md`](CLAUDE.md)).

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript strict) + Tailwind CSS v4
- Firebase Authentication + Cloud Firestore (free **Spark** plan; Firebase Storage is not used)
- Hosting on Vercel (free **Hobby** plan)
- Vitest + Testing Library (unit), Playwright (e2e), `@firebase/rules-unit-testing` (security rules)

## Requirements

- Node.js 24 LTS (`nvm use`; `>=22.12` works)
- Java 21+, only for the Firebase emulators and `npm run test:rules` (`brew install openjdk@21`)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the Firebase values
npm run dev                  # http://localhost:3000
```

### Firebase project (one-time)

1. Create a project at <https://console.firebase.google.com> (Spark plan is enough).
2. Add a **Web app** and copy its config into the `NEXT_PUBLIC_FIREBASE_*` variables of `.env.local`.
3. Enable **Authentication** (Email/Password and Google) and create a **Firestore** database.
4. For server code and scripts, generate a service account key (Project settings > Service accounts)
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
| `npm run test:rules`                    | Firestore rules tests against the emulator (needs Java) |
| `npm run emulators`                     | Firebase Emulator Suite                                 |
| `npm run deploy:rules`                  | Publish `firestore.rules` and `firestore.indexes.json`  |

## Deploy (Vercel)

1. Import `nfbrentano/FunEnglish` at <https://vercel.com/new> (framework: Next.js).
2. Add the variables from `.env.example` in Project settings > Environment Variables.
   Leave `NEXT_PUBLIC_SITE_URL` empty to use the `*.vercel.app` production domain.
3. Every push to `main` deploys to production; every pull request gets a preview URL.
4. Add the Vercel domain to Firebase Authentication > Settings > Authorized domains.
