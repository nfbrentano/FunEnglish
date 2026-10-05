"use client";

import { AlertCircle, ArrowRight, CheckCircle2, GraduationCap, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/auth/actions";
import { authErrorMessage } from "@/lib/auth/errors";
import { notifyProfileChanged } from "@/lib/auth/firebase-auth";
import { useAuth } from "@/lib/auth/use-auth";
import { callRedeemInvite, callValidateInvite } from "@/lib/functions";
import { strings } from "@/lib/strings";

export function JoinView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = (searchParams.get("code") || "").trim().toUpperCase();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [validating, setValidating] = useState(Boolean(code));
  const [inviteInfo, setInviteInfo] = useState<{
    valid: boolean;
    studentName?: string;
    teacherName?: string;
    error?: string;
  } | null>(() => (!code ? { valid: false, error: strings.portal.invalidInvite } : null));

  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Validate invite code on mount
  useEffect(() => {
    if (!code) return;

    let active = true;
    callValidateInvite(code)
      .then((res) => {
        if (!active) return;
        setInviteInfo(res);
        if (res.studentName) {
          setName(res.studentName);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.warn("Error validating invite:", err);
        setInviteInfo({
          valid: false,
          error: strings.portal.invalidInvite,
        });
      })
      .finally(() => {
        if (active) setValidating(false);
      });

    return () => {
      active = false;
    };
  }, [code]);

  const handleRedeem = async () => {
    if (!code) return;
    try {
      setRedeeming(true);
      setFormError(null);
      await callRedeemInvite(code);
      notifyProfileChanged();
      toast("Connected to student portal!");
      router.replace("/student");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error redeeming invite";
      setFormError(msg);
      toast(msg);
    } finally {
      setRedeeming(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setRedeeming(true);

    try {
      if (mode === "signup") {
        if (!name.trim()) {
          setFormError("Name is required");
          setRedeeming(false);
          return;
        }
        if (password.length < 8) {
          setFormError(strings.auth.errors.weakPassword);
          setRedeeming(false);
          return;
        }
        await signUpWithEmail(name.trim(), email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }

      // After user is authenticated, redeem the invite (CA02)
      await callRedeemInvite(code);
      notifyProfileChanged();
      router.replace("/student");
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setRedeeming(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setRedeeming(true);
    try {
      await signInWithGoogle();
      await callRedeemInvite(code);
      notifyProfileChanged();
      router.replace("/student");
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setRedeeming(false);
    }
  };

  if (validating || authLoading) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 space-y-6 text-center">
        <Skeleton className="h-10 w-48 mx-auto rounded-full" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  // Invalid or expired code (CA10)
  if (!inviteInfo?.valid) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
        <div className="rounded-3xl border border-dashed border-error/40 bg-elevated p-8 sm:p-10 space-y-5">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-error/10 text-error">
            <AlertCircle className="size-7" />
          </div>
          <h1 className="font-display text-2xl font-medium text-fg">
            {strings.portal.joinTitle}
          </h1>
          <p className="text-sm text-fg-secondary leading-relaxed">
            {inviteInfo?.error || strings.portal.invalidInvite}
          </p>
          <div className="pt-2">
            <Link
              href="/activities"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-6 text-sm font-medium text-primary hover:opacity-90"
            >
              <span>{strings.portal.practiceCatalog}</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const teacherDisplay = inviteInfo.teacherName || "Your teacher";
  const studentDisplay = inviteInfo.studentName || "there";

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 space-y-8">
      {/* Header with greeting */}
      <div className="space-y-3 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent-muted text-accent shadow-xs">
          <GraduationCap className="size-7" />
        </div>
        <h1 className="font-display text-3xl font-medium text-fg">
          {strings.portal.joinTitle}
        </h1>
        <p className="text-sm text-fg-secondary leading-relaxed">
          {strings.portal.joinTeacherWelcome(studentDisplay, teacherDisplay)}
        </p>
      </div>

      <div className="rounded-3xl border border-border-subtle bg-elevated p-6 sm:p-8 space-y-6 shadow-sm">
        {/* If user is already logged in, show simple connect confirmation */}
        {user ? (
          <div className="space-y-5 text-center">
            <div className="rounded-2xl bg-primary p-4 space-y-1">
              <span className="text-xs text-muted block">Signed in as</span>
              <span className="font-medium text-sm text-fg">
                {user.displayName || user.email}
              </span>
            </div>

            {formError && (
              <p className="rounded-xl bg-error/10 p-3 text-xs text-error font-medium">
                {formError}
              </p>
            )}

            <Button
              variant="primary"
              onClick={handleRedeem}
              disabled={redeeming}
              className="w-full min-h-12 text-sm font-medium"
            >
              <CheckCircle2 className="size-4 mr-2" />
              {redeeming ? strings.portal.redeeming : strings.portal.redeemButton}
            </Button>
          </div>
        ) : (
          /* User is not logged in: provide Google sign-in and email form */
          <div className="space-y-5">
            {/* Google sign-in */}
            <Button
              type="button"
              variant="secondary"
              onClick={handleGoogleSignIn}
              disabled={redeeming}
              className="w-full min-h-12 border border-border-strong font-medium text-sm"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 mr-2">
                <path
                  fill="currentColor"
                  d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3ZM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Zm-5.6-8a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9ZM12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.8A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z"
                />
              </svg>
              <span>Continue with Google</span>
            </Button>


            <div className="flex items-center gap-3 text-xs text-muted uppercase before:h-px before:flex-1 before:bg-border-subtle after:h-px after:flex-1 after:bg-border-subtle">
              or with email
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <label htmlFor="join-name" className="text-xs font-medium text-fg">
                    Your name
                  </label>
                  <input
                    id="join-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-border-strong bg-primary px-3.5 text-sm text-fg outline-none focus:border-accent"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="join-email" className="text-xs font-medium text-fg">
                  Email
                </label>
                <input
                  id="join-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-border-strong bg-primary px-3.5 text-sm text-fg outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="join-password" className="text-xs font-medium text-fg">
                  Password (min 8 characters)
                </label>
                <input
                  id="join-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-border-strong bg-primary px-3.5 text-sm text-fg outline-none focus:border-accent"
                />
              </div>

              {formError && (
                <p className="rounded-xl bg-error/10 p-3 text-xs text-error font-medium">
                  {formError}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={redeeming}
                className="w-full min-h-11 text-sm font-medium"
              >
                {redeeming
                  ? strings.portal.redeeming
                  : mode === "signup"
                    ? "Create account & join"
                    : "Sign in & join"}
              </Button>
            </form>

            {/* Switch mode */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signup" ? "login" : "signup");
                  setFormError(null);
                }}
                className="text-xs text-accent hover:underline font-medium"
              >
                {mode === "signup"
                  ? "Already have an account? Sign in instead"
                  : "Need an account? Create one"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs text-muted text-center">
        <Sparkles className="size-3.5 text-accent" />
        <span>Takes less than 1 minute to get started.</span>
      </div>
    </div>
  );
}
