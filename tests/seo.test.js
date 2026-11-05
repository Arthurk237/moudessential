const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');

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
      if (route === '/') {
        const schema = JSON.parse(html.match(/application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
        assert.equal(schema['@graph'][0]['@type'], 'Organization');
        assert.match(html, /loading="eager" fetchpriority="high"/);
        assert.match(html, /href="\/waitlist.html"/);
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
