// Fills in the shared victory page (views/pages/victory.hbs) client-side.
//
// SiteGameUI.goToVictory(value, award) (see site-game-ui.js) sends the
// player here as `/victory?value=...&award=...`. The award used to be
// rendered server-side from req.query (see server.js), but that doesn't
// work on the static/Cloudflare build — the pre-rendered `/victory` page
// has no query string available at build time. Reading it from
// window.location.search here instead works the same way on the live
// Express server and the static deploy.
export function initVictory() {
  const awardEl = document.getElementById('victory-award');
  if (!awardEl) return;

  const params = new URLSearchParams(window.location.search);
  awardEl.textContent = params.get('award') || '';
}

document.addEventListener('DOMContentLoaded', initVictory);
