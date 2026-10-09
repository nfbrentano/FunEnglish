const fs = require('fs');
const path = require('path');
const CONTENT_DIR = path.join(process.cwd(), "content", "activities");
const OUTPUT_DIR = path.join(process.cwd(), "public", "images", "activities");

const expected = [];
const walk = (node) => {
  if (Array.isArray(node)) node.forEach(walk);
  else if (node && typeof node === "object") {
    if (typeof node.src === "string" && node.src.startsWith("/images/activities/")) {
      const src = node.src.split('?')[0]; // Remove query params
      const relPath = src.replace('/images/activities/', '');
      expected.push({ src: relPath, prompt: node.prompt || node.alt || 'A fun educational illustration' });
    }
    Object.values(node).forEach(walk);
  }
};

const walkDir = (dir) => {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) walkDir(fullPath);
    else if (fullPath.endsWith('.json')) walk(JSON.parse(fs.readFileSync(fullPath, 'utf8')));
  });
};

walkDir(CONTENT_DIR);

const missing = expected.filter(img => {
  const p = path.join(OUTPUT_DIR, img.src);
  return !fs.existsSync(p);
});

console.log(JSON.stringify(missing, null, 2));
