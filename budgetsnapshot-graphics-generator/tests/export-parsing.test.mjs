import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';

// Use Astro's existing HTML parser, including the browser-compatible parse5 tokenizer.
const require = createRequire(new URL('../../bga-budget-snapshots-astro/package.json', import.meta.url));
const { load } = require('cheerio');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const $ = load(html);
const script = $('script').text();

test('HTML parsing preserves the entire generator script', () => {
  assert.equal($('script').length, 1);
  assert.match(script, /initialize\(\);\s*\}\)\(\);\s*$/);
  assert.doesNotThrow(() => new vm.Script(script));
  // Keep generated script tags encoded inside the containing script.
  assert.doesNotMatch(script, /<\/?script\b/i);
});

test('exported preview contains a real, correctly closed tooltip script', () => {
  const statement = script.split('\n').find(line => line.includes("files[folder+'preview.html']="));
  const context = {
    files: {}, folder: '', context: { department: 'Treasurer' },
    activeCycle: { label: '2026 recommendation' },
    frozen: [{ html: '<figure>Frozen graphic</figure>' }],
    escapeHtml: value => value
  };
  vm.runInNewContext(statement, context);
  const preview = load(context.files['preview.html']);
  assert.equal(preview('script').length, 1);
  assert.equal(preview('script').attr('src'), 'budget-tooltips.js');
  assert.equal(preview('script').text(), '');
  assert.equal(preview('figure').text(), 'Frozen graphic');
  assert.doesNotMatch(context.files['preview.html'], /\\x3C|<\\\/script>/);
});

test('Live Server injects its reload script outside the generator JavaScript', () => {
  // Live reload middleware finds closing tags in raw HTML, including JS strings.
  const served = html.replace(/<\/body>/i, '<script>window.__liveReload = true;</script></body>');
  const parsed = load(served);
  assert.equal(parsed('script').length, 2);
  assert.doesNotThrow(() => new vm.Script(parsed('script').first().text()));
  assert.match(parsed('script').last().text(), /window\.__liveReload/);
});
