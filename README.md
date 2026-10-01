# Moudessentials — La Muse pre-launch site

The MOUD "La Muse" landing page with an email waitlist that syncs to Shopify, plus a
standalone waitlist page and the Privacy Policy / Terms of Sale pages.

## Run it

```bash
npm install
npm start
```

Then open http://localhost:3000

Signups only work through this server — it's what saves each email and sends it to
Shopify. Opening `public/index.html` directly (or with VS Code's Live Server) shows the
design, but the forms will say signups aren't available.

(On Replit: just click Run — it reads `package.json`'s `start` script automatically.)

## Where signups go

Every waitlist form on the site (`<form data-waitlist-form>`) is handled by
`public/script.js`, which posts to `/api/subscribe`. The server then:

1. Appends the signup to `data/emails.json`:

   ```json
   [
     { "firstName": "", "email": "someone@example.com", "country": "", "subscribedAt": "2026-07-10T18:22:00.000Z" }
   ]
   ```

2. Creates or updates that person as a **Shopify customer**, tagged `MOUD waitlist`,
   with email marketing consent set to `subscribed`.

Failed Shopify syncs are queued in `data/failed-syncs.json` and retried every minute.
Setup and troubleshooting for the Shopify side is in [INTEGRATION.md](INTEGRATION.md).

## Pages

| URL | File | Notes |
| --- | --- | --- |
| `/` | `public/index.html` | La Muse landing page — two signup forms (hero + early access) |
| `/waitlist.html` | `public/waitlist.html` | Full signup form (first name, email, country) |
| `/privacy-policy` | `public/privacy-policy.html` | |
| `/terms-of-sale` | `public/terms-of-sale.html` | |

## Project structure

```
moudessentials-waitlist/
├── server.js                 Express server: serves the site + /api/subscribe (+ Shopify sync)
├── package.json
├── .env                      Shopify credentials (not committed — see INTEGRATION.md)
├── data/
│   ├── emails.json           Waitlist storage (auto-created)
│   └── failed-syncs.json     Shopify syncs waiting to be retried
└── public/
    ├── index.html            La Muse landing page
    ├── waitlist.html         Standalone waitlist page
    ├── moud.css              Styles for index.html + waitlist.html
    ├── script.js             Signup handling for every waitlist form
    ├── images/               MOUD logo, La Muse photos (full size + 900px versions), link-preview image
    ├── favicon.png           Browser tab icon (made from logo.png)
    ├── apple-touch-icon.png  Home-screen icon (made from logo.png)
    ├── privacy-policy.html
    ├── terms-of-sale.html
    └── styles.css            Styles for the privacy + terms pages
```

## Changing the photos

The two product panels on the homepage use `public/images/la-muse-exterior.jpg` and
`public/images/la-muse-interior.jpg` (each also has a smaller `-900.jpg` version that
phones load). Replace the files with the same names, or update the `src`/`srcset` in
`index.html`. The link-preview image shared on social apps is `images/og-la-muse.jpg`
(1200 × 630).

## Design tokens

Defined at the top of `public/moud.css`:

- Ivory `#FDFAF4` (background), MOUD Signature Beige `#FFD999` (accent),
  Charcoal `#2E2E2E` (text), deep gold `#A8822A` (italic accents)
- Supporting: Soft Sand `#C8B89A`, Light Taupe `#B0A090`, Grey `#7A7268`
- Display: Cormorant Garamond · Body: Inter
