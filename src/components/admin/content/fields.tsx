"use client";

import { useId } from "react";
import { pathKey, useFieldError, type Path } from "./form-context";

export const inputClasses = (error?: string) =>
  `min-h-11 w-full rounded-xl border bg-primary px-4 text-fg ${
    error ? "border-error" : "border-border-strong focus:border-accent"
  }`;

type FieldProps = {
  label: string;
  path: Path;
  hint?: string;
  /** Visually hidden label (e.g. the text of a quiz option, labelled by its row). */
  hideLabel?: boolean;
  children: (props: {
    id: string;
    "data-path": string;
    "aria-invalid"?: true;
    "aria-describedby"?: string;
    className: string;
  }) => React.ReactNode;
};

/** Label + control + its schema error (spec: gestão completa, RF06, RNF04). */
export function Field({ label, path, hint, hideLabel, children }: FieldProps) {
  const id = useId();
  const error = useFieldError(path);
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-medium"}>
        {label}
      </label>
      {children({
        id,
        "data-path": pathKey(path),
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
        className: inputClasses(error),
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

export function TextField({
  value,
  onChange,
  multiline,
  placeholder,
  ...field
}: Omit<FieldProps, "children"> & {
  value: string | undefined;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <Field {...field}>
      {(props) =>
        multiline ? (
          <textarea
            {...props}
            rows={2}
            value={value ?? ""}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={`${props.className} py-2.5`}
          />
        ) : (
          <input
            {...props}
            value={value ?? ""}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      }
    </Field>
  );
}

/** Comma-separated list (tags, vocabulary, distractors). */
export function ListField({
  value,
  onChange,
  ...field
}: Omit<FieldProps, "children"> & {
  value: string[] | undefined;
  onChange: (v: string[]) => void;
}) {
  return (
    <Field {...field}>
      {(props) => (
        <input
          {...props}
          defaultValue={(value ?? []).join(", ")}
          key={(value ?? []).join("\u0000")}
          onBlur={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean),
            )
          }
        />
      )}
    </Field>
  );
}

/** Error of a list itself ("Add at least 2"), focusable from the error summary. */
export function ListError({ path }: { path: Path }) {
  const error = useFieldError(path);
  return (
    <p tabIndex={-1} data-path={pathKey(path)} className={error ? "text-sm text-error" : "sr-only"}>
      {error ?? ""}
    </p>
  );
}

export const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
export const asText = (value: unknown) => (typeof value === "string" ? value : "");
export type Json = Record<string, unknown>;
export const asObject = (value: unknown): Json =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};

/** Sets an optional text field, dropping it when blank (the schema rejects empty strings). */
export function withOptional(object: Json, key: string, value: string | undefined): Json {
  const { [key]: _old, ...rest } = object;
  void _old;
  return value && value.trim() !== "" ? { ...rest, [key]: value } : rest;
}
