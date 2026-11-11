const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const DROP_JS = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'drop-game.js'), 'utf8');
const SITE_COOKIE_JS = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'site-cookie.js'), 'utf8');
const SITE_PAGE_FADE_JS = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'site-page-fade.js'), 'utf8');

// Note: drop-game.js's win/loss paths are driven by Pointer Events
// (setPointerCapture/getBoundingClientRect-based drag detection), which
// jsdom doesn't lay out or support realistically — so those paths aren't
// covered here. This test sticks to the one path that's plain DOM/cookie
// logic: a game already lost on a previous visit staying locked on load.
function dropMarkup({ storageKey = 'drop-test' } = {}) {
  return `
    <main class="page">
      <section data-js="drop-game" data-drop-storage-key="${storageKey}">
        <div data-drop-field>
          <div data-drop-target></div>
          <div data-drop-object data-drop-valid="true"></div>
          <div data-drop-object data-drop-valid="false"></div>
        </div>
        <p data-drop-status></p>
      </section>
    </main>
  `;
}

test('a game already lost on a previous visit stays locked and dimmed on load', async () => {
  const markup = dropMarkup({ storageKey: 'drop-already-lost' });
  const seedHtml = `<!DOCTYPE html><html><body>${markup}<script>${SITE_COOKIE_JS}</script></body></html>`;
  const seedDom = new JSDOM(seedHtml, { runScripts: 'dangerously', url: 'http://localhost/' });
  seedDom.window.SiteCookie.setGame('drop-already-lost', { date: '01-01', failed: true });
  const cookie = seedDom.window.document.cookie;

  const html = `<!DOCTYPE html><html><body>${markup}<script>${SITE_COOKIE_JS}</script><script>${SITE_PAGE_FADE_JS}</script><script>${DROP_JS}</script></body></html>`;
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
  dom.window.document.cookie = cookie;
  await new Promise((resolve) => {
    dom.window.document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });

  const status = dom.window.document.querySelector('[data-drop-status]');
  assert.match(status.textContent, /déjà perdu/);

  const objects = [...dom.window.document.querySelectorAll('[data-drop-object]')];
  assert.ok(objects.every((obj) => obj.classList.contains('is-locked')));

  const section = dom.window.document.querySelector('main > section');
  assert.equal(section.style.opacity, '0.5');
});
