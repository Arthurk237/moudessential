# Shopify integration guide

## What this does

When someone joins the waitlist, the server does two things:

1. Saves the email locally to `data/emails.json` (always happens, no setup needed).
2. Creates or updates that person as a **Shopify customer**, tags them `MOUD waitlist`,
   and sets their email marketing consent to `subscribed`.

That second part is what lets you use **Shopify Email** (Shopify's built-in email
tool) to send your launch announcement and future campaigns — Shopify Email sends
to customer segments, and this integration is what populates that segment.

There's no API for "send a Shopify Email campaign" from your own code — campaigns
are built and sent from the Shopify admin. This integration's job is just to make
sure every waitlist subscriber shows up in Shopify as a real, marketing-consented
customer so you can target them from a campaign.

## Step 1: Create a custom app in the Dev Dashboard

Shopify changed this process on January 1, 2026 — custom apps can no longer be
created from the store admin's old "Develop apps" screen. They're created in the
**Dev Dashboard** now.

1. Go to [dev.shopify.com/dashboard](https://dev.shopify.com/dashboard) and log in
   with the same account you used to create your store.
2. Click **Apps** → **Create app**.
3. Give it a name, e.g. "MOUD Waitlist Sync". You can use
   `https://shopify.dev/apps/default-app-home` as the App URL — you don't need a
   real one for this.
4. Under **Configuration** → **Admin API access scopes**, add:
   - `read_customers`
   - `write_customers`
5. Save, then go to the **Install** section and install the app on your store
   (search for your store by its `.myshopify.com` domain).

## Step 2: Get your credentials

Unlike the old flow, Shopify no longer shows you a static token to copy. Instead:

1. In the Dev Dashboard, open your app → **Settings**.
2. Copy the **Client ID** and **Client secret**.

The server code exchanges these for a real access token automatically (and
refreshes it every 24 hours — Shopify's tokens now expire daily, so nothing to
maintain manually).

## Step 3: Set your environment variables

Copy `.env.example` to `.env` in the project root:

```
SHOPIFY_SHOP=your-store
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
```

`SHOPIFY_SHOP` is just the subdomain — if your store is `moudessentials.myshopify.com`,
use `moudessentials`.

## Step 4: Test it

```
npm start
```

Submit the waitlist form locally. In the terminal you should NOT see any "Shopify
not configured" or "returned non-OK" warnings. Then check **Shopify admin →
Customers** — the email should appear there, tagged `MOUD waitlist`.

If something fails, check:
- `shop_not_permitted` error → your app and store need to be in the same Dev
  Dashboard organization. This is automatic if you created the store yourself.
- 403 on the customer endpoints → double check the `read_customers` /
  `write_customers` scopes were added and the app was reinstalled after adding them.
  In the Dev Dashboard that means releasing a new app version that includes the
  scopes, then pressing **Install** again so your store picks them up. (Apps
  installed on your own store get protected customer data access by default, so
  there's nothing separate to request for that.)

## Step 5: Send a campaign in Shopify Email

Once you have subscribers synced:

1. Shopify admin → **Marketing** → **Create campaign** → **Email**.
2. Under audience, select **Customers**, then filter by tag `MOUD waitlist`
   (or by marketing consent = subscribed, which covers the same people plus
   anyone who opted in elsewhere).
3. Build and send your launch announcement.

Shopify Email is free up to a monthly send volume, then billed per additional email —
worth checking your plan's current limits before a big launch blast.

## Notes

- Failed syncs (e.g. Shopify API hiccup) are queued in `data/failed-syncs.json`
  and retried automatically every minute, up to 6 attempts, then dropped.
- The API version is pinned in `server.js` (`SHOPIFY_API_VERSION`). Shopify ships
  a new version quarterly and supports each for ~12 months — bump this a couple
  times a year so you don't fall behind.
- Keep `.env` out of version control — it's already in `.gitignore`.
