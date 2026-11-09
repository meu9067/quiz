const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const FORMS_JS = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'forms.js'), 'utf8');
const SITE_COOKIE_JS = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'js', 'site-cookie.js'),
  'utf8'
);

// Builds a fresh document containing the given form markup plus the real
// public/js/site-cookie.js and public/js/forms.js (inlined, so it runs
// through the DOM/event lifecycle exactly like it does in a browser —
// including waiting for DOMContentLoaded before wiring up listeners).
async function renderForm(formHtml) {
  const html = `<!DOCTYPE html><html><body>${formHtml}<script>${SITE_COOKIE_JS}</script><script>${FORMS_JS}</script></body></html>`;
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });

  await new Promise((resolve) => {
    dom.window.document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
  });

  return dom;
}

function submit(form) {
  const event = new form.ownerDocument.defaultView.Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(event);
}

test('invalid input is rejected with the configured error message, no success event fires', async () => {
  const dom = await renderForm(`
    <form id="contact-form" data-js="form" data-success-message="Sent!" data-error-message="Fill it in.">
      <input name="name" required minlength="2" />
      <button type="submit">Send</button>
      <p data-form-status></p>
    </form>
  `);
  const form = dom.window.document.getElementById('contact-form');
  const status = form.querySelector('[data-form-status]');

  let succeeded = false;
  form.addEventListener('form:success', () => (succeeded = true));

  submit(form);

  assert.equal(status.textContent, 'Fill it in.');
  assert.ok(status.classList.contains('form-status--error'));
  assert.equal(succeeded, false);
});

test('valid input shows the success message, resets the form, and fires form:success', async () => {
  const dom = await renderForm(`
    <form id="contact-form" data-js="form" data-success-message="Sent!" data-error-message="Fill it in.">
      <input name="name" required minlength="2" />
      <button type="submit">Send</button>
      <p data-form-status></p>
    </form>
  `);
  const form = dom.window.document.getElementById('contact-form');
  const status = form.querySelector('[data-form-status]');
  form.elements.namedItem('name').value = 'Ada';

  let detail = null;
  form.addEventListener('form:success', (event) => (detail = event.detail));

  submit(form);

  assert.equal(status.textContent, 'Sent!');
  assert.ok(status.classList.contains('form-status--success'));
  assert.equal(form.elements.namedItem('name').value, '', 'form should reset after success');
  assert.ok(detail && detail.form === form);
});

test('a quiz-style form with data-correct rejects a wrong-but-valid choice', async () => {
  const dom = await renderForm(`
    <form id="quiz-form" data-js="form" data-success-message="Correct!" data-error-message="Not quite.">
      <input type="radio" name="choice" value="a" />
      <input type="radio" name="choice" value="b" data-correct="true" />
      <input type="radio" name="choice" value="c" />
      <button type="submit">Submit</button>
      <p data-form-status></p>
    </form>
  `);
  const form = dom.window.document.getElementById('quiz-form');
  const status = form.querySelector('[data-form-status]');
  form.querySelector('[value="a"]').checked = true;

  submit(form);

  assert.equal(status.textContent, 'Not quite.');
  assert.ok(status.classList.contains('form-status--error'));
});

test('a quiz-style form with data-correct accepts the right choice', async () => {
  const dom = await renderForm(`
    <form id="quiz-form" data-js="form" data-success-message="Correct!" data-error-message="Not quite.">
      <input type="radio" name="choice" value="a" />
      <input type="radio" name="choice" value="b" data-correct="true" />
      <input type="radio" name="choice" value="c" />
      <button type="submit">Submit</button>
      <p data-form-status></p>
    </form>
  `);
  const form = dom.window.document.getElementById('quiz-form');
  const status = form.querySelector('[data-form-status]');
  form.querySelector('[value="b"]').checked = true;

  submit(form);

  assert.equal(status.textContent, 'Correct!');
  assert.ok(status.classList.contains('form-status--success'));
});

test('data-save-cookie-field stores the given field in the shared site cookie on success', async () => {
  const dom = await renderForm(`
    <form id="nameForm-form" data-js="form" data-success-message="Saved!" data-error-message="Enter a name." data-save-cookie-field="name">
      <input name="name" required minlength="1" />
      <button type="submit">Save</button>
      <p data-form-status></p>
    </form>
  `);
  const form = dom.window.document.getElementById('nameForm-form');
  form.elements.namedItem('name').value = 'Grace';

  submit(form);

  assert.equal(dom.window.SiteCookie.get('name'), 'Grace');
  assert.match(dom.window.document.cookie, /(?:^|; )site-data=/);
});

test('a status element targeted via data-status-target still receives messages', async () => {
  const dom = await renderForm(`
    <form id="feedback-form" data-js="form" data-success-message="Thanks!" data-error-message="Pick one." data-status-target="#feedback-status">
      <input type="radio" name="choice" value="a" required />
      <button type="submit">Submit</button>
    </form>
    <p id="feedback-status"></p>
  `);
  const form = dom.window.document.getElementById('feedback-form');
  const status = dom.window.document.getElementById('feedback-status');

  submit(form);

  assert.equal(status.textContent, 'Pick one.');
  assert.ok(status.classList.contains('form-status--error'));
});
