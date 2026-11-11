// Shared "what day is it" helper for the whole site.
//
// Reads the server's TEST_DATE_OVERRIDE (set via .env — see server.js),
// baked into the page as `data-test-date-override` on <body>. This keeps
// the override as a single source of truth: set it once in .env and every
// date derived from it client-side (the "today" link, hangman/drop-game/
// quiz loss timestamps, etc.) follows it automatically. Empty/missing
// means "use the visitor's real current date".
window.SiteDate = (function () {
  return {
    todaySlug() {
      const override = document.body.dataset.testDateOverride;
      const date = override ? new Date(`${override}T00:00:00`) : new Date();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}-${day}`;
    },
  };
})();
