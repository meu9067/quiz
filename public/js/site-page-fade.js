// Shared "dim the page" effect used by the day-games to mark a loss.
//
// Rather than each game re-implementing this, they all call
// `SitePageFade.fadeOut()` when the player loses. It's scoped to the
// top-level sections inside <main> (not <body>), so layout chrome like the
// header/footer stays at full opacity.
window.SitePageFade = (function () {
  return {
    fadeOut() {
      document.querySelectorAll('main > section').forEach((section) => {
        section.style.opacity = '0.5';
      });
    },
  };
})();
