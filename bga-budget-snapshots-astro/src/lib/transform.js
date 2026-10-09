import * as cheerio from 'cheerio';

const WORDS = {
  'Departmental Highlights': 'Highlights',
  'Historical Context': 'History',
  'Budgeted Position Changes': 'Positions',
  Appropriations: 'Spending'
};

function fragment(html = '') {
  return cheerio.load(html, null, false);
}

function nodeHtml($, node) {
  return $.html(node) || '';
}

export function stripHtml(html = '') {
  const $ = fragment(html);
  $('.sharedaddy, .sd-sharing-enabled, script, style').remove();
  return $.root().text().replace(/\s+/g, ' ').replace(/\[…\]|\[&hellip;\]/g, '').trim();
}

function cleanContentDom($) {
  $('.sharedaddy, .sd-sharing-enabled').remove();
  $('.wp-block-yoast-seo-table-of-contents, .yoast-table-of-contents').remove();

  // We install one Datawrapper resize listener globally instead of repeating
  // WordPress's inline resize script after every iframe.
  $('script').remove();

  $('img').each((_, image) => {
    $(image)
      .attr('loading', 'lazy')
      .removeAttr('data-recalc-dims');
  });

  $('figure.wp-block-table').each((_, figure) => {
    const $figure = $(figure).addClass('table-card');
    const table = $figure.children('table').first();
    if (table.length && !table.parent().hasClass('table-wrap')) {
      table.wrap('<div class="table-wrap"></div>');
    }
  });

  $('figure.wp-block-image').addClass('graphic-card');

  $('iframe').each((_, frame) => {
    const $frame = $(frame);
    const title = $frame.attr('title') || 'Interactive graphic';

    $frame
      .removeAttr('style')
      .removeAttr('scrolling')
      .removeAttr('frameborder')
      .attr('loading', 'lazy')
      .addClass('datawrapper-embed');

    if (!$frame.parent().is('figure')) {
      $frame.wrap('<figure class="graphic-card datawrapper-card"></figure>');
      $frame.before(`<p class="graphic-kicker">${escapeHtml(title)}</p>`);
    }
  });

  $('p').each((_, paragraph) => {
    const $p = $(paragraph);
    const text = $p.text().trim();

    if (/^Snapshot:/i.test(text)) {
      const title = text.replace(/^Snapshot:\s*/i, '').trim();
      const $next = $p.next();

      if ($next.is('figure.wp-block-table')) {
        $next.prepend(`<h3 class=\"table-title\">${escapeHtml(title)}</h3>`);
        $next.prepend('<p class=\"table-kicker\">Snapshot</p>');
        $p.remove();
      } else {
        $p.addClass('snapshot-kicker');
      }
    }
  });

  $('ul.wp-block-list').addClass('report-list');
}

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function structurePostContent(html = '') {
  const $ = fragment(html);
  cleanContentDom($);

  const children = $.root().contents().toArray();
  const firstH2Index = children.findIndex(
    (node) => node.type === 'tag' && node.name?.toLowerCase() === 'h2'
  );

  const introNodes = firstH2Index === -1 ? children : children.slice(0, firstH2Index);
  const introHtml = introNodes.map((node) => nodeHtml($, node)).join('').trim();

  const sections = [];
  let current = null;

  for (const node of children.slice(Math.max(firstH2Index, 0))) {
    const isH2 = node.type === 'tag' && node.name?.toLowerCase() === 'h2';

    if (isH2) {
      if (current) sections.push(current);
      const $heading = $(node);
      const title = $heading.text().trim();
      const originalId = $heading.attr('id') || slugify(title);
      current = {
        id: originalId.replace(/^h-/, ''),
        title,
        shortTitle: WORDS[title] || title.split(/\s+/)[0],
        bodyParts: []
      };
      continue;
    }

    if (current) current.bodyParts.push(nodeHtml($, node));
  }

  if (current) sections.push(current);

  return {
    introHtml,
    introText: stripHtml(introHtml),
    sections: sections.map((section, index) => ({
      ...section,
      number: String(index + 1).padStart(2, '0'),
      html: section.bodyParts.join('').trim()
    }))
  };
}

