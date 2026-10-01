import type { Metadata } from "next";
import { ContactForm } from "@/components/pages/contact-form";
import { CONTACT_EMAIL } from "@/lib/site";
import { strings } from "@/lib/strings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions, ideas for new activities or a mistake you spotted? Send us a message.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto w-full max-w-2xl space-y-8 px-4 py-14">
      <header className="space-y-3">
        <h1 className="font-display text-5xl font-medium sm:text-6xl">{strings.contact.title}</h1>
        <p className="text-fg-secondary">
          {strings.contact.intro} {strings.contact.emailUs}{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </header>
      <ContactForm />
    </section>
  );
}
