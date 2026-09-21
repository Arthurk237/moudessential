require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "emails.json");
const FAILED_SYNC_FILE = path.join(__dirname, "data", "failed-syncs.json");

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]", "utf8");
}
if (!fs.existsSync(FAILED_SYNC_FILE)) {
  fs.writeFileSync(FAILED_SYNC_FILE, "[]", "utf8");
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/waitlist.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "waitlist.html"));
});

function readEmails() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeEmails(emails) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(emails, null, 2), "utf8");
}

function readFailedSyncs() {
  try {
    return JSON.parse(fs.readFileSync(FAILED_SYNC_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeFailedSyncs(items) {
  fs.writeFileSync(FAILED_SYNC_FILE, JSON.stringify(items, null, 2), "utf8");
}

function pushFailedSync(subscriber, reason) {
  const items = readFailedSyncs();
  items.push({ subscriber, reason, attemptCount: 0, lastAttempt: null, createdAt: new Date().toISOString() });
  writeFailedSyncs(items);
}

async function retryFailedSyncs() {
  const items = readFailedSyncs();
  if (!items.length) return;
  console.log(`Retrying ${items.length} failed sync(s)...`);
  const remaining = [];
  for (const item of items) {
    const { subscriber, attemptCount } = item;
    try {
      const result = await syncToExternalServices(subscriber);
      const failedServices = Object.keys(result).filter(k => result[k] === false);
      if (failedServices.length === 0) {
        // success — skip
        continue;
      }
      // failed — increment attempt
      item.attemptCount = (attemptCount || 0) + 1;
      item.lastAttempt = new Date().toISOString();
      if (item.attemptCount < 6) {
        remaining.push(item);
      } else {
        console.warn('Dropping failed sync after max attempts for', subscriber.email);
      }
    } catch (err) {
      item.attemptCount = (attemptCount || 0) + 1;
      item.lastAttempt = new Date().toISOString();
      if (item.attemptCount < 6) remaining.push(item);
      else console.warn('Dropping failed sync after max attempts for', subscriber.email, err);
    }
  }
  writeFailedSyncs(remaining);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SHOPIFY_API_VERSION = "2026-07"; // bump this quarterly — see https://shopify.dev/docs/api/usage/versioning

// Shopify retired static shpat_ tokens for apps created after Jan 1, 2026.
// Dev Dashboard apps get a Client ID + Client Secret instead, and you exchange
// those for a short-lived (24h) access token whenever you need one.
let shopifyToken = null;
let shopifyTokenExpiresAt = 0;

async function getShopifyAccessToken() {
  const shop = process.env.SHOPIFY_SHOP;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!shop || !clientId || !clientSecret) return null;

  // Reuse the cached token until it's about to expire
  if (shopifyToken && Date.now() < shopifyTokenExpiresAt - 60_000) {
    return shopifyToken;
  }

  const resp = await fetch(`https://${shop}.myshopify.com/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!resp.ok) {
    console.error("Shopify token exchange failed", resp.status, await resp.text().catch(() => ""));
    return null;
  }

  const { access_token, expires_in } = await resp.json();
  shopifyToken = access_token;
  shopifyTokenExpiresAt = Date.now() + expires_in * 1000;
  return shopifyToken;
}

async function syncToExternalServices(subscriber) {
  const result = { shopify: null };

  const shopifyStoreDomain = process.env.SHOPIFY_SHOP ? `${process.env.SHOPIFY_SHOP}.myshopify.com` : null;
  const shopifyAccessToken = await getShopifyAccessToken();

  // Shopify: create or update customer (optional)
  if (shopifyStoreDomain && shopifyAccessToken) {
    try {
      // Try to find existing customer by email
      const searchUrl = `https://${shopifyStoreDomain}/admin/api/${SHOPIFY_API_VERSION}/customers/search.json?query=email:${encodeURIComponent(subscriber.email)}`;
      const searchResp = await fetch(searchUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": shopifyAccessToken },
      });

      if (searchResp.ok) {
        const searchData = await searchResp.json().catch(() => ({}));
        const existing = (searchData && searchData.customers && searchData.customers[0]) || null;

        if (existing && existing.id) {
          // Update customer to accept marketing and add tag
          const tags = (existing.tags || "").split(",").map(t => t.trim()).filter(Boolean);
          if (!tags.includes("MOUD waitlist")) tags.push("MOUD waitlist");

          const updateBody = {
            customer: {
              id: existing.id,
              tags: tags.join(", "),
              email_marketing_consent: { state: "subscribed", opt_in_level: "single_opt_in" },
            },
          };
          const updateResp = await fetch(`https://${shopifyStoreDomain}/admin/api/${SHOPIFY_API_VERSION}/customers/${existing.id}.json`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": shopifyAccessToken },
            body: JSON.stringify(updateBody),
          });
          if (!updateResp.ok) {
            console.warn("Shopify customer update returned non-OK", updateResp.status, await updateResp.text().catch(() => ""));
            result.shopify = false;
          } else {
            result.shopify = true;
          }
        } else {
          // Create new customer and opt them in to marketing
          const createBody = {
            customer: {
              email: subscriber.email,
              first_name: subscriber.firstName,
              tags: "MOUD waitlist",
              email_marketing_consent: { state: "subscribed", opt_in_level: "single_opt_in" },
            },
          };
          const createResp = await fetch(`https://${shopifyStoreDomain}/admin/api/${SHOPIFY_API_VERSION}/customers.json`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": shopifyAccessToken },
            body: JSON.stringify(createBody),
          });
          if (!createResp.ok) {
            console.warn("Shopify customer create returned non-OK", createResp.status, await createResp.text().catch(() => ""));
            result.shopify = false;
          } else {
            result.shopify = true;
          }
        }
      } else {
        console.warn("Shopify customer search returned non-OK", searchResp.status, await searchResp.text().catch(() => ""));
        result.shopify = false;
      }
    } catch (err) {
      console.error("Shopify customer operation failed:", err);
      result.shopify = false;
    }
  } else {
    console.debug("Shopify not configured (set SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, and SHOPIFY_CLIENT_SECRET to enable)");
  }

  return result;
}

