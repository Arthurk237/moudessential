// Update metadata: node scripts/sync-seo.js
// Verify generated metadata: node scripts/sync-seo.js --check
const fs = require('node:fs');
const path = require('node:path');

const origin = 'https://moudessentials.com';
const brand = 'Moudessentials';
const image = `${origin}/images/og-la-muse.png`;
const imageAlt = 'La Muse leather vanity bag by Moudessentials (MOUD)';
const pages = [
  {
    file: 'index.html', route: '/',
    title: 'Moudessentials | Luxury Leather Bags & Accessories',
    description: 'Discover Moudessentials (MOUD), a luxury bags and accessories brand. Meet La Muse, our leather vanity bag designed in Toronto, and join the early-access waitlist.',
  },
  {
    file: 'waitlist.html', route: '/waitlist.html', label: 'La Muse Waitlist',
    title: 'La Muse Waitlist & Early Access | Moudessentials',
    description: 'Join the Moudessentials (MOUD) waitlist for early access to La Muse, our leather vanity bag designed in Toronto, plus launch updates and exclusive previews.',
  },
  {
    file: 'privacy-policy.html', route: '/privacy-policy', label: 'Privacy Policy',
    title: 'Privacy Policy | Moudessentials',
    description: 'Read the Moudessentials (MOUD) privacy policy to learn how we collect, use, and protect your personal information and how to contact us about your data.',
  },
  {
    file: 'terms-of-sale.html', route: '/terms-of-sale', label: 'Terms of Sale',
    title: 'Terms of Sale | Moudessentials',
    description: 'Read the Moudessentials (MOUD) terms of sale for information about orders, payments, shipping, returns, refunds, and customer support.',
  },
];
const escapeHtml = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const meta = (attribute, key, value) => `  <meta ${attribute}="${key}" content="${escapeHtml(value)}">`;

function metadata(page) {
  const url = origin + page.route;
  const graph = [];
  if (page.route === '/') {
    graph.push({
      '@type': 'Organization', '@id': `${origin}/#organization`,
      name: brand, alternateName: 'MOUD', url: origin + '/',
      description: 'Moudessentials (MOUD) is a luxury bags and accessories brand. La Muse is a leather vanity bag designed in Toronto.',
      logo: { '@type': 'ImageObject', url: `${origin}/images/moud-logo.png`, width: 469, height: 128 },
      email: 'hello@moudessentials.com',
      sameAs: ['https://www.instagram.com/moudessentials/', 'https://www.tiktok.com/@moudessentials'],
    }, {
      '@type': 'WebSite', '@id': `${origin}/#website`,
      url: origin + '/', name: brand, alternateName: 'MOUD', inLanguage: 'en',
      publisher: { '@id': `${origin}/#organization` },
    });
  }
  const webpage = {
    '@type': 'WebPage', '@id': `${url}#webpage`, url,
    name: page.title, description: page.description, inLanguage: 'en',
    isPartOf: { '@id': `${origin}/#website` },
    about: { '@id': `${origin}/#organization` },
    primaryImageOfPage: { '@type': 'ImageObject', url: image, width: 1200, height: 630, caption: imageAlt },
  };
  if (page.label) webpage.breadcrumb = { '@id': `${url}#breadcrumb` };
  graph.push(webpage);
  if (page.label) {
    graph.push({
      '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: brand, item: origin + '/' },
        { '@type': 'ListItem', position: 2, name: page.label, item: url },
      ],
    });
  }
  const schema = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2).replace(/</g, '\\u003c');
  return [
    '  <!-- SEO:START -->',
    `  <title>${escapeHtml(page.title)}</title>`,
    meta('name', 'description', page.description),
    meta('name', 'robots', 'index,follow,max-image-preview:large'),
    `  <link rel="canonical" href="${url}">`,
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', brand),
    meta('property', 'og:locale', 'en_CA'),
    meta('property', 'og:title', page.title),
    meta('property', 'og:description', page.description),
    meta('property', 'og:url', url),
    meta('property', 'og:image', image),
    meta('property', 'og:image:type', 'image/png'),
    meta('property', 'og:image:width', '1200'),
    meta('property', 'og:image:height', '630'),
    meta('property', 'og:image:alt', imageAlt),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', page.title),
    meta('name', 'twitter:description', page.description),
    meta('name', 'twitter:image', image),
    meta('name', 'twitter:image:alt', imageAlt),
    `  <script type="application/ld+json">\n${schema}\n  </script>`,
    '  <!-- SEO:END -->',
  ].join('\n');
}

for (const page of pages) {
  const file = path.join(__dirname, '..', 'public', page.file);
  const html = fs.readFileSync(file, 'utf8');
  const block = /  <!-- SEO:START -->[\s\S]*?  <!-- SEO:END -->/;
  if (!block.test(html)) throw new Error(`Missing SEO markers in ${page.file}`);
  const updated = html.replace(block, () => metadata(page));
  if (process.argv.includes('--check')) {
    if (updated !== html) throw new Error(`Run node scripts/sync-seo.js to refresh ${page.file}`);
  } else if (updated !== html) {
    fs.writeFileSync(file, updated);
  }
}
