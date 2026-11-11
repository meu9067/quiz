const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const FLAPPY_JS = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'flappy-game.js'), 'utf8');
const SITE_COOKIE_JS = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'site-cookie.js'), 'utf8');
const SITE_PAGE_FADE_JS = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'site-page-fade.js'), 'utf8');

// Note: flappy-game.js's gameplay (gravity, flapping, mountain collisions,
// reaching the goal) is driven by a requestAnimationFrame loop built on
// real field/bird pixel sizes, which jsdom doesn't lay out — so those paths
// aren't covered here. This test sticks to the one path that's plain
// DOM/cookie logic: a game already lost on a previous visit staying locked
// on load.
function flappyMarkup({ storageKey = 'flappy-test' } = {}) {
  return `
    <main class="page">
      <section data-js="flappy-game" data-flappy-storage-key="${storageKey}">
        <button type="button" data-flappy-start>Commencer</button>
        <div data-flappy-field>
          <div data-flappy-bird style="left: 80px;"></div>
          <div data-flappy-goal></div>
        </div>
        <p data-flappy-status></p>
        <p data-flappy-alert hidden></p>
      </section>
    </main>
  `;
}

test('a game already lost on a previous visit stays locked and dimmed on load', async () => {
  const markup = flappyMarkup({ storageKey: 'flappy-already-lost' });
  const seedHtml = `<!DOCTYPE html><html><body>${markup}<script>${SITE_COOKIE_JS}</script></body></html>`;
  const seedDom = new JSDOM(seedHtml, { runScripts: 'dangerously', url: 'http://localhost/' });
  seedDom.window.SiteCookie.setGame('flappy-already-lost', { date: '01-01', failed: true });
  const cookie = seedDom.window.document.cookie;

  const html = `<!DOCTYPE html><html><body>${markup}<script>${SITE_COOKIE_JS}</script><script>${SITE_PAGE_FADE_JS}</script><script>${FLAPPY_JS}</script></body></html>`;
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
  dom.window.document.cookie = cookie;
  await new Promise((resolve) => {
    dom.window.document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });

  const status = dom.window.document.querySelector('[data-flappy-status]');
  assert.match(status.textContent, /déjà perdu/);

  const alertEl = dom.window.document.querySelector('[data-flappy-alert]');
  assert.equal(alertEl.hidden, false);
  assert.match(alertEl.textContent, /déjà perdue/);
  assert.ok(alertEl.classList.contains('is-lost'));

  const startButton = dom.window.document.querySelector('[data-flappy-start]');
  assert.equal(startButton.disabled, true);

  const section = dom.window.document.querySelector('main > section');
  assert.equal(section.style.opacity, '0.5');
});

test('clicking the start button is required before the field reacts to a flap, then kicks off the run', async () => {
  const markup = flappyMarkup({ storageKey: 'flappy-start-test' });
  const html = `<!DOCTYPE html><html><body>${markup}<script>${SITE_COOKIE_JS}</script><script>${SITE_PAGE_FADE_JS}</script><script>${FLAPPY_JS}</script></body></html>`;
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
  await new Promise((resolve) => {
    dom.window.document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });

  // jsdom doesn't implement requestAnimationFrame/cancelAnimationFrame —
  // stub them out so clicking "start" (which kicks off the rAF loop) doesn't
  // throw. The loop's actual physics aren't under test here (see the note
  // at the top of this file).
  dom.window.requestAnimationFrame = () => 0;
  dom.window.cancelAnimationFrame = () => {};

  const status = dom.window.document.querySelector('[data-flappy-status]');
  assert.match(status.textContent, /Commencer/);

  const startButton = dom.window.document.querySelector('[data-flappy-start]');
  startButton.click();

  assert.equal(startButton.hidden, true);
  assert.doesNotMatch(status.textContent, /Commencer/);
});