app.post("/api/subscribe", async (req, res) => {
  const firstName = (req.body?.firstName || "").trim();
  const email = (req.body?.email || "").trim().toLowerCase();
  const country = (req.body?.country || "").trim();

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const emails = readEmails();

  if (emails.some((entry) => entry.email === email)) {
    return res.status(200).json({ ok: true, alreadySubscribed: true, message: "You are officially in the list. We will be the first to let you know when MOUD launches." });
  }

  const subscriber = { firstName, email, country, subscribedAt: new Date().toISOString() };
  emails.push(subscriber);
  writeEmails(emails);

  try {
    const syncResult = await syncToExternalServices(subscriber);
    // if a configured service failed, persist for retry
    const shopifyConfigured = process.env.SHOPIFY_SHOP && process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET;
    const failures = [];
    if (shopifyConfigured && syncResult.shopify === false) failures.push('shopify');
    if (failures.length) {
      pushFailedSync(subscriber, { failures, syncResult });
    }
  } catch (error) {
    console.error("External sync failed", error);
  }

  return res.status(201).json({ ok: true, message: "You are officially in the list. We will be the first to let you know when MOUD launches." });
});

app.get("/privacy-policy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "privacy-policy.html"));
});

app.get("/terms-of-sale", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "terms-of-sale.html"));
});

// Retry failed external syncs periodically
setInterval(() => {
  retryFailedSyncs().catch((err) => console.error('Failed to run retryFailedSyncs', err));
}, 60 * 1000); // every 60s

app.listen(PORT, () => {
  console.log(`MOUD waitlist running at http://localhost:${PORT}`);
});
