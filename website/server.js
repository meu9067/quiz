const path = require('path');
const fs = require('fs');
const express = require('express');
const { engine } = require('express-handlebars');

const formsConfig = require('./config/forms');

const app = express();
const PORT = process.env.PORT || 3000;

// --- "Today" used to build the /day/<date> link ---
// Set this to a string like '2026-12-25' to manually test a different day
// without waiting for the real date to change. Set back to null to use the
// real current date.
const TEST_DATE_OVERRIDE = null;

function getCurrentDate() {
  return TEST_DATE_OVERRIDE ? new Date(`${TEST_DATE_OVERRIDE}T00:00:00`) : new Date();
}

function formatDateSlug(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

pageNames.forEach((name) => {
  const routePath = name === 'home' ? '/' : `/${name}`;

  app.get(routePath, (req, res) => {
    res.render(`pages/${name}`, {
      title: name.charAt(0).toUpperCase() + name.slice(1),
      pageName: name,
      pages: pageNames, // handy for building nav links in header partial
      formsByName: formsByPage[name] || {},
      todayDateSlug: formatDateSlug(getCurrentDate()),
    });
  });

  // Also expose /home even when it's mapped to "/" so both work.
  if (name === 'home') {
    app.get('/home', (req, res) => res.redirect('/'));
  }
});

// --- A real page per day, under views/pages/days ---
// Each day gets its own actual .hbs file, e.g. views/pages/days/2026-11-06.hbs
// -> routed to /day/2026-11-06, the same way views/pages are routed.
// The file for "today" (per getCurrentDate(), which TEST_DATE_OVERRIDE can
// redirect) is created automatically the first time it's requested, so every
// day is backed by a real, inspectable template rather than one generic
// catch-all view.
const DAY_PAGE_TEMPLATE = `<section>
  <h1>Today's page</h1>
  <p>This page was generated for <strong>{{date}}</strong>.</p>
  <p id="day-greeting"></p>
  <p><a href="/">Back home</a></p>
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

const dayPageNames = getDayPageNames();

dayPageNames.forEach((dateSlug) => {
  app.get(`/day/${dateSlug}`, (req, res) => {
    res.render(`pages/days/${dateSlug}`, {
      title: `Day ${dateSlug}`,
      pageName: 'day',
      pages: pageNames,
      date: dateSlug,
      formsByName: formsByPage[dateSlug] || {},
    });
  });
});

// Any date that doesn't have a real page file yet is simply not available.
app.get('/day/:date', (req, res) => {
  res.status(404).render('day-unavailable', {
    title: 'Page not available',
    pages: pageNames,
    date: req.params.date,
  });
});

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: 'Not Found',
    pages: pageNames,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Routes created from views/pages: ${pageNames.join(', ')}`);
});
