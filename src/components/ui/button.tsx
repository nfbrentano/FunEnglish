import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "default" | "sm" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-primary hover:opacity-90",
  secondary: "border border-border-strong text-fg hover:border-accent hover:text-accent",
  ghost: "text-fg-secondary hover:bg-elevated hover:text-fg",
};

const SIZES: Record<ButtonSize, string> = {
  default: "min-h-11 px-5 text-sm",
  sm: "min-h-8 px-3 text-xs",
  lg: "min-h-12 px-6 text-base",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  className = "",
  size: ButtonSize = "default",
): string {
  return [
    "inline-flex items-center justify-center gap-2 rounded-full font-medium",
    "transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50",
    SIZES[size],
    VARIANTS[variant],
    className,
  ].join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className, size)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, className, size)} {...props} />;
}
