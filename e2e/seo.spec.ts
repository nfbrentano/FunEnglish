import { expect, test } from "@playwright/test";
import { CATEGORIES } from "../src/lib/activities/categories";
import { PUBLISHED, seeded } from "./seed-data";

// Head, robots.txt and sitemap.xml of the static build (spec: SEO e metadados).
const SITE = "http://localhost:5002";

test("an activity page has its title, description, social card and canonical (CT01, CA01, CA02)", async ({
  page,
}) => {
  await page.goto("/play/some-or-any?mode=student");
  await expect(page).toHaveTitle("Some or Any – Grammar ESL Activity | Fun English");
  const meta = (selector: string) => page.locator(selector).first();
  await expect(meta('meta[name="description"]')).toHaveAttribute("content", /\S/);
  await expect(meta('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Some or Any – Grammar ESL Activity | Fun English",
  );
  await expect(meta('meta[property="og:image"]')).toHaveAttribute(
    "content",
    `${SITE}/images/activities/some-or-any/thumb.webp`,
  );
  await expect(meta('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  // Student mode points to the activity page (RF08).
  await expect(meta('link[rel="canonical"]')).toHaveAttribute("href", `${SITE}/play/some-or-any`);
});

test("the activity page has LearningResource and BreadcrumbList JSON-LD (CA06)", async ({
  page,
}) => {
  await page.goto("/play/some-or-any");
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = blocks.flatMap((b) =>
    (JSON.parse(b) as { "@type": string }[]).map((d) => d["@type"]),
  );
  expect(types).toEqual(expect.arrayContaining(["LearningResource", "BreadcrumbList"]));
});

test("the catalog's canonical drops the filters (CT05, CA05)", async ({ page }) => {
  await page.goto("/activities?level=advanced");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE}/activities`);
  await page.goto("/activities/grammar?q=past");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${SITE}/activities/grammar`,
  );
});

test("the activity page text is in the HTML without JavaScript (CT07, CA07)", async ({
  request,
}) => {
  const html = await (await request.get("/play/some-or-any")).text();
  expect(html).toContain("Some or Any");
  expect(html).toContain("Grammar");
  expect(html).toContain("Beg–Inter");
  expect(html).toContain("Choose some or any");
});

test("dashboard and admin aren't indexed (CT08, CA08)", async ({ page }) => {
  for (const path of ["/dashboard", "/admin"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});

test("robots.txt blocks private pages and student mode and points to the sitemap (CT04, CA04)", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  for (const path of ["/admin", "/dashboard", "/login", "/signup", "/*?mode=student"]) {
    expect(robots).toContain(`Disallow: ${path}\n`);
  }
  expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
});

test("the sitemap lists every published activity, no draft, the categories and the catalog (CT03, CA03)", async ({
  request,
}) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const activities = urls.filter((u) => u.includes("/play/"));

  expect(activities).toHaveLength(PUBLISHED);
  for (const a of seeded) {
    expect(activities.includes(`${SITE}/play/${a.slug}`)).toBe(a.status === "published");
  }
  for (const { id } of CATEGORIES) expect(urls).toContain(`${SITE}/activities/${id}`);
  expect(urls).toContain(`${SITE}/activities`);
  expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T/);
});
