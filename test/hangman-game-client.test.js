const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

function hangmanMarkup({ word = 'CAT', maxMistakes = 2, storageKey = 'hangman-test' } = {}) {
  return `
    <main class="page">
      <section
        data-js="hangman-game"
        data-hangman-word="${word}"
        data-hangman-max-mistakes="${maxMistakes}"
        data-hangman-storage-key="${storageKey}"
      >
        <p data-hangman-word-display></p>
        <div data-hangman-keyboard></div>
        <p data-hangman-status></p>
      </section>
      <section id="hangman-form-wrapper" hidden><p>win form</p></section>
    </main>
  `;
}

// Builds a fresh document and initializes the real game module against it.
async function renderHangman(markup, cookie) {
  const html = `<!DOCTYPE html><html><body data-test-date-override="">${markup}</body></html>`;
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
  if (cookie) dom.window.document.cookie = cookie;

  await new Promise((resolve) => {
    dom.window.document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.location = dom.window.location;
  global.CustomEvent = dom.window.CustomEvent;
  const { initHangmanGame } = await import(`../src/js/hangman-game.js?t=${Date.now()}-${Math.random()}`);
  initHangmanGame();

  return dom;
}

function guess(dom, letter) {
  const keyboard = dom.window.document.querySelector('[data-hangman-keyboard]');
  const btn = [...keyboard.querySelectorAll('button')].find((b) => b.textContent === letter);
  btn.click();
}

test('guessing every letter wins and reveals the win form', async () => {
  const dom = await renderHangman(hangmanMarkup({ word: 'CAT' }));

  'CAT'.split('').forEach((letter) => guess(dom, letter));

  const status = dom.window.document.querySelector('[data-hangman-status]');
  assert.match(status.textContent, /Tu as gagné/);

  const formWrapper = dom.window.document.getElementById('hangman-form-wrapper');
  assert.equal(formWrapper.hidden, false);
});

test('running out of mistakes loses, records the cookie, and dims the page', async () => {
  const dom = await renderHangman(hangmanMarkup({ word: 'CAT', maxMistakes: 2, storageKey: 'hangman-lose-test' }));

  guess(dom, 'X');
  guess(dom, 'Y');

  await new Promise((resolve) => dom.window.setTimeout(resolve, 1000));

  const status = dom.window.document.querySelector('[data-hangman-status]');
  assert.match(status.textContent, /Perdu/);

  const { SiteCookie } = await import('../src/js/site-cookie.js');
  const saved = SiteCookie.getGame('hangman-lose-test');
  assert.ok(saved && saved.failed === true);

  const section = dom.window.document.querySelector('main > section');
  assert.equal(section.style.opacity, '0.5');
});

test('a game already lost on a previous visit stays locked and dimmed on load', async () => {
  const markup = hangmanMarkup({ word: 'CAT', storageKey: 'hangman-already-lost' });
  const seedHtml = `<!DOCTYPE html><html><body data-test-date-override="">${markup}</body></html>`;
  const seedDom = new JSDOM(seedHtml, { runScripts: 'dangerously', url: 'http://localhost/' });
  global.document = seedDom.window.document;
  const { SiteCookie } = await import('../src/js/site-cookie.js');
  SiteCookie.setGame('hangman-already-lost', { date: '01-01', failed: true });
  const cookie = seedDom.window.document.cookie;

  const dom = await renderHangman(markup, cookie);

  const status = dom.window.document.querySelector('[data-hangman-status]');
  assert.match(status.textContent, /déjà perdu/);

  const keyboard = dom.window.document.querySelector('[data-hangman-keyboard]');
  const anyEnabled = [...keyboard.querySelectorAll('button')].some((b) => !b.disabled);
  assert.equal(anyEnabled, false);

  const section = dom.window.document.querySelector('main > section');
  assert.equal(section.style.opacity, '0.5');
});