function slugify(value = '') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseNumeric(value = '') {
  const normalized = value.replace(/,/g, '').replace(/[^0-9.+-]/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function compactMoney(value) {
  if (value == null) return null;
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `$${value.toLocaleString('en-US')}`;
}

function currency(value, showPlus = false) {
  if (value == null) return null;
  const sign = value < 0 ? '-' : showPlus && value > 0 ? '+' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US')}`;
}

export function deriveMetrics(html = '') {
  const $ = fragment(html);
  const table = $('table').first();
  if (!table.length) return [];

  const rows = table.find('tr').toArray().map((row) =>
    $(row)
      .find('th, td')
      .toArray()
      .map((cell) => $(cell).text().replace(/\s+/g, ' ').trim())
  );

  const appropriations = rows.find((row) => /appropriations/i.test(row[0] || ''));
  const positions = rows.find((row) => /positions|ftes/i.test(row[0] || ''));
  const metrics = [];

  if (appropriations?.length >= 5) {
    const current = parseNumeric(appropriations[2]);
    const net = parseNumeric(appropriations[3]);
    const pct = appropriations[4];
    metrics.push({
      value: compactMoney(current) || appropriations[2],
      label: '2026 proposed appropriations',
      detail: current == null ? appropriations[2] : `${currency(current)} total`
    });
    metrics.push({
      value: pct && !pct.startsWith('-') && !pct.startsWith('+') ? `+${pct}` : pct,
      label: 'Appropriation change',
      detail: net == null ? `${appropriations[3]} from 2025` : `${currency(net, true)} from 2025`
    });
  }

  if (positions?.length >= 5) {
    const current = parseNumeric(positions[2]);
    const net = parseNumeric(positions[3]);
    const pct = positions[4];
    const direction = net == null ? '' : net > 0 ? 'Up' : net < 0 ? 'Down' : 'No change';
    const count = net == null ? positions[3] : Math.abs(net).toLocaleString('en-US');
    const noun = Math.abs(net ?? 2) === 1 ? 'position' : 'positions';
    const detail = net === 0
      ? `No change from 2025`
      : `${direction} ${count} ${noun}${pct ? `, or ${pct}` : ''}`;

    metrics.push({
      value: current == null ? positions[2] : current.toLocaleString('en-US'),
      label: 'Budgeted positions & FTEs',
      detail
    });
  }

  return metrics.slice(0, 3);
}

function buildCanonical(post) {
  if (post.uri) {
    return new URL(post.uri, 'https://www.bettergov.org').toString();
  }

  const date = new Date(post.date);
  if (!Number.isNaN(date.valueOf())) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `https://www.bettergov.org/${year}/${month}/${day}/${post.slug}/`;
  }

  return `https://www.bettergov.org/${post.slug}/`;
}

export function deriveSeo(post, structured) {
  const seo = post.seo || {};
  const featuredImage = post.featuredImage?.node?.sourceUrl || null;
  const description =
    seo.metaDesc ||
    seo.opengraphDescription ||
    stripHtml(post.excerpt || '') ||
    structured.introText.slice(0, 180);
  const canonical = seo.canonical || buildCanonical(post);

  return {
    title: seo.title || post.title,
    description,
    canonical,
    robotsNoindex: seo.metaRobotsNoindex === 'noindex',
    robotsNofollow: seo.metaRobotsNofollow === 'nofollow',
    ogTitle: seo.opengraphTitle || seo.title || post.title,
    ogDescription: seo.opengraphDescription || description,
    ogUrl: seo.opengraphUrl || canonical,
    ogImage: seo.opengraphImage?.sourceUrl || featuredImage,
    twitterTitle: seo.twitterTitle || seo.opengraphTitle || seo.title || post.title,
    twitterDescription: seo.twitterDescription || seo.opengraphDescription || description,
    twitterImage: seo.twitterImage?.sourceUrl || seo.opengraphImage?.sourceUrl || featuredImage,
    schemaRaw: seo.schema?.raw || null
  };
}

export function formatPostDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Chicago'
  }).format(date);
}

export function snapshotYear(post) {
  const haystack = [post.title, ...(post.tags?.nodes || []).map((tag) => tag.name)].join(' ');
  return haystack.match(/\b20\d{2}\b/)?.[0] || new Date(post.date).getFullYear();
}
