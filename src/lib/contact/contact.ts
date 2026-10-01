import { addDoc, collection, serverTimestamp } from "firebase/firestore/lite";
import { z } from "zod";
import { getLiteDb } from "../firebase";

export const CONTACT_COLLECTION = "contactMessages";
export const MAX_MESSAGE = 2000;

/** Same limits as firestore.rules (contactMessages). */
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100, "That name is too long"),
  email: z
    .string()
    .trim()
    .max(254, "Please enter a valid email")
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Please enter a valid email"),
  subject: z.string().trim().min(1, "Please enter a subject").max(150, "That subject is too long"),
  message: z
    .string()
    .trim()
    .min(1, "Please write a message")
    .max(MAX_MESSAGE, `Please keep it under ${MAX_MESSAGE.toLocaleString("en-US")} characters`),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactErrors = Partial<Record<keyof ContactInput, string>>;

export function validateContact(
  raw: Record<keyof ContactInput, string>,
): { ok: true; data: ContactInput } | { ok: false; errors: ContactErrors } {
  const parsed = contactSchema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  const errors: ContactErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof ContactInput;
    errors[field] ??= issue.message;
  }
  return { ok: false, errors };
}

export type ContactSender = (message: ContactInput) => Promise<void>;

export const firestoreContact: ContactSender = async (message) => {
  await addDoc(collection(getLiteDb(), CONTACT_COLLECTION), {
    ...message,
    createdAt: serverTimestamp(),
  });
};
