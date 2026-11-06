#!/usr/bin/env node
// Pre-renders every route this Express/Handlebars app serves into a `dist/`
// folder of plain static files, ready to deploy to Cloudflare Pages.
//
// It boots the real server (server.js) on an ephemeral local port and
// requests every known route exactly like a browser would, so the output is
// guaranteed to match what you've been testing locally with `npm start`.
//
// Note: the home page's "Go to today's page" link, and which dates have a
// real /day/<date> page, are both resolved at BUILD time (via server.js's
// getCurrentDate()/TEST_DATE_OVERRIDE). Re-run `npm run deploy` (or schedule
// it, e.g. a daily CI cron) to roll the link over to a new day.
const fs = require('fs');
const path = require('path');
const http = require('http');

const { app, pageNames, dayPageNames } = require('../server');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function fetchPath(port, urlPath) {
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

function writeHtml(relativeDir, html) {
  const dir = path.join(DIST_DIR, relativeDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // Every views/pages/*.hbs route.
    for (const name of pageNames) {
      const urlPath = name === 'home' ? '/' : `/${name}`;
      const { status, body } = await fetchPath(port, urlPath);

      if (status !== 200) {
        throw new Error(`Failed to render ${urlPath} (status ${status})`);
      }

      if (name === '404') {
        fs.writeFileSync(path.join(DIST_DIR, '404.html'), body);
      } else {
        writeHtml(name === 'home' ? '' : name, body);
      }
    }

    // Every real views/pages/days/<date>.hbs page.
    for (const dateSlug of dayPageNames) {
      const { status, body } = await fetchPath(port, `/day/${dateSlug}`);

      if (status !== 200) {
        throw new Error(`Failed to render /day/${dateSlug} (status ${status})`);
      }

      writeHtml(path.join('day', dateSlug), body);
    }

    // Fallback markup shown by the /day/* Pages Function (functions/day/[date].js)
    // for any date that doesn't have a pre-rendered page above.
    const unavailable = await fetchPath(port, '/day/0000-00-00');
    fs.writeFileSync(path.join(DIST_DIR, 'day-unavailable.html'), unavailable.body);
  } finally {
    server.close();
  }

  // Static assets (css/js) served from the same paths the HTML expects
  // (e.g. /css/main.css, /js/forms.js).
  copyDir(PUBLIC_DIR, DIST_DIR);

  console.log(`Static site written to ${DIST_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
