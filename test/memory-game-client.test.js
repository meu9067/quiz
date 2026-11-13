const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

function memoryMarkup({ pairs = 2 } = {}) {
  return `
    <main class="page">
      <section data-js="memory-game" data-memory-pairs="${pairs}">
        <div data-memory-grid></div>
        <p data-memory-status></p>
      </section>
      <section id="memory-form-wrapper" hidden><p>win form</p></section>
    </main>
  `;
}

async function renderMemory(markup) {
  const html = `<!DOCTYPE html><html><body>${markup}</body></html>`;
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });

  await new Promise((resolve) => {
    dom.window.document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
  const { initMemoryGame } = await import(`../src/js/memory-game.js?t=${Date.now()}-${Math.random()}`);
  initMemoryGame();

  return dom;
}

test('matching every pair wins and reveals the win form', async () => {
  const dom = await renderMemory(memoryMarkup({ pairs: 2 }));
  const document = dom.window.document;

  const cards = [...document.querySelectorAll('.memory-card')];
  assert.equal(cards.length, 4);

  // Group cards by their (hidden) value so each pair can be clicked in turn,
  // regardless of how the deck got shuffled.
  const byValue = new Map();
  cards.forEach((card) => {
    const value = card.dataset.value;
    if (!byValue.has(value)) byValue.set(value, []);
    byValue.get(value).push(card);
  });

  for (const [, [first, second]] of byValue) {
    first.click();
    second.click();
  }

  const status = document.querySelector('[data-memory-status]');
  assert.match(status.textContent, /trouvé les 2 paires/);

  const formWrapper = document.getElementById('memory-form-wrapper');
  assert.equal(formWrapper.hidden, false);
});

test('mismatched cards flip back and do not count as matched', async () => {
  const dom = await renderMemory(memoryMarkup({ pairs: 2 }));
  const document = dom.window.document;

  const cards = [...document.querySelectorAll('.memory-card')];
  const [a, b] = cards;

  if (a.dataset.value === b.dataset.value) {
    // Guaranteed mismatch regardless of shuffle: pick two different values.
    const other = cards.find((c) => c.dataset.value !== a.dataset.value);
    a.click();
    other.click();
  } else {
    a.click();
    b.click();
  }

  const status = document.querySelector('[data-memory-status]');
  assert.match(status.textContent, /0 \/ 2 paires trouvées/);
});
