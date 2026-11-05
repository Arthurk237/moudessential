// Refresh inline styles after editing the source CSS: node scripts/inline-styles.js
const fs = require('node:fs');
const path = require('node:path');
const publicDir = path.join(__dirname, '..', 'public');
for (const [page, stylesheet] of [
  ['index.html', 'moud.css'], ['waitlist.html', 'moud.css'],
  ['privacy-policy.html', 'styles.css'], ['terms-of-sale.html', 'styles.css'],
]) {
  const file = path.join(publicDir, page);
  const html = fs.readFileSync(file, 'utf8');
  const css = fs.readFileSync(path.join(publicDir, stylesheet), 'utf8');
  const existing = /<style data-source="[^"]+">[\s\S]*?<\/style>|<link rel="stylesheet" href="\/?(?:moud|styles)\.css"\s*\/?>/;
  if (!existing.test(html)) throw new Error(`Missing stylesheet in ${page}`);
  fs.writeFileSync(file, html.replace(existing, () => `<style data-source="${stylesheet}">\n${css}</style>`));
}
