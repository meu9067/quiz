// Shared single-cookie storage for the whole site. Rather than every
// feature (the visitor's saved name, each day-game's win/loss) writing its
// own cookie, everything lives as fields inside one JSON-encoded cookie —
// so the site only ever sets one cookie, no matter how many forms or games
// use it.
//
// Shape of the stored JSON:
//   { "name": "Ada", "games": { "hangman-11-10": { date, failed }, ... } }
//
// Usage:
//   SiteCookie.get('name')                        -> top-level field, or null
//   SiteCookie.set('name', 'Ada')                  -> sets a top-level field
//   SiteCookie.getGame('hangman-11-10')            -> that game's result, or null
//   SiteCookie.setGame('hangman-11-10', { ... })   -> merges into `games`
//   SiteCookie.clearAllExceptName()                -> wipes everything but `name`
const COOKIE_NAME = 'site-data';
const ONE_YEAR = 60 * 60 * 24 * 365;

function readAll() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return {};

  try {
    return JSON.parse(decodeURIComponent(match[1])) || {};
  } catch (error) {
    return {};
  }
}

function writeAll(data) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(data))}; path=/; max-age=${ONE_YEAR}`;
}

export const SiteCookie = {
  get(key) {
    const data = readAll();
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
  },
  set(key, value) {
    const data = readAll();
    data[key] = value;
    writeAll(data);
  },
  getGame(key) {
    const games = readAll().games || {};
    return Object.prototype.hasOwnProperty.call(games, key) ? games[key] : null;
  },
  setGame(key, value) {
    const data = readAll();
    data.games = data.games || {};
    data.games[key] = value;
    writeAll(data);
  },
  clearAllExceptName() {
    const data = readAll();
    writeAll(data.name ? { name: data.name } : {});
  },
};
