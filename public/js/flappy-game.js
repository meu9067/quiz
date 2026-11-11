// Reusable Flappy-Bird-style game.
//
// Any element opting in with `data-js="flappy-game"` becomes playable — no
// per-page JS required. The game waits for a "Start" button press before
// anything moves; the bird is then flapped with a click/tap on the field,
// or the Space/Up Arrow keys. Gravity constantly pulls it down; flapping
// gives it a burst of upward velocity — classic "flappy" physics, driven by
// a requestAnimationFrame loop rather than CSS animations, since obstacles
// are spawned procedurally and collisions need to be checked every frame.
//
// Expected markup inside the container:
//   data-flappy-start   button that kicks off the first run
//   data-flappy-field   the fixed-size viewport everything is drawn in
//   data-flappy-bird     the bird element (flapped up, falls with gravity)
//   data-flappy-goal     the finish-line element revealed once in range
//   data-flappy-status  status text (progress / mid-run retry)
//   data-flappy-alert   a distinct, more prominent message shown only once
//                       the game is over for good (win or final loss) —
//                       kept separate from data-flappy-status so a loss is
//                       impossible to miss even if the status line is easy
//                       to skim past.
//
// Mountains (the obstacles to avoid) and clouds (purely decorative, no
// collision, drifting past slower than the mountains for a bit of depth)
// are created and removed by this script — no obstacle markup is needed on
// the page.
//
// A collision briefly freezes the bird in place and flashes it/the field
// red (`.is-hit`, see scss/components/_flappy-game.scss) before the run
// resets or the game locks for good — long enough (HIT_PAUSE_MS) to
// actually register as a hit rather than silently resetting.
//
// Optional attributes on the container:
//   data-flappy-max-losses     collisions allowed before losing for good
//                              (default 3) — each one short of that resets
//                              the bird to the start to try the run again.
//   data-flappy-goal-distance  world distance (px) to the goal/finish line
//                              (default 4000)
//   data-flappy-storage-key    key used to remember a loss so a page
//                              refresh can't be used to retry (defaults to
//                              `flappy-<path>`, derived from the URL,
//                              matching the `<game>-<date>` scheme used by
//                              js/hangman-game.js and js/drop-game.js) —
//                              stored via the shared SiteCookie (see
//                              js/site-cookie.js), so this game's result
//                              lives alongside every other field in the
//                              site's one cookie.
//
// On a win (the goal is reached), this shows `#flappy-form-wrapper` (if
// present on the page) — the same way js/memory-game.js, js/hangman-game.js
// and js/drop-game.js gate their "claim your win" form.
//
// On the configured number of collisions, the shared SiteCookie records
// `{ date, failed: true }` under this game's storage key. If that's already
// present on load, the game renders as already lost and the field stays
// frozen — refreshing the page does not grant a new attempt.
document.addEventListener('DOMContentLoaded', () => {
  const games = document.querySelectorAll('[data-js="flappy-game"]');

  const GRAVITY = 1400; // px/s^2
  const FLAP_VELOCITY = -440; // px/s, upward
  const MAX_FALL_SPEED = 700; // px/s
  const SPEED = 130; // world-scroll speed, px/s

  const MOUNTAIN_SPACING = 320; // px of world distance between mountains
  const MOUNTAIN_WIDTH = 70; // px — keep in sync with .flappy-mountain's width
  const MOUNTAIN_MIN_HEIGHT = 90; // px, measured up from the field's floor
  const MOUNTAIN_MAX_HEIGHT = 220; // px

  // Clouds drift at a fraction of the mountains' speed (parallax, like
  // they're further in the background) and never collide with the bird —
  // they're purely decorative.
  const CLOUD_PARALLAX = 0.4;
  const CLOUD_SPACING = 260; // px of (slowed) cloud-world distance apart
  const CLOUD_SPACING_JITTER = 160;

  // How long a hit "freezes" the game (bird stays put, field/bird flash)
  // before the run resets (or the final loss is locked in) — without this,
  // a collision resets everything in the very same frame it happens in,
  // which is too fast to actually notice.
  const HIT_PAUSE_MS = 500;

  games.forEach((game) => {
    const field = game.querySelector('[data-flappy-field]');
    const bird = game.querySelector('[data-flappy-bird]');
    const goal = game.querySelector('[data-flappy-goal]');
    const status = game.querySelector('[data-flappy-status]');
    const alertEl = game.querySelector('[data-flappy-alert]');
    const startButton = game.querySelector('[data-flappy-start]');
    if (!field || !bird) return;

    const maxLosses = parseInt(game.dataset.flappyMaxLosses, 10) || 3;
    const goalDistance = parseInt(game.dataset.flappyGoalDistance, 10) || 4000;
    const storageKey = game.dataset.flappyStorageKey || `flappy-${location.pathname}`;

    let losses = 0;
    let over = false;
    let started = false;

    if (window.SiteCookie.getGame(storageKey)) {
      over = true;
      setStatus("Tu as déjà perdu cette partie — reviens un autre jour pour réessayer.");
      showAlert('is-lost', 'Partie déjà perdue — reviens un autre jour pour réessayer.');
      if (startButton) startButton.disabled = true;
      window.SitePageFade.fadeOut();
      return;
    }

    const birdX = parseInt(bird.style.left, 10) || 80;
    const birdSize = bird.offsetWidth || 36;

    let fieldWidth = field.clientWidth;
    let fieldHeight = field.clientHeight;

    let distance = 0;
    let cloudDistance = 0;
    let birdY = fieldHeight / 2;
    let velocity = 0;
    let mountains = []; // { worldX, height, el }
    let clouds = []; // { worldX, el, width }
    let nextMountainWorldX = MOUNTAIN_SPACING;
    let nextCloudWorldX = 0;
    let rafId = null;
    let lastTime = null;

    setStatus(`Clique sur « Commencer » pour jouer. Survole les montagnes et atteins le drapeau. ${maxLosses} vies.`);

    if (startButton) {
      startButton.addEventListener('click', () => {
        if (over || started) return;
        started = true;
        startButton.disabled = true;
        startButton.hidden = true;
        setStatus(`Survole les montagnes et atteins le drapeau. ${maxLosses} vies.`);
        startRun();
      });
    } else {
      // No start button on the page: fall back to starting right away.
      started = true;
      startRun();
    }

    field.addEventListener('pointerdown', flap);
    document.addEventListener('keydown', onKeyDown);

    function onKeyDown(event) {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        flap();
      }
    }

    function flap() {
      if (over || !started) return;
      velocity = FLAP_VELOCITY;
    }

    function startRun() {
      distance = 0;
      cloudDistance = 0;
      birdY = fieldHeight / 2;
      velocity = 0;
      nextMountainWorldX = MOUNTAIN_SPACING;
      nextCloudWorldX = 0;
      mountains.forEach((mountain) => mountain.el.remove());
      mountains = [];
      clouds.forEach((cloud) => cloud.el.remove());
      clouds = [];
      if (goal) goal.style.transform = `translateX(${fieldWidth}px)`;
      field.classList.remove('is-hit');
      bird.classList.remove('is-hit');

      lastTime = null;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(loop);
    }

    function loop(time) {
      if (over) return;

      if (lastTime === null) lastTime = time;
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      velocity = Math.min(velocity + GRAVITY * dt, MAX_FALL_SPEED);
      birdY += velocity * dt;
      distance += SPEED * dt;
      cloudDistance += SPEED * CLOUD_PARALLAX * dt;

      bird.style.top = `${birdY}px`;
      bird.style.transform = `rotate(${Math.max(-25, Math.min(75, velocity / 10))}deg)`;

      maybeSpawnMountain();
      updateMountains();
      maybeSpawnCloud();
      updateClouds();
      updateGoal();

      if (birdY <= 0 || birdY + birdSize >= fieldHeight) {
        onCollision();
        return;
      }

      if (checkMountainCollision()) {
        onCollision();
        return;
      }

      if (distance >= goalDistance) {
        onWin();
        return;
      }

      rafId = requestAnimationFrame(loop);
    }

    function maybeSpawnMountain() {
      if (distance + fieldWidth < nextMountainWorldX || nextMountainWorldX > goalDistance - MOUNTAIN_SPACING / 2) return;

      const height = MOUNTAIN_MIN_HEIGHT + Math.random() * (MOUNTAIN_MAX_HEIGHT - MOUNTAIN_MIN_HEIGHT);

      const el = document.createElement('div');
      el.className = 'flappy-mountain';
      el.style.height = `${height}px`;
      field.appendChild(el);

      mountains.push({ worldX: nextMountainWorldX, height, el });
      nextMountainWorldX += MOUNTAIN_SPACING;
    }

    function updateMountains() {
      mountains = mountains.filter((mountain) => {
        const screenX = mountain.worldX - distance;
        if (screenX < -MOUNTAIN_WIDTH) {
          mountain.el.remove();
          return false;
        }
        mountain.el.style.transform = `translateX(${screenX}px)`;
        return true;
      });
    }

    function maybeSpawnCloud() {
      if (cloudDistance + fieldWidth < nextCloudWorldX) return;

      const width = 60 + Math.random() * 60;
      const top = 10 + Math.random() * Math.max(fieldHeight * 0.4, 20);

      const el = document.createElement('div');
      el.className = 'flappy-cloud';
      el.style.width = `${width}px`;
      el.style.top = `${top}px`;
      field.insertBefore(el, field.firstChild); // stays behind mountains/bird

      clouds.push({ worldX: nextCloudWorldX, el, width });
      nextCloudWorldX += CLOUD_SPACING + Math.random() * CLOUD_SPACING_JITTER;
    }

    function updateClouds() {
      clouds = clouds.filter((cloud) => {
        const screenX = cloud.worldX - cloudDistance;
        if (screenX < -cloud.width) {
          cloud.el.remove();
          return false;
        }
        cloud.el.style.transform = `translateX(${screenX}px)`;
        return true;
      });
    }

    function updateGoal() {
      if (!goal) return;
      const screenX = goalDistance - distance;
      goal.style.transform = `translateX(${screenX}px)`;
    }

    // The visual mountain is a triangle (full height only at its center,
    // tapering to 0 at both edges — see the clip-path in
    // scss/components/_flappy-game.scss), so collision needs to follow that
    // slope rather than treating the whole width as if it were as tall as
    // the peak — otherwise the bird can "collide" well to the side of the
    // mountain, where it's visually nowhere near it.
    const MOUNTAIN_COLLISION_SAMPLES = 6;

    function mountainSurfaceHeightAt(mountain, localX) {
      const half = MOUNTAIN_WIDTH / 2;
      const distanceFromPeak = Math.abs(localX - half);
      return Math.max(0, mountain.height * (1 - distanceFromPeak / half));
    }

    function checkMountainCollision() {
      return mountains.some((mountain) => {
        const screenX = mountain.worldX - distance;
        const overlapStart = Math.max(birdX, screenX);
        const overlapEnd = Math.min(birdX + birdSize, screenX + MOUNTAIN_WIDTH);
        if (overlapStart >= overlapEnd) return false; // no horizontal overlap at all

        // Sample a few points across the bird/mountain overlap and check
        // the actual slope height at each, instead of assuming the full
        // peak height across the entire width.
        for (let i = 0; i <= MOUNTAIN_COLLISION_SAMPLES; i += 1) {
          const sampleX = overlapStart + ((overlapEnd - overlapStart) * i) / MOUNTAIN_COLLISION_SAMPLES;
          const localX = sampleX - screenX;
          const surfaceHeight = mountainSurfaceHeightAt(mountain, localX);
          if (birdY + birdSize > fieldHeight - surfaceHeight) {
            return true;
          }
        }

        return false;
      });
    }

    function onCollision() {
      cancelAnimationFrame(rafId);
      losses += 1;

      // Freeze the bird right where it hit, and make the hit itself
      // unmistakable (red flash across the field, a shake on the bird)
      // before anything else happens.
      field.classList.add('is-hit');
      bird.classList.add('is-hit');

      if (losses >= maxLosses) {
        setStatus('Touché ! Plus de vies...');
        window.setTimeout(onLose, HIT_PAUSE_MS);
        return;
      }

      setStatus(`Touché ! ${maxLosses - losses} vies restantes — nouvelle tentative.`);
      window.setTimeout(startRun, HIT_PAUSE_MS);
    }

    function onWin() {
      over = true;
      cancelAnimationFrame(rafId);
      setStatus('Tu as atteint le drapeau ! 🎉');
      showAlert('is-won', 'Gagné ! Tu as atteint le drapeau. 🎉');

      window.SiteGameUI.revealWinForm('flappy');

      game.dispatchEvent(new CustomEvent('flappy-game:won', { bubbles: true }));
    }

    function onLose() {
      over = true;
      setStatus('Plus de vies — tu as perdu cette fois-ci.');
      showAlert('is-lost', 'Perdu ! Tu as utilisé tes 3 vies — reviens un autre jour pour réessayer.');
      window.SiteCookie.setGame(storageKey, { date: window.SiteDate.todaySlug(), failed: true });
      window.SitePageFade.fadeOut();
      game.dispatchEvent(new CustomEvent('flappy-game:lost', { bubbles: true }));
    }

    function setStatus(message) {
      if (status) status.textContent = message;
    }

    function showAlert(stateClass, message) {
      if (!alertEl) return;
      alertEl.textContent = message;
      alertEl.classList.remove('is-won', 'is-lost');
      alertEl.classList.add(stateClass);
      alertEl.hidden = false;
    }
  });
});
