// Reusable Hangman game.
//
// Any element opting in with `data-js="hangman-game"` becomes a playable
// hangman game — no per-page JS required. The word to guess is declared
// right on the page via `data-hangman-word`, so several pages can reuse
// this same script with different words.
//
// Required child elements inside the container:
//   data-hangman-word-display   where the blanked-out word is rendered
//   data-hangman-keyboard       where the letter buttons get built
//   data-hangman-status         status text (chances left / win / lose)
// Optional:
//   data-hangman-image           <img> swapped for a new stage per mistake
//
// Optional attributes on the container:
//   data-hangman-max-mistakes   number of wrong guesses allowed (default 4)
//   data-hangman-storage-key    key used to remember a loss so a page
//                               refresh can't be used to retry (defaults to
//                               `hangman-<word>`) — stored via the shared
//                               SiteCookie (see js/site-cookie.js), so this
//                               game's result lives alongside every other
//                               field in the site's one cookie.
//
// On a win, this shows `#hangman-form-wrapper` (if present on the page) —
// the same way js/memory-game.js gates its "claim your win" form behind
// completing the game.
//
// On the fourth (or configured) mistake, the shared SiteCookie records
// `{ date, failed: true }` under this game's storage key. If that's already
// present on load, the game renders as already lost and the keyboard stays
// disabled — refreshing the page does not grant a new attempt.
document.addEventListener('DOMContentLoaded', () => {
  const games = document.querySelectorAll('[data-js="hangman-game"]');

  const STAGE_IMAGES = [
    '/images/hangman/PAPI-1.png',
    '/images/hangman/PAPI-2.png',
    '/images/hangman/PAPI-3.png',
    '/images/hangman/PAPI-4.png',
    '/images/hangman/PAPI-5.png',
  ];

  // Keep in sync with the CSS duration for `.is-last-chance` (glimmer) in
  // scss/components/_hangman-game.scss.
  const JEWEL_GLIMMER_MS = 900;

  games.forEach((game) => {
    const word = (game.dataset.hangmanWord || '').trim().toUpperCase();
    const wordDisplay = game.querySelector('[data-hangman-word-display]');
    const keyboard = game.querySelector('[data-hangman-keyboard]');
    const status = game.querySelector('[data-hangman-status]');
    const image = game.querySelector('[data-hangman-image]');
    const jewel = game.querySelector('[data-hangman-jewel]');
    if (!word || !wordDisplay || !keyboard) return;

    const maxMistakes = parseInt(game.dataset.hangmanMaxMistakes, 10) || 4;
    const storageKey = game.dataset.hangmanStorageKey || `hangman-${word}`;

    const guessed = new Set();
    let mistakes = 0;
    let over = false;

    buildKeyboard();

    const savedLoss = window.SiteCookie.getGame(storageKey);
    if (savedLoss) {
      over = true;
      revealWord();
      setImage(maxMistakes);
      setStatus(`You already lost this game — the word was "${word}". Come back another day to try again.`);
      disableKeyboard();
      return;
    }

    renderWord();
    setStatus(`${maxMistakes} chances left.`);
    setImage(0);

    function buildKeyboard() {
      keyboard.innerHTML = '';
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((letter) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'hangman-key';
        btn.textContent = letter;
        btn.addEventListener('click', () => onGuess(letter, btn));
        keyboard.appendChild(btn);
      });
    }

    function onGuess(letter, btn) {
      if (over || guessed.has(letter)) return;

      guessed.add(letter);
      btn.disabled = true;

      if (word.includes(letter)) {
        btn.classList.add('is-correct');
        renderWord();

        if (isWordComplete()) {
          onWin();
        }
      } else {
        btn.classList.add('is-wrong');
        mistakes += 1;

        if (mistakes >= maxMistakes) {
          disableKeyboard();
          playLossSequence();
        } else {
          setImage(mistakes);
          setStatus(`${maxMistakes - mistakes} chances left.`);
        }
      }
    }

    function isWordComplete() {
      return word.split('').every((letter) => guessed.has(letter));
    }

    function renderWord() {
      wordDisplay.textContent = word
        .split('')
        .map((letter) => (guessed.has(letter) ? letter : '_'))
        .join(' ');
    }

    function revealWord() {
      wordDisplay.textContent = word.split('').join(' ');
    }

    function onWin() {
      over = true;
      setStatus('You win! 🎉');
      disableKeyboard();

      const formWrapper = document.getElementById('hangman-form-wrapper');
      if (formWrapper) {
        formWrapper.hidden = false;
      }

      game.dispatchEvent(new CustomEvent('hangman-game:won', { bubbles: true }));
    }

    function onLose() {
      over = true;
      revealWord();
      setStatus(`You lost! The word was "${word}".`);
      disableKeyboard();
      window.SiteCookie.setGame(storageKey, { date: todaySlug(), failed: true });
      game.dispatchEvent(new CustomEvent('hangman-game:lost', { bubbles: true }));
    }

    // Plays the glimmer on the jewel at the same moment the final stage
    // image appears, then wraps up the loss once the glimmer finishes.
    function playLossSequence() {
      setImage(mistakes);

      if (jewel) {
        jewel.classList.add('is-last-chance');
      }

      window.setTimeout(() => {
        if (jewel) {
          jewel.classList.remove('is-last-chance');
        }
        onLose();
      }, JEWEL_GLIMMER_MS);
    }

    function disableKeyboard() {
      keyboard.querySelectorAll('button').forEach((btn) => {
        btn.disabled = true;
      });
    }

    function setImage(stage) {
      if (!image) return;
      image.src = STAGE_IMAGES[Math.min(stage, STAGE_IMAGES.length - 1)];
      image.alt = `Hangman stage ${stage} of ${maxMistakes}`;
    }

    function setStatus(message) {
      if (status) status.textContent = message;
    }
  });

  // Mirrors the override read by js/main.js so a game lost "today" stays
  // lost for the same overridden day during testing.
  function todaySlug() {
    const override = document.body.dataset.testDateOverride;
    const date = override ? new Date(`${override}T00:00:00`) : new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  }
});
