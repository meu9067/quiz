# Website (Node + Express + Handlebars + SCSS + Vanilla JS)

## Structure

```
.
├── server.js                # Express app, dynamic page-folder routing
├── views/
│   ├── layouts/main.hbs     # Shared HTML shell (head, header/footer includes, scripts)
│   ├── partials/
│   │   ├── header.hbs       # Shared header on every page
│   │   └── footer.hbs       # Shared footer on every page
│   └── pages/               # Each .hbs file here becomes a route automatically
│       ├── home.hbs         # -> "/"
│       ├── about.hbs        # -> "/about"
│       ├── contact.hbs      # -> "/contact"
│       └── 404.hbs          # rendered for unmatched routes
├── scss/
│   └── main.scss            # Compiled to public/css/main.css
└── public/
    ├── css/main.css         # Generated, do not edit directly
    └── js/main.js           # Vanilla JS shared across pages
```

## How routing works

`server.js` reads every `.hbs` file in `views/pages/` at startup and creates a
GET route with the same name (`about.hbs` -> `/about`). `home.hbs` is special
cased to serve the root path `/`. To add a new page, just drop a new
`.hbs` file into `views/pages/` — no route code needed.

## Getting started

```bash
npm install

# build CSS once
npm run scss:build

# or watch SCSS while developing
npm run scss

# run the server (separate terminal)
npm run dev   # with nodemon
# or
npm start
```

Visit http://localhost:3000
