// Vanilla JS memory-matching game.
//
// Any element opting in with `data-js="memory-game"` gets a 4x4 grid (8
// pairs) of flippable cards built and wired up automatically — no per-page
// JS required. Grid markup lives in a child element marked
// `data-memory-grid`, and status text is written to `[data-memory-status]`
// inside the same container.
//
// Optional `data-memory-pairs="8"` on the container controls how many pairs
// are dealt (defaults to 8, filling a 4x4 grid of 16 cards).
//
// On a full match, this shows `#memory-form-wrapper` (if present on the
// page) so a page can gate a form — e.g. "claim your win" — behind
// completing the game, the same way js/forms.js gates success messaging
// behind valid input.
document.addEventListener('DOMContentLoaded', () => {
  const games = document.querySelectorAll('[data-js="memory-game"]');

  const SYMBOLS = ['🍎', '🍌', '🍇', '🍉', '🍒', '🍑', '🍍', '🥝', '🍋', '🍓'];

  games.forEach((game) => {
    const grid = game.querySelector('[data-memory-grid]');
    const status = game.querySelector('[data-memory-status]');
    if (!grid) return;

    const pairCount = Math.min(
      parseInt(game.dataset.memoryPairs, 10) || 8,
      SYMBOLS.length
    );

    const deck = shuffle([...SYMBOLS.slice(0, pairCount), ...SYMBOLS.slice(0, pairCount)]);

    let firstCard = null;
    let secondCard = null;
    let lockBoard = false;
    let matchedCount = 0;

    grid.innerHTML = '';
    deck.forEach((value) => grid.appendChild(createCard(value)));
    setStatus(`0 / ${pairCount} paires trouvées`);

    function createCard(value) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'memory-card';
      card.dataset.value = value;
      card.setAttribute('aria-label', 'Carte mémoire, face cachée');
      card.innerHTML = `
        <span class="memory-card__face memory-card__face--back" aria-hidden="true">?</span>
        <span class="memory-card__face memory-card__face--front" aria-hidden="true">${value}</span>
      `;
      card.addEventListener('click', () => onCardClick(card));
      return card;
    }

    function onCardClick(card) {
      if (lockBoard || card === firstCard || card.classList.contains('is-matched')) return;

      card.classList.add('is-flipped');

      if (!firstCard) {
        firstCard = card;
        return;
      }

      secondCard = card;
      lockBoard = true;

      if (firstCard.dataset.value === secondCard.dataset.value) {
        firstCard.classList.add('is-matched');
        secondCard.classList.add('is-matched');
        matchedCount += 1;
        setStatus(`${matchedCount} / ${pairCount} paires trouvées`);
        resetTurn();

        if (matchedCount === pairCount) {
          onWin();
        }
      } else {
        setTimeout(() => {
          firstCard.classList.remove('is-flipped');
          secondCard.classList.remove('is-flipped');
          resetTurn();
        }, 700);
      }
    }

    function resetTurn() {
      firstCard = null;
      secondCard = null;
      lockBoard = false;
    }

    function onWin() {
      setStatus(`Tu as trouvé les ${pairCount} paires ! 🎉`);

      window.SiteGameUI.revealWinForm('memory');

      game.dispatchEvent(new CustomEvent('memory-game:won', { bubbles: true }));
    }

    function setStatus(message) {
      if (status) status.textContent = message;
    }
  });

  function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
});
