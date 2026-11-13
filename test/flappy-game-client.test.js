const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

async function loadFlappy(dom) {
  await new Promise((resolve) => {
    dom.window.document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.location = dom.window.location;
  global.CustomEvent = dom.window.CustomEvent;
  global.requestAnimationFrame = () => 0;
  global.cancelAnimationFrame = () => {};
  const { initFlappyGame } = await import(`../src/js/flappy-game.js?t=${Date.now()}-${Math.random()}`);
  initFlappyGame();
}

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
  const seedHtml = `<!DOCTYPE html><html><body>${markup}</body></html>`;
  const seedDom = new JSDOM(seedHtml, { runScripts: 'dangerously', url: 'http://localhost/' });
  global.document = seedDom.window.document;
  const { SiteCookie } = await import('../src/js/site-cookie.js');
  SiteCookie.setGame('flappy-already-lost', { date: '01-01', failed: true });
  const cookie = seedDom.window.document.cookie;

  const html = `<!DOCTYPE html><html><body>${markup}</body></html>`;
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
  dom.window.document.cookie = cookie;
  await loadFlappy(dom);

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
  const html = `<!DOCTYPE html><html><body>${markup}</body></html>`;
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
  await loadFlappy(dom);

  // jsdom doesn't implement requestAnimationFrame/cancelAnimationFrame —
  // stub them out so clicking "start" (which kicks off the rAF loop) doesn't
  // throw. The loop's actual physics aren't under test here (see the note
  // at the top of this file).
  const status = dom.window.document.querySelector('[data-flappy-status]');
  assert.match(status.textContent, /Commencer/);

  const startButton = dom.window.document.querySelector('[data-flappy-start]');
  startButton.click();

  assert.equal(startButton.hidden, true);
  assert.doesNotMatch(status.textContent, /Commencer/);

  const field = dom.window.document.querySelector('[data-flappy-field]');
  assert.ok(field.classList.contains('is-playing'));
});
