// Reusable drag-and-drop "sort the valid objects" game.
//
// Any element opting in with `data-js="drop-game"` becomes playable — no
// per-page JS required. The objects (and which ones are valid) are declared
// right on the page as child elements, so several pages can reuse this same
// script with different sets of objects.
//
// Dragging is implemented with Pointer Events (not the HTML5 Drag and Drop
// API) so objects can be freely picked up with the mouse (or touch/pen),
// moved anywhere to reorganize them, and dropped — including onto the box.
//
// Expected markup inside the container:
//   data-drop-field      the positioned area the objects float/move inside
//   data-drop-target     the drop box objects get dragged into
//   data-drop-object      (one per movable object), each with:
//                          data-drop-valid="true" | "false"
//   data-drop-status     status text (success / fail / win / lose)
//
// Each object is given a randomized float speed, delay and bob height on
// load (via --float-duration/--float-delay/--float-distance CSS custom
// properties, consumed by the `drop-object-float` keyframes in main.scss)
// so a group of them doesn't hover in lockstep.
//
// Optional attributes on the container:
//   data-drop-max-mistakes   wrong drops allowed before losing (default 3)
//   data-drop-storage-key    key used to remember a loss so a page refresh
//                            can't be used to retry (defaults to
//                            `drop-game-<pageName>`, derived from the URL)
//                            — stored via the shared SiteCookie (see
//                            js/site-cookie.js), so this game's result lives
//                            alongside every other field in the site's one
//                            cookie.
//
// On a win (every valid object dropped), this shows `#drop-form-wrapper`
// (if present on the page) — the same way js/memory-game.js and
// js/hangman-game.js gate their "claim your win" form.
//
// On the configured number of wrong drops onto the box, the shared
// SiteCookie records `{ date, failed: true }` under this game's storage
// key. If that's already present on load, the game renders as already lost
// and dragging is disabled.
document.addEventListener('DOMContentLoaded', () => {
  const games = document.querySelectorAll('[data-js="drop-game"]');

  games.forEach((game) => {
    const field = game.querySelector('[data-drop-field]');
    const target = game.querySelector('[data-drop-target]');
    const status = game.querySelector('[data-drop-status]');
    const objects = [...game.querySelectorAll('[data-drop-object]')];
    if (!field || !target || objects.length === 0) return;

    const maxMistakes = parseInt(game.dataset.dropMaxMistakes, 10) || 3;
    const storageKey = game.dataset.dropStorageKey || `drop-game-${location.pathname}`;
    const totalValid = objects.filter((obj) => obj.dataset.dropValid === 'true').length;

    let matched = 0;
    let mistakes = 0;
    let over = false;
    let drag = null; // { obj, pointerId, offsetX, offsetY }

    objects.forEach((obj) => {
      // Remember where it started so a wrong drop on the box can bounce
      // back to it — free repositioning elsewhere in the field is kept.
      obj.dataset.homeLeft = obj.style.left;
      obj.dataset.homeTop = obj.style.top;

      obj.addEventListener('pointerdown', onPointerDown);
      obj.addEventListener('pointermove', onPointerMove);
      obj.addEventListener('pointerup', onPointerUp);
      obj.addEventListener('pointercancel', onPointerUp);

      randomizeFloat(obj);
    });

    if (window.SiteCookie.getGame(storageKey)) {
      over = true;
      lockObjects();
      setStatus('You already lost this game — come back another day to try again.');
      return;
    }

    setStatus(`Drag the ${totalValid} valid objects onto the box. ${maxMistakes} mistakes allowed.`);

    function onPointerDown(event) {
      const obj = event.currentTarget;
      if (over || obj.classList.contains('is-correct')) return;

      event.preventDefault();
      obj.setPointerCapture(event.pointerId);
      obj.classList.remove('is-returning');
      obj.classList.add('is-dragging');

      const objRect = obj.getBoundingClientRect();
      drag = {
        obj,
        pointerId: event.pointerId,
        offsetX: event.clientX - objRect.left,
        offsetY: event.clientY - objRect.top,
      };
    }

    function onPointerMove(event) {
      if (!drag || drag.obj !== event.currentTarget || drag.pointerId !== event.pointerId) return;

      const fieldRect = field.getBoundingClientRect();
      const objRect = drag.obj.getBoundingClientRect();

      let left = event.clientX - fieldRect.left - drag.offsetX;
      let top = event.clientY - fieldRect.top - drag.offsetY;

      // Keep the object inside the playing field while it's being moved.
      left = Math.max(0, Math.min(left, fieldRect.width - objRect.width));
      top = Math.max(0, Math.min(top, fieldRect.height - objRect.height));

      drag.obj.style.left = `${(left / fieldRect.width) * 100}%`;
      drag.obj.style.top = `${(top / fieldRect.height) * 100}%`;

      target.classList.toggle('is-dragover', isOverBox(drag.obj));
    }

    function onPointerUp(event) {
      if (!drag || drag.obj !== event.currentTarget || drag.pointerId !== event.pointerId) return;

      const obj = drag.obj;
      obj.releasePointerCapture(event.pointerId);
      obj.classList.remove('is-dragging');
      target.classList.remove('is-dragover');
      drag = null;

      if (isOverBox(obj)) {
        if (obj.dataset.dropValid === 'true') {
          onCorrect(obj);
        } else {
          onWrong(obj);
        }
      }
      // Dropped somewhere other than the box: leave it wherever the mouse
      // put it, so objects can be freely reorganized across the field.
    }

    function isOverBox(obj) {
      const boxRect = target.getBoundingClientRect();
      const objRect = obj.getBoundingClientRect();
      const centerX = objRect.left + objRect.width / 2;
      const centerY = objRect.top + objRect.height / 2;
      return (
        centerX >= boxRect.left &&
        centerX <= boxRect.right &&
        centerY >= boxRect.top &&
        centerY <= boxRect.bottom
      );
    }

    function onCorrect(obj) {
      obj.classList.add('is-correct');
      matched += 1;
      setStatus(`Correct! ${matched} / ${totalValid} found.`);

      if (matched === totalValid) {
        onWin();
      }
    }

    function onWrong(obj) {
      mistakes += 1;
      obj.classList.add('is-wrong', 'is-returning');
      obj.style.left = obj.dataset.homeLeft;
      obj.style.top = obj.dataset.homeTop;
      setStatus(`Not one of them — back it goes. ${Math.max(maxMistakes - mistakes, 0)} mistakes left.`);
      setTimeout(() => obj.classList.remove('is-wrong', 'is-returning'), 400);

      if (mistakes >= maxMistakes) {
        onLose();
      }
    }

    function onWin() {
      over = true;
      setStatus('You found every valid object! 🎉');
      lockObjects();

      const formWrapper = document.getElementById('drop-form-wrapper');
      if (formWrapper) {
        formWrapper.hidden = false;
      }

      game.dispatchEvent(new CustomEvent('drop-game:won', { bubbles: true }));
    }

    function onLose() {
      over = true;
      setStatus(`Out of chances — you lost this time.`);
      lockObjects();
      window.SiteCookie.setGame(storageKey, { date: todaySlug(), failed: true });
      game.dispatchEvent(new CustomEvent('drop-game:lost', { bubbles: true }));
    }

    function lockObjects() {
      objects.forEach((obj) => {
        obj.style.touchAction = '';
        obj.classList.add('is-locked');
      });
    }

    function setStatus(message) {
      if (status) status.textContent = message;
    }
  });

  // Gives each object its own bob speed, delay and height so a group of
  // them doesn't float up and down in lockstep — driven by CSS custom
  // properties consumed by the `drop-object-float` keyframes in main.scss.
  function randomizeFloat(obj) {
    const duration = (2.5 + Math.random() * 2).toFixed(2); // 2.5s–4.5s
    const delay = (Math.random() * -4).toFixed(2); // negative = starts mid-cycle
    const distance = (6 + Math.random() * 10).toFixed(1); // 6px–16px
    obj.style.setProperty('--float-duration', `${duration}s`);
    obj.style.setProperty('--float-delay', `${delay}s`);
    obj.style.setProperty('--float-distance', `${distance}px`);
  }

  function todaySlug() {
    const override = document.body.dataset.testDateOverride;
    const date = override ? new Date(`${override}T00:00:00`) : new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  }
});
