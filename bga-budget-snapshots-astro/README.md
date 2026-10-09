# BGA Budget Snapshots — Astro + WPGraphQL

This prototype converts the approved Budget Snapshot visual treatment into an Astro site and populates pages from BetterGov via WPGraphQL.

## What it does

- Builds one static Astro page per approved WordPress slug.
- Pulls title, date, author, featured image, categories, tags and rendered Gutenberg content from WPGraphQL.
- Tries to pull Yoast SEO fields first; if the WPGraphQL Yoast extension is not available, it retries with core WordPress fields and generates sensible SEO fallbacks.
- Uses the featured image for social metadata even though the approved page treatment does not display a hero image.
- Removes WordPress/Jetpack sharing markup and Yoast's rendered table of contents from the article body.
- Splits the Gutenberg HTML at `h2` headings and turns those headings into the numbered section navigation used in the design.
- Derives the three hero metrics from the first budget comparison table.
- Keeps existing Datawrapper embeds and installs one responsive-height listener for the page.
- Includes the supplied City Clerk GraphQL result as an offline development fallback.

## Run it

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:4321/city-clerks-office-bga-policy-2026-budget-snapshot/
```

## WPGraphQL endpoint

The default is:

```text
https://www.bettergov.org/graphql
```

To override it, copy `.env.example` to `.env` and change `WP_GRAPHQL_ENDPOINT`.

## Publish another snapshot

Edit `src/config/snapshots.js` and add the WordPress slug when the analysis is ready:

```js
export const snapshotSlugs = [
  'city-clerks-office-bga-policy-2026-budget-snapshot',
  'another-department-budget-snapshot'
];
```

Then run:

```bash
npm run build
```

Astro will query WordPress and generate a static page for every slug in the list.

## SEO

`src/lib/wordpress.js` first requests the `seo` object exposed by the WPGraphQL Yoast SEO extension. If the schema does not have that field, the request automatically retries without it.

For the full WordPress/Yoast SEO handoff, install/enable a WPGraphQL Yoast integration so WordPress remains the source of truth for canonical URLs, meta descriptions, OpenGraph/Twitter metadata and JSON-LD schema.

## Content model

This first version intentionally uses the existing Gutenberg structure. It does not require new ACF fields. Once several real snapshots have run through the template, recurring pieces can be promoted to structured fields or custom Gutenberg blocks without replacing the whole rendering pipeline.
