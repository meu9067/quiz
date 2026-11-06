const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { app, dayPageNames, getCurrentDate, formatDateSlug } = require('../server');

let server;
let port;

before(() => {
  server = app.listen(0);
  port = server.address().port;
});

after(() => {
  server.close();
});

function get(urlPath) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path: urlPath }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      })
      .on('error', reject);
  });
}

test("the actual current day's page renders its real content", async () => {
  const todaySlug = formatDateSlug(getCurrentDate());
  const { status, body } = await get(`/day/${todaySlug}`);

  assert.equal(status, 200);
  assert.match(body, new RegExp(todaySlug));
  assert.doesNotMatch(body, /Page not available/);
});

test("a different day's existing page is reported unavailable when visited directly", async () => {
  const todaySlug = formatDateSlug(getCurrentDate());
  const otherSlug = dayPageNames.find((slug) => slug !== todaySlug);

  assert.ok(otherSlug, 'expected at least one other day page to test against (besides today)');

  const { status, body } = await get(`/day/${otherSlug}`);

  assert.equal(status, 404);
  assert.match(body, /Page not available/);
  assert.match(body, new RegExp(otherSlug));
});

test('a date with no page file at all is also reported unavailable', async () => {
  const { status, body } = await get('/day/1999-01-01');

  assert.equal(status, 404);
  assert.match(body, /Page not available/);
});

test("home page's data-test-date-override attribute reflects TEST_DATE_OVERRIDE", async () => {
  const { status, body } = await get('/');

  assert.equal(status, 200);
  const expected = process.env.TEST_DATE_OVERRIDE || '';
  assert.match(body, new RegExp(`data-test-date-override="${expected}"`));
});
