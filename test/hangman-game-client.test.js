const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const HANGMAN_JS = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'hangman-game.js'), 'utf8');
const SITE_COOKIE_JS = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'site-cookie.js'), 'utf8');
const SITE_DATE_JS = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'site-date.js'), 'utf8');
const SITE_PAGE_FADE_JS = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'site-page-fade.js'), 'utf8');
const SITE_GAME_UI_JS = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'site-game-ui.js'), 'utf8');

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

// Builds a fresh document containing the given markup plus the real shared
// helpers and public/js/hangman-game.js (inlined, so it runs through the
// DOM/event lifecycle exactly like it does in a browser).
async function renderHangman(markup) {
  const html = `<!DOCTYPE html><html><body data-test-date-override="">${markup}<script>${SITE_COOKIE_JS}</script><script>${SITE_DATE_JS}</script><script>${SITE_PAGE_FADE_JS}</script><script>${SITE_GAME_UI_JS}</script><script>${HANGMAN_JS}</script></body></html>`;
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });

  await new Promise((resolve) => {
    dom.window.document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });

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

  const saved = dom.window.SiteCookie.getGame('hangman-lose-test');
  assert.ok(saved && saved.failed === true);

  const section = dom.window.document.querySelector('main > section');
  assert.equal(section.style.opacity, '0.5');
});

test('a game already lost on a previous visit stays locked and dimmed on load', async () => {
  const markup = hangmanMarkup({ word: 'CAT', storageKey: 'hangman-already-lost' });
  const seedHtml = `<!DOCTYPE html><html><body data-test-date-override="">${markup}<script>${SITE_COOKIE_JS}</script></body></html>`;
  const seedDom = new JSDOM(seedHtml, { runScripts: 'dangerously', url: 'http://localhost/' });
  seedDom.window.SiteCookie.setGame('hangman-already-lost', { date: '01-01', failed: true });
  const cookie = seedDom.window.document.cookie;

  const html = `<!DOCTYPE html><html><body data-test-date-override="">${markup}<script>${SITE_COOKIE_JS}</script><script>${SITE_DATE_JS}</script><script>${SITE_PAGE_FADE_JS}</script><script>${SITE_GAME_UI_JS}</script><script>${HANGMAN_JS}</script></body></html>`;
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
  dom.window.document.cookie = cookie;
  await new Promise((resolve) => {
    dom.window.document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });

  const status = dom.window.document.querySelector('[data-hangman-status]');
  assert.match(status.textContent, /déjà perdu/);

  const keyboard = dom.window.document.querySelector('[data-hangman-keyboard]');
  const anyEnabled = [...keyboard.querySelectorAll('button')].some((b) => !b.disabled);
  assert.equal(anyEnabled, false);

  const section = dom.window.document.querySelector('main > section');
  assert.equal(section.style.opacity, '0.5');
});
