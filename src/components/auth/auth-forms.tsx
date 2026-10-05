"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/auth/actions";
import { authErrorMessage, isCancelled } from "@/lib/auth/errors";
import { safeNext } from "@/lib/auth/redirect";
import { useAuth } from "@/lib/auth/use-auth";
import { strings } from "@/lib/strings";

const MIN_PASSWORD = 8;

const nextFromUrl = () => safeNext(new URLSearchParams(window.location.search).get("next"));

const noSubscription = () => () => {};
/** The page's query string, read after hydration (the static HTML has none). */
function useSearch(): string {
  return useSyncExternalStore(
    noSubscription,
    () => window.location.search,
    () => "",
  );
}

/** Sends a signed-in user to their destination (/student for students, or `next` for teachers). */
function useRedirectWhenSignedIn() {
  const router = useRouter();
  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      if (user.role === "student") {
        router.replace("/student");
      } else {
        router.replace(nextFromUrl());
      }
    }
  }, [user, router]);
}

function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-5xl font-medium">{title}</h1>
        <p className="text-fg-secondary">{subtitle}</p>
      </div>
      <div className="space-y-5 rounded-2xl border border-border-subtle bg-elevated p-6">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  ...input
}: { label: string; hint?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined}
        className={`min-h-12 w-full rounded-xl border bg-primary px-4 text-fg ${
          error ? "border-error" : "border-border-strong focus:border-accent"
        }`}
        {...input}
      />
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  return (
    <p
      role="alert"
      className={message ? "rounded-xl bg-error/10 px-4 py-3 text-sm text-error" : "sr-only"}
    >
      {message ?? ""}
    </p>
  );
}

function GoogleButton({
  onError,
  disabled,
}: {
  onError: (message: string) => void;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        className="w-full"
        disabled={disabled || busy}
        onClick={async () => {
          setBusy(true);
          try {
            await signInWithGoogle();
          } catch (error) {
            if (!isCancelled(error)) onError(authErrorMessage(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
          <path
            fill="currentColor"
            d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3ZM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Zm-5.6-8a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9ZM12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.8A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z"
          />
        </svg>
        {strings.auth.google}
      </Button>
      <p className="flex items-center gap-3 text-xs text-muted uppercase before:h-px before:flex-1 before:bg-border-subtle after:h-px after:flex-1 after:bg-border-subtle">
        {strings.auth.or}
      </p>
    </>
  );
}

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(event: FormEvent, action: () => Promise<unknown>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}

export function LoginForm() {
  useRedirectWhenSignedIn();
  const search = useSearch();
  const { busy, error, setError, run } = useSubmit();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthCard title={strings.auth.loginTitle} subtitle={strings.auth.loginSubtitle}>
      <GoogleButton onError={setError} disabled={busy} />
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => run(event, () => signInWithEmail(email, password))}
      >
        <Field
          label={strings.auth.email}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label={strings.auth.password}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormError message={error} />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? strings.auth.working : strings.auth.logIn}
        </Button>
      </form>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/reset-password" className="text-accent hover:underline">
          {strings.auth.forgot}
        </Link>
        <span className="text-fg-secondary">
          {strings.auth.noAccount}{" "}
          <Link href={`/signup${search}`} className="text-accent hover:underline">
            {strings.auth.createOne}
          </Link>
        </span>
      </div>
    </AuthCard>
  );
}

export function SignupForm() {
  useRedirectWhenSignedIn();
  const { busy, error, setError, run } = useSubmit();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; password?: string }>({});

  return (
    <AuthCard title={strings.auth.signupTitle} subtitle={strings.auth.signupSubtitle}>
      <GoogleButton onError={setError} disabled={busy} />
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          const errors = {
            name: name.trim() ? undefined : strings.auth.errors.nameRequired,
            password:
              password.length >= MIN_PASSWORD ? undefined : strings.auth.errors.weakPassword,
          };
          setFieldErrors(errors);
          if (errors.name || errors.password) {
            event.preventDefault();
            return;
          }
          void run(event, () => signUpWithEmail(name, email, password));
        }}
      >
        <Field
          label={strings.auth.name}
          autoComplete="name"
          required
          value={name}
          error={fieldErrors.name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label={strings.auth.email}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label={strings.auth.password}
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD}
          hint={strings.auth.passwordHint}
          error={fieldErrors.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormError message={error} />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? strings.auth.working : strings.auth.signUp}
        </Button>
      </form>
      <p className="text-center text-sm text-fg-secondary">
        {strings.auth.haveAccount}{" "}
        <Link href="/login" className="text-accent hover:underline">
          {strings.auth.logInInstead}
        </Link>
      </p>
    </AuthCard>
  );
}

export function ResetPasswordForm() {
  const { busy, error, run } = useSubmit();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <AuthCard title={strings.auth.resetTitle} subtitle={strings.auth.resetSubtitle}>
      {sent ? (
        <p role="status" className="rounded-xl bg-success/10 px-4 py-3 text-sm">
          {strings.auth.resetSent}
        </p>
      ) : (
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) =>
            run(event, async () => {
              await sendPasswordReset(email);
              setSent(true);
            })
          }
        >
          <Field
            label={strings.auth.email}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FormError message={error} />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? strings.auth.working : strings.auth.sendLink}
          </Button>
        </form>
      )}
      <Link href="/login" className="block text-center text-sm text-accent hover:underline">
        {strings.auth.backToLogin}
      </Link>
    </AuthCard>
  );
}
