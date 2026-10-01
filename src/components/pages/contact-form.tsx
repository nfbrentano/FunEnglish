"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  firestoreContact,
  MAX_MESSAGE,
  validateContact,
  type ContactErrors,
  type ContactInput,
  type ContactSender,
} from "@/lib/contact/contact";
import { strings } from "@/lib/strings";

const t = strings.contact;
const EMPTY: Record<keyof ContactInput, string> = { name: "", email: "", subject: "", message: "" };
const fieldClasses = (error?: string) =>
  `w-full rounded-xl border bg-primary px-4 text-fg ${
    error ? "border-error" : "border-border-strong focus:border-accent"
  }`;

function Field({
  name,
  label,
  error,
  hint,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  children: (props: {
    id: string;
    "aria-invalid"?: true;
    "aria-describedby"?: string;
  }) => React.ReactNode;
}) {
  const id = `${useId()}-${name}`;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
      })}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Contact form: saved to Firestore (contactMessages), read in the Firebase console. */
export function ContactForm({ send = firestoreContact }: { send?: ContactSender }) {
  const [values, setValues] = useState(EMPTY);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const set = (field: keyof ContactInput) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateContact(values);
    if (!result.ok) {
      setErrors(result.errors);
      const first = Object.keys(result.errors)[0];
      event.currentTarget.querySelector<HTMLElement>(`[id$="-${first}"]`)?.focus();
      return;
    }
    setStatus("sending");
    try {
      // Bots fill every field, people never see this one: pretend it worked and save nothing.
      if (!honeypot) await send(result.data);
      setStatus("sent");
      setValues(EMPTY);
    } catch (error) {
      console.warn("Could not send the contact message", error);
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-border-subtle bg-elevated p-6">
        <p role="status" className="flex items-center gap-2 text-lg text-success">
          <CheckCircle2 aria-hidden="true" className="size-5" />
          {t.sent}
        </p>
        <Button variant="secondary" onClick={() => setStatus("idle")}>
          {t.sendAnother}
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-border-subtle bg-elevated p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="name" label={t.name} error={errors.name}>
          {(props) => (
            <input
              {...props}
              autoComplete="name"
              maxLength={100}
              value={values.name}
              onChange={(e) => set("name")(e.target.value)}
              className={`min-h-12 ${fieldClasses(errors.name)}`}
            />
          )}
        </Field>
        <Field name="email" label={t.email} error={errors.email}>
          {(props) => (
            <input
              {...props}
              type="email"
              autoComplete="email"
              maxLength={254}
              value={values.email}
              onChange={(e) => set("email")(e.target.value)}
              className={`min-h-12 ${fieldClasses(errors.email)}`}
            />
          )}
        </Field>
      </div>
      <Field name="subject" label={t.subject} error={errors.subject}>
        {(props) => (
          <input
            {...props}
            maxLength={150}
            value={values.subject}
            onChange={(e) => set("subject")(e.target.value)}
            className={`min-h-12 ${fieldClasses(errors.subject)}`}
          />
        )}
      </Field>
      <Field
        name="message"
        label={t.message}
        error={errors.message}
        hint={t.characters(values.message.length, MAX_MESSAGE)}
      >
        {(props) => (
          <textarea
            {...props}
            rows={6}
            value={values.message}
            onChange={(e) => set("message")(e.target.value)}
            className={`py-3 ${fieldClasses(errors.message)}`}
          />
        )}
      </Field>

      {/* Honeypot: hidden from people and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>

      {status === "error" && (
        <p role="alert" className="text-sm text-error">
          {t.error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-muted">
          {t.privacy}{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-fg">
            {t.privacyLink}
          </Link>
          .
        </p>
        <Button type="submit" disabled={status === "sending"}>
          {status === "sending" ? t.sending : t.send}
        </Button>
      </div>
    </form>
  );
}
