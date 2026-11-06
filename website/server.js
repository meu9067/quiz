const path = require('path');
const fs = require('fs');
const express = require('express');
const { engine } = require('express-handlebars');

const formsConfig = require('./config/forms');

const app = express();
const PORT = process.env.PORT || 3000;

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
    .readdirSync(PAGES_DIR)
    .filter((file) => file.endsWith('.hbs'))
    .map((file) => path.basename(file, '.hbs'));
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
    });
  });

  // Also expose /home even when it's mapped to "/" so both work.
  if (name === 'home') {
    app.get('/home', (req, res) => res.redirect('/'));
  }
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
