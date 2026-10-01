import { expect, test, type Page } from "@playwright/test";
import { getAdminDb } from "../src/lib/firebase-admin/core";
import { E2E_ENV } from "./global-setup";

// Accounts live in the Auth emulator; every test uses a fresh email.
test.skip(({ isMobile }) => isMobile, "account flows are the same on phones; the header differs");

const password = "correct-horse-1";
let counter = 0;
const newEmail = () => `teacher-${Date.now()}-${counter++}@example.com`;

async function signUp(page: Page, email: string, name = "Ana Silva") {
  await page.goto("/signup");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
}

async function logOut(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Log in", exact: true })).toBeVisible();
}

test("sign up creates the account and the teacher profile", async ({ page }) => {
  const email = newEmail();
  await signUp(page, email);
  await expect(page).toHaveURL(/\/activities$/);
  await expect(page.getByRole("button", { name: "Account menu" })).toHaveText("AS");

  Object.assign(process.env, {
    FIRESTORE_EMULATOR_HOST: E2E_ENV.FIRESTORE_EMULATOR_HOST,
    FIREBASE_PROJECT_ID: E2E_ENV.FIREBASE_PROJECT_ID,
  });
  const profiles = await getAdminDb().collection("users").where("email", "==", email).get();
  expect(profiles.docs.map((d) => d.get("role"))).toEqual(["teacher"]);
  expect(profiles.docs[0].get("displayName")).toBe("Ana Silva");
});

test("the session survives a reload, and Log out ends it", async ({ page }) => {
  await signUp(page, newEmail());
  await page.reload();
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();

  await logOut(page);
  await expect(page).toHaveURL(/\/activities$/);
});

test("friendly errors: taken email, short password, wrong password", async ({ page }) => {
  const email = newEmail();
  await signUp(page, email);
  await logOut(page);

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Ana");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();

  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "This email is already registered. Log in instead?" }),
  ).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).last().click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Wrong email or password." }),
  ).toBeVisible();
});

test("protected pages send visitors to log in and back", async ({ page }) => {
  const email = newEmail();
  await signUp(page, email);
  await logOut(page);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).last().click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Your dashboard" })).toBeVisible();
});

test("never redirects to another site after logging in", async ({ page }) => {
  const email = newEmail();
  await signUp(page, email);
  await logOut(page);

  await page.goto("/login?next=https://evil.com");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).last().click();
  await expect(page).toHaveURL(/fun-english|localhost:5002\/activities$/);
  expect(new URL(page.url()).host).toBe("localhost:5002");
});

test("password reset shows the same message for any email", async ({ page }) => {
  for (const email of [newEmail(), "nobody@example.com"]) {
    await page.goto("/reset-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "If an account exists for that email, we sent you a reset link.",
    );
  }
});
