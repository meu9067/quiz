// Shared "unlock the win form"/"go to the victory or defeat page" effects
// used by every day-game.
//
// Each game (hangman, memory, drop-game, flappy-game) gates a
// `{{> form ...}}` behind winning, in an element following the
// `#<game>-form-wrapper` convention (e.g. `#hangman-form-wrapper`). Rather
// than every game re-implementing the same "find it and unhide it" lookup,
// they all call `SiteGameUI.revealWinForm('<game>')` on a win.
//
// Once a game is actually over, it sends the player on to one of two
// shared pages (views/pages/victory.hbs / views/pages/defeat.hbs):
//   SiteGameUI.goToVictory(value, award) on a successful "claim your win" submit
//                                   — `value` (e.g. the player's name) and
//                                   `award` (the prize for this game) are
//                                   passed along as a query string and shown
//                                   back on the victory page.
//   SiteGameUI.goToDefeat()         on a loss, or when a page is visited
//                                   again after the game on it was already
//                                   lost.
export const SiteGameUI = {
  revealWinForm(gameName) {
    const formWrapper = document.getElementById(`${gameName}-form-wrapper`);
    if (formWrapper) {
      formWrapper.hidden = false;
    }
  },
  goToVictory(value, award) {
    const params = new URLSearchParams();
    if (value) params.set('value', value);
    if (award) params.set('award', award);
    const query = params.toString();
    window.location.href = `/victory${query ? `?${query}` : ''}`;
  },
  goToDefeat() {
    window.location.href = '/defeat';
  },
};
