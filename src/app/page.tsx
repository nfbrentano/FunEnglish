import { SITE_NAME } from "@/lib/site";

// Placeholder until the catalog spec (SDD/2026-09-30_catalogo-de-atividades.md) is implemented.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <p className="text-xs tracking-[0.3em] text-muted uppercase">— Coming soon —</p>
      <h1 className="font-display text-5xl font-medium text-fg sm:text-6xl">{SITE_NAME}</h1>
      <p className="max-w-xl text-lg text-fg-secondary">
        Interactive English activities, games and quizzes for ESL teachers.
      </p>
    </main>
  );
}
