/**
 * Grants (or removes) the admin role used by the content panel (/admin).
 *
 *   npm run set-admin -- teacher@example.com            grant
 *   npm run set-admin -- teacher@example.com --remove   remove
 *
 * Production needs GOOGLE_APPLICATION_CREDENTIALS (Admin SDK key). With FIREBASE_AUTH_EMULATOR_HOST
 * set, it changes the local Auth emulator instead.
 */
import { loadEnvConfig } from "@next/env";
import { getAdminAuth } from "../src/lib/firebase-admin/core";

async function main() {
  loadEnvConfig(process.cwd());
  const [email, flag] = process.argv.slice(2);
  if (!email || !email.includes("@"))
    throw new Error("Usage: npm run set-admin -- <email> [--remove]");

  const auth = getAdminAuth();
  const user = await auth.getUserByEmail(email);
  const admin = flag !== "--remove";
  await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin });
  console.log(
    `${email} is ${admin ? "now an admin" : "no longer an admin"}. The panel picks it up on its next load.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
