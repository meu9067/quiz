const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('the layout loads one built module instead of individual client scripts', () => {
  const layout = fs.readFileSync(path.join(__dirname, '../views/layouts/main.hbs'), 'utf8');
  const scripts = [...layout.matchAll(/<script\b[^>]*><\/script>/g)].map(([tag]) => tag);

  assert.deepEqual(scripts, ['<script type="module" src="/js/bundle.js"></script>']);
  const jsDir = path.join(__dirname, '../public/js');
  assert.deepEqual(fs.readdirSync(jsDir), ['bundle.js']);
  assert.ok(fs.statSync(path.join(jsDir, 'bundle.js')).size > 0);
});
