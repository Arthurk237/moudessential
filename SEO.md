# Search visibility for Moudessentials

The primary brand name is **Moudessentials**, with **MOUD** as its alternate name.
The current site is a pre-launch landing page with a waitlist, not a live checkout.
Its metadata describes the brand and La Muse without promising that products are
already available to buy.

## Search terms and page focus

| Page | Main focus |
| --- | --- |
| Home | Moudessentials; luxury leather bags and accessories |
| Waitlist | Moudessentials waitlist; La Muse early access |
| Product imagery and existing page copy | La Muse leather vanity bag; full-grain leather; gold-plated hardware; designed in Toronto |
| Legal pages | Moudessentials privacy policy; Moudessentials terms of sale |

These terms describe the actual brand and product. They are not search-volume or
competition research. Use them naturally in useful copy, titles, descriptions,
and accurate image alt text. Google does not use the `meta keywords` tag for
ranking, so the site does not include one. There are no hidden keyword lists.

The homepage title is **Moudessentials | Luxury Leather Bags & Accessories**.
Each page has a distinct title and description, matching social sharing tags,
an absolute canonical URL, and WebPage structured data. The homepage identifies
Moudessentials and MOUD as the same organization and website. Other pages include
breadcrumbs linking back to the homepage. The homepage links to the waitlist so
crawlers can discover it without a sitemap.

## Maintaining metadata

Edit the brand information and page metadata in `scripts/sync-seo.js`, then run:

```bash
node scripts/sync-seo.js
node scripts/sync-seo.js --check
node --test tests/seo.test.js
```

The generated blocks are stored in the HTML itself, so Google and social
crawlers can read them without executing JavaScript. Keep the requested homepage
layout: “La Muse” with “leather vanity bag” as the small line underneath. Use the
existing early-access paragraph for brand context; do not restore the removed
product description section for SEO.

The existing canonical origin is `https://moudessentials.com`. On the live host,
check that HTTP and `www` variants redirect consistently to this HTTPS origin
and that it returns 200, without redirect loops. Hosting must agree with the
canonical URLs. The cloud environment's network policy blocked live-domain
requests during this update, so live redirects and indexing were not verified.
Do not force a new hostname redirect in application code without checking the
hosting configuration first.

## Google indexing after deployment

1. Open [Google Search Console](https://search.google.com/search-console/).
   Add the **Domain** property `moudessentials.com` if it is not already verified.
   Complete Google's DNS verification through the domain's DNS provider.
2. Use **URL Inspection** for `https://moudessentials.com/`, run **Test live URL**,
   and resolve any reported crawl or indexing errors. Confirm the page is
   accessible, indexable, and uses the expected canonical URL.
3. Select **Request indexing** for the homepage and `/waitlist.html` after the
   updated files are deployed. No sitemap is required for this small linked site.
4. After Google recrawls, monitor **Page indexing** and **Performance** for brand
   queries such as “moudessentials” and “MOUD bags”. Search Console provides
   evidence of indexing; a third-party SEO score does not.

Tags and structured data help Google understand the site, but do not guarantee
indexing, a particular position, or Google's exact displayed title/snippet.
Link the website from the existing Instagram and TikTok profiles and keep the
brand spelling consistent. Genuine mentions and links help discovery; avoid
buying links or mass-producing keyword pages.

## PNG images and future store pages

All five original JPG images have actual PNG conversions, including the social
sharing image. The product `<picture>` elements serve responsive WebP versions
where supported and use PNG fallbacks. WebP keeps photographic downloads smaller;
PNG conversion does not add detail to the original photos. Update both formats
and both product sizes when replacing photos. Old JPG URLs remain available for
previously shared links, but current page references use PNG/WebP.

When real product and category pages are added, give each one a unique canonical
URL, title, description, useful visible copy, and links from the store navigation.
Add Product/Offer structured data using real, visible prices, currency, stock,
and purchase URLs. Do not invent prices, ratings, availability, or reviews for
the current waitlist page. Revisit return/shipping details before publishing
merchant information or connecting Google Merchant Center.

## Google references

- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Site names](https://developers.google.com/search/docs/appearance/site-names)
- [Title links](https://developers.google.com/search/docs/appearance/title-link)
- [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Request a recrawl](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
