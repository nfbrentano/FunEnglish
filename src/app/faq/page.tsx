import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/layout/prose-page";
import { FaqAccordion } from "@/components/pages/faq-accordion";
import { loadFaq } from "@/lib/pages/content";

const faq = loadFaq();

export const metadata: Metadata = { title: "FAQ", description: faq.description };

export default function FaqPage() {
  return (
    <ProsePage title={faq.title} updated={faq.updated}>
      <FaqAccordion questions={faq.questions} />
      <p className="mt-10 text-fg-secondary">
        Still have a question?{" "}
        <Link href="/contact" className="text-accent underline underline-offset-4">
          Contact us
        </Link>
        .
      </p>
    </ProsePage>
  );
}
