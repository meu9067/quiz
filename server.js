const path = require('path');
const fs = require('fs');
const express = require('express');
const { engine } = require('express-handlebars');

const formsConfig = require('./config/forms');

const app = express();
const PORT = process.env.PORT || 3000;

// --- "Today" used to build the /day/<date> link ---
// Set TEST_DATE_OVERRIDE in .env (e.g. TEST_DATE_OVERRIDE=2026-12-25) to
// manually test a different day without waiting for the real date to
// change. Leave it unset/empty to use the real current date. This single
// value drives both the server-rendered date and the browser's "today"
// link — see the `data-test-date-override` attribute on <body> in
// views/layouts/main.hbs, read by public/js/main.js.
try {
  process.loadEnvFile();
} catch (error) {
  // No .env file present — that's fine, just use real dates.
}

const TEST_DATE_OVERRIDE = process.env.TEST_DATE_OVERRIDE || null;

function getCurrentDate() {
  return TEST_DATE_OVERRIDE ? new Date(`${TEST_DATE_OVERRIDE}T00:00:00`) : new Date();
}

function formatDateSlug(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

// --- Build a lookup of forms per page from config/forms.js ---
// e.g. { contact: { contact: {...} }, home: { newsletter: {...} } }
const formsByPage = Object.entries(formsConfig).reduce((acc, [id, form]) => {
  acc[form.page] = acc[form.page] || {};
  acc[form.page][id] = { id, ...form };
  return acc;
}, {});

const VIEWS_DIR = path.join(__dirname, 'views');
const PAGES_DIR = path.join(VIEWS_DIR, 'pages');
const PARTIALS_DIR = path.join(VIEWS_DIR, 'partials');
const DAYS_DIR = path.join(PAGES_DIR, 'days');

// --- Handlebars setup ---
app.engine(
  'hbs',
  engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(VIEWS_DIR, 'layouts'),
    partialsDir: PARTIALS_DIR,
    helpers: {
      eq: (a, b) => a === b,
      year: () => new Date().getFullYear(),
    },
  })
);
app.set('view engine', 'hbs');
app.set('views', VIEWS_DIR);

// --- Static assets ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Dynamic routing based on files inside views/pages ---
// Every file in views/pages/*.hbs becomes a route with the same name.
// e.g. views/pages/home.hbs -> "/" and "/home"
//      views/pages/about.hbs -> "/about"
function getPageNames() {
  return fs
    .readdirSync(PAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.hbs'))
    .map((entry) => path.basename(entry.name, '.hbs'));
}

const pageNames = getPageNames();

// French titles for the auto-routed pages in views/pages — keyed by the
// page's filename (same key used for its route). Falls back to simply
// capitalizing the filename for any page added without an entry here.
const PAGE_TITLES = {
  home: 'Accueil',
  about: 'À propos',
  contact: 'Contact',
  booking: 'Réservation',
  feedback: 'Avis',
  signup: 'Inscription',
  quiz: 'Quiz',
  days: 'Tous les jours',
  victory: 'Victoire',
  defeat: 'Défaite',
};

function pageTitle(name) {
  return PAGE_TITLES[name] || name.charAt(0).toUpperCase() + name.slice(1);
}

// --- A real page per day, under views/pages/days ---
// Each day gets its own actual .hbs file, e.g. views/pages/days/11-06.hbs
// -> routed to /day/11-06, the same way views/pages are routed.
// The file for "today" (per getCurrentDate(), which TEST_DATE_OVERRIDE can
// redirect) is created automatically the first time it's requested, so every
// day is backed by a real, inspectable template rather than one generic
// catch-all view.
const DAY_PAGE_TEMPLATE = `<section>
  <h1>La page du jour</h1>
  <p>Cette page a été générée pour le <strong>{{date}}</strong>.</p>
  <p id="day-greeting"></p>
  <p><a href="/">Retour à l'accueil</a></p>
</section>
`;

function ensureDayPageExists(dateSlug) {
  fs.mkdirSync(DAYS_DIR, { recursive: true });
  const filePath = path.join(DAYS_DIR, `${dateSlug}.hbs`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, DAY_PAGE_TEMPLATE);
  }
  return filePath;
}

function getDayPageNames() {
  fs.mkdirSync(DAYS_DIR, { recursive: true });
  return fs
    .readdirSync(DAYS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.hbs'))
    .map((entry) => path.basename(entry.name, '.hbs'));
}

// Make sure today's real page file exists before routes are registered.
ensureDayPageExists(formatDateSlug(getCurrentDate()));

// All day pages that exist on disk, sorted. Used both to register /day/*
// routes below and to list them on the "days" page, so that page never
// needs to be updated by hand as new days are added.
const dayPageNames = getDayPageNames().sort();

pageNames.forEach((name) => {
  const routePath = name === 'home' ? '/' : `/${name}`;

  app.get(routePath, (req, res) => {
    res.render(`pages/${name}`, {
      title: pageTitle(name),
      pageName: name,
      pages: pageNames, // handy for building nav links in header partial
      days: dayPageNames, // all day pages that exist on disk, so this list stays in sync automatically
      formsByName: formsByPage[name] || {},
      todayDateSlug: formatDateSlug(getCurrentDate()),
      testDateOverride: TEST_DATE_OVERRIDE || '',
      // The victory page reads these to greet the player by the value and
      // award their game passed along when it redirected here — see
      // SiteGameUI.goToVictory() in public/js/site-game-ui.js. Harmless on
      // every other page, which simply has no `value`/`award` to render.
      value: req.query.value || '',
      award: req.query.award || '',
    });
  });

  // Also expose /home even when it's mapped to "/" so both work.
  if (name === 'home') {
    app.get('/home', (req, res) => res.redirect('/'));
  }
});

// --- A real page per day, under views/pages/days ---
// (day page files + dayPageNames are computed above, before pageNames.forEach,
// so every page's render context — including the "days" listing page — can
// include the up-to-date list of days.)
dayPageNames.forEach((dateSlug) => {
  app.get(`/day/${dateSlug}`, (req, res) => {
    // A day's real content is only shown on its actual date (per
    // getCurrentDate()/TEST_DATE_OVERRIDE) — visiting another day's page
    // directly (e.g. a future day whose file already exists in the repo, or
    // a past day after it's gone by) shows the same "not available" message
    // as a date with no page file at all. ?date=true skips this
    // check entirely, showing the page regardless of the actual date.
    const skipDateCheck = req.query?.date === 'true';
    if (!skipDateCheck && dateSlug !== formatDateSlug(getCurrentDate())) {
      return res.status(404).render('day-unavailable', {
        title: 'Page non disponible',
        pages: pageNames,
        date: dateSlug,
      });
    }

    res.render(`pages/days/${dateSlug}`, {
      title: `Jour ${dateSlug}`,
      pageName: 'day',
      pages: pageNames,
      date: dateSlug,
      formsByName: formsByPage[dateSlug] || {},
      testDateOverride: TEST_DATE_OVERRIDE || '',
    });
  });
});

// Any date that doesn't have a real page file yet is simply not available.
app.get('/day/:date', (req, res) => {
  res.status(404).render('day-unavailable', {
    title: 'Page non disponible',
    pages: pageNames,
    date: req.params.date,
  });
});

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: 'Introuvable',
    pages: pageNames,
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Routes created from views/pages: ${pageNames.join(', ')}`);
  });
}

module.exports = { app, pageNames, dayPageNames, getCurrentDate, formatDateSlug };
