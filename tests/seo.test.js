const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');
const fs = require('node:fs');

test('Generated SEO metadata is current', () => {
  execFileSync(process.execPath, ['scripts/sync-seo.js', '--check'], {
    cwd: path.join(__dirname, '..'),
  });
});

test('SEO pages, canonical redirects, and crawler responses', async () => {
  const port = 3317;
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 10000);
      server.stdout.on('data', chunk => {
        if (chunk.toString().includes('MOUD waitlist running')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      server.once('error', err => { clearTimeout(timeout); reject(err); });
      server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited: ${code}`)); });
    });
    const base = `http://127.0.0.1:${port}`;
    const titles = new Set();
    const descriptions = new Set();
    const decodeHtml = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    for (const route of ['/', '/waitlist.html', '/privacy-policy', '/terms-of-sale']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
      assert.equal((html.match(/<title>/g) || []).length, 1);
      assert.ok(html.indexOf('<meta charset="UTF-8">') < 1024);
      assert.ok(html.includes(`rel="canonical" href="https://moudessentials.com${route}"`));
      assert.match(html, /name="description" content="[^"]+"/);
      assert.match(html, /property="og:url"/);
      const readMeta = key => {
        const matches = [...html.matchAll(new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)">`, 'g'))];
        assert.equal(matches.length, 1, `Expected one ${key} tag on ${route}`);
        return decodeHtml(matches[0][1]);
      };
      const title = decodeHtml(html.match(/<title>([^<]+)<\/title>/)[1]);
      const description = readMeta('description');
      assert.match(title, /Moudessentials/);
      assert.match(description, /Moudessentials/);
      assert.ok(!titles.has(title), 'Each page needs a distinct title');
      assert.ok(!descriptions.has(description), 'Each page needs a distinct description');
      titles.add(title);
      descriptions.add(description);
      assert.equal(readMeta('og:site_name'), 'Moudessentials');
      assert.equal(readMeta('og:title'), title);
      assert.equal(readMeta('twitter:title'), title);
      assert.equal(readMeta('og:description'), description);
      assert.equal(readMeta('twitter:description'), description);
      assert.equal(readMeta('og:url'), `https://moudessentials.com${route}`);
      assert.equal(readMeta('og:image:type'), 'image/png');
      assert.equal(readMeta('og:image'), readMeta('twitter:image'));
      assert.match(readMeta('og:image'), /\/images\/og-la-muse\.png$/);
      assert.equal(readMeta('robots'), 'index,follow,max-image-preview:large');
      assert.doesNotMatch(response.headers.get('x-robots-tag') || '', /noindex/);
      assert.doesNotMatch(html, /name="keywords"|insert final domain|moudessentials\.ca/);
      const structuredData = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      assert.equal(structuredData.length, 1);
      const schema = JSON.parse(structuredData[0][1]);
      assert.equal(schema['@context'], 'https://schema.org');
      const webpage = schema['@graph'].find(node => node['@type'] === 'WebPage');
      assert.equal(webpage.url, `https://moudessentials.com${route}`);
      assert.equal(webpage.name, title);
      assert.equal(webpage.description, description);
      assert.equal(webpage.isPartOf['@id'], 'https://moudessentials.com/#website');
      assert.equal(webpage.about['@id'], 'https://moudessentials.com/#organization');
      const cssName = route === '/' || route === '/waitlist.html' ? 'moud.css' : 'styles.css';
      assert.ok(html.includes(`<style data-source="${cssName}">\n${fs.readFileSync(path.join(__dirname, '..', 'public', cssName), 'utf8')}</style>`));
      assert.match(html, /media="print" onload="this.media='all'"/);
      assert.match(html, /<noscript><link href="https:\/\/fonts.googleapis.com/);
      if (route === '/') {
        assert.match(title, /^Moudessentials \| Luxury Leather Bags & Accessories$/);
        for (const type of ['Organization', 'WebSite']) {
          const entity = schema['@graph'].find(node => node['@type'] === type);
          assert.equal(entity.name, 'Moudessentials');
          assert.equal(entity.alternateName, 'MOUD');
          assert.equal(entity.url, 'https://moudessentials.com/');
        }
        assert.match(html.split('<body>')[1], /Moudessentials \(MOUD\)/);
        assert.match(html, /La Muse <span class="product-panel-subtitle">leather vanity bag<\/span>/);
        assert.doesNotMatch(html, /class="product-story"/);
        assert.match(html, /href="\/waitlist.html"/);
        assert.match(html, /loading="eager" fetchpriority="high"/);
        assert.equal((html.match(/<source type="image\/webp"/g) || []).length, 2);
      } else {
        const breadcrumbs = schema['@graph'].find(node => node['@type'] === 'BreadcrumbList');
        assert.equal(webpage.breadcrumb['@id'], breadcrumbs['@id']);
        assert.deepEqual(breadcrumbs.itemListElement.map(item => item.position), [1, 2]);
        assert.equal(breadcrumbs.itemListElement[0].item, 'https://moudessentials.com/');
        assert.equal(breadcrumbs.itemListElement[1].item, webpage.url);
      }
    }
    for (const [source, target] of [
      ['/index.html', '/'], ['/privacy-policy.html', '/privacy-policy'],
      ['/terms-of-sale.html', '/terms-of-sale'], ['/privacy-policy/', '/privacy-policy'],
      ['/terms-of-sale/', '/terms-of-sale'],
    ]) {
      for (const method of ['GET', 'HEAD']) {
        const response = await fetch(base + source + '?ref=seo', { method, redirect: 'manual' });
        assert.equal(response.status, 301);
        assert.equal(response.headers.get('location'), target + '?ref=seo');
      }
    }
    const invalid = await fetch(base + '/api/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"email":"invalid"}',
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.headers.get('x-robots-tag'), 'noindex');
    assert.equal(invalid.headers.get('cache-control'), 'no-store');
    assert.equal((await invalid.json()).error, 'Please enter a valid email address.');
    const asset = await fetch(base + '/moud.css');
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get('cache-control'), 'public, max-age=86400');
    for (const image of ['la-muse-exterior', 'la-muse-exterior-900', 'la-muse-interior', 'la-muse-interior-900', 'moud-logo']) {
      const response = await fetch(`${base}/images/${image}.webp`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /image\/webp/);
      const body = Buffer.from(await response.arrayBuffer());
      assert.equal(body.toString('ascii', 8, 12), 'WEBP');
    }
    for (const image of ['la-muse-exterior', 'la-muse-exterior-900', 'la-muse-interior', 'la-muse-interior-900', 'og-la-muse']) {
      const response = await fetch(`${base}/images/${image}.png`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /image\/png/);
      const body = Buffer.from(await response.arrayBuffer());
      assert.equal(body.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    }
    const robots = await fetch(base + '/robots.txt');
    assert.equal(robots.status, 200);
    assert.match(await robots.text(), /Disallow: \/api\//);
    assert.equal((await fetch(base + '/sitemap.xml')).status, 404);
    assert.equal((await fetch(base + '/missing-page')).status, 404);
  } finally {
    const exited = once(server, 'exit');
    server.kill();
    await exited;
  }
});
