// Shared "unlock the win form" effect used by every day-game.
//
// Each game (hangman, memory, drop-game) gates a `{{> form ...}}` behind
// winning, in an element following the `#<game>-form-wrapper` convention
// (e.g. `#hangman-form-wrapper`). Rather than every game re-implementing
// the same "find it and unhide it" lookup, they all call
// `SiteGameUI.revealWinForm('<game>')` on a win.
window.SiteGameUI = (function () {
  return {
    revealWinForm(gameName) {
      const formWrapper = document.getElementById(`${gameName}-form-wrapper`);
      if (formWrapper) {
        formWrapper.hidden = false;
      }
    },
  };
})();
