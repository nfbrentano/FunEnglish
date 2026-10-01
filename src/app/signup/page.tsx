import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Sign up", robots: { index: false } };

export default function SignupPage() {
  return <SignupForm />;
}
