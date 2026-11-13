const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

test('main module initializes the today link and saved-name greeting', async () => {
  const dom = new JSDOM('<body data-test-date-override="2026-11-13"><a id="today-link"></a><p id="day-greeting"></p></body>', {
    url: 'http://localhost/',
    runScripts: 'dangerously',
  });
  await new Promise((resolve) => dom.window.document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  global.window = dom.window;
  global.document = dom.window.document;
  const { SiteCookie } = await import('../src/js/site-cookie.js');
  SiteCookie.set('name', 'Ada');
  const { initMain } = await import('../src/js/main.js');
  initMain();

  assert.equal(dom.window.document.getElementById('today-link').getAttribute('href'), '/day/11-13');
  assert.match(dom.window.document.getElementById('day-greeting').textContent, /Salut, Ada/);
});
