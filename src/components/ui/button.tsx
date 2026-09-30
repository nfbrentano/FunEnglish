import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-primary hover:opacity-90",
  secondary: "border border-border-strong text-fg hover:border-accent hover:text-accent",
  ghost: "text-fg-secondary hover:bg-elevated hover:text-fg",
};

export function buttonClasses(variant: ButtonVariant = "primary", className = ""): string {
  return [
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium",
    "transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    className,
  ].join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export function Button({ variant, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant };

export function ButtonLink({ variant, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}
