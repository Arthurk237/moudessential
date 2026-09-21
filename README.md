# Moudessentials — Coming Soon / Waitlist

A minimal, luxury "coming soon" landing page with an email waitlist, plus Privacy Policy and Terms of Sale pages.

## Run it

```bash
npm install
npm start
```

Then open http://localhost:3000

(On Replit: just click Run — it reads `package.json`'s `start` script automatically.)

## Add your logo

Drop your logo file in `public/logo.png` (exactly that filename/path — it's already wired up in `public/index.html` at 140px wide). Nothing else needs to change.

## Where emails go

Every signup is appended to `data/emails.json`:

```json
[
  { "email": "someone@example.com", "subscribedAt": "2026-07-10T18:22:00.000Z" }
]
```

No third-party email service is wired up yet — this is just a flat-file store you can export from later.

## Switching to Shopify later

When your store is live, search for `SHOPIFY_STORE_URL` — there's a commented placeholder in both `server.js` and `public/script.js`. Set the value and (optionally) redirect after a successful subscribe in `script.js`.

## Project structure

```
moudessentials/
├── server.js              Express server: serves the site + /api/subscribe
├── package.json
├── data/
│   └── emails.json        Waitlist storage (auto-created)
└── public/
    ├── index.html          Landing page
    ├── privacy-policy.html
    ├── terms-of-sale.html
    ├── styles.css          Shared design tokens (black/cream/gold, Cormorant Garamond + Jost)
    ├── script.js           Signup form handling
    └── logo.png            ← add your logo here
```

## Design tokens

- Background `#0B0B0B`, text `#F5F3EE`, gold accent `#C9A44C`
- Display: Cormorant Garamond (serif) · Body: Jost (sans-serif)
- Staggered fade/slide-up entrance on load, no countdown timer
