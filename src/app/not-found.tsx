import { ButtonLink } from "@/components/ui/button";
import { strings } from "@/lib/strings";

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center">
      <p className="font-display text-7xl text-accent">404</p>
      <h1 className="font-display text-4xl font-medium">{strings.notFound.title}</h1>
      <p className="text-fg-secondary">{strings.notFound.description}</p>
      <ButtonLink href="/activities">{strings.notFound.cta}</ButtonLink>
    </section>
  );
}
