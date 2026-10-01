import { expect, test } from "@playwright/test";
import { adminDb } from "./admin";

test("the home page shows the value proposition and 6 highlights (CA01)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "English activities your class will actually enjoy",
  );
  const featured = page.getByRole("region", { name: "Featured activities" });
  await expect(featured.getByRole("article")).toHaveCount(6);
  await expect(page.getByRole("link", { name: "Sign up free" }).first()).toBeVisible();

  await page.getByRole("link", { name: "Browse activities" }).first().click();
  await expect(page).toHaveURL(/\/activities$/);
});

test("FAQ answers expand and collapse (CA02)", async ({ page }) => {
  await page.goto("/faq");
  const question = page.getByRole("button", { name: "Do I need an account?" });
  await expect(question).toHaveAttribute("aria-expanded", "false");
  await question.click();
  await expect(question).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "Do I need an account?" })).toContainText(
    "class lists",
  );
  await question.click();
  await expect(page.getByRole("region", { name: "Do I need an account?" })).toBeHidden();
});

test("Privacy and Terms show their content and Last updated date (CA04)", async ({ page }) => {
  for (const [path, title] of [
    ["/privacy", "Privacy Policy"],
    ["/terms", "Terms of Use"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText(/^Last updated [A-Z][a-z]+ \d{1,2}, \d{4}$/)).toBeVisible();
  }
  await page.goto("/privacy");
  await expect(page.getByRole("link", { name: "nfgbrentano@gmail.com" }).first()).toHaveAttribute(
    "href",
    "mailto:nfgbrentano@gmail.com",
  );
});

test("the contact form validates and saves a message (CA03, CA07)", async ({ page }) => {
  const subject = `E2E ${crypto.randomUUID()}`;
  await page.goto("/contact");
  await page.getByLabel("Name").fill("Ana Silva");
  await page.getByLabel("Email").fill("abc");
  await page.getByLabel("Subject").fill(subject);
  await page.getByLabel("Message").fill("Could you add more listening activities?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Please enter a valid email")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeFocused();

  await page.getByLabel("Email").fill("ana@example.com");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Thanks! We'll get back to you soon.")).toBeVisible();

  const saved = await adminDb().collection("contactMessages").where("subject", "==", subject).get();
  expect(saved.docs.map((d) => d.get("email"))).toEqual(["ana@example.com"]);
});
