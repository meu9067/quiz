// Fills in the real requested date on the shared "day not available" page
// (views/day-unavailable.hbs) client-side.
//
// On the static/Cloudflare build, this page is pre-rendered once at build
// time for a placeholder date ("0000-00-00" — see scripts/build-static.js)
// and src/worker.js serves that same file for every unknown /day/<date>
// request, so the server-rendered {{date}} can't reflect the date the
// visitor actually asked for. Reading it from the URL path here instead
// works the same way on the live Express server (where {{date}} is already
// correct, so this just overwrites it with the same value) and the static
// deploy (where it fixes the placeholder).
export function initDayUnavailable() {
  const dateEl = document.getElementById('unavailable-date');
  if (!dateEl) return;

  const match = window.location.pathname.match(/^\/day\/([^/]+)\/?$/);
  if (match) {
    dateEl.textContent = match[1];
  }
}

document.addEventListener('DOMContentLoaded', initDayUnavailable);
