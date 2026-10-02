// Writes public/og-default.png, the site's social card (1200×630) for pages without an image of
// their own (spec: SEO e metadados, RF02). Run with `npx tsx scripts/og-default.ts`.
import sharp from "sharp";

const COLORS = [
  "#c9836b",
  "#8a9bbd",
  "#a98bb3",
  "#7fa895",
  "#b8995e",
  "#c99466",
  "#b36f6f",
  "#8ea878",
  "#968cbc",
];
const dots = COLORS.map(
  (color, i) => `<circle cx="${600 - 4 * 44 + i * 44}" cy="470" r="12" fill="${color}"/>`,
).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#121212"/>
  <text x="600" y="290" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
    font-size="128" fill="#c5a880">Fun English</text>
  <text x="600" y="380" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
    font-size="40" fill="#e8e8e8">Interactive ESL activities, games and quizzes</text>
  ${dots}
</svg>`;

sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile("public/og-default.png")
  .then(() => console.log("Wrote public/og-default.png"));
