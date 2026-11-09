// Vanilla JS entry point shared across all pages.
// Form validation/success handling now lives in js/forms.js, shared by every
// page's form via the `data-js="form"` convention — see that file.

// Reads the server's TEST_DATE_OVERRIDE (set via .env — see server.js),
// baked into the page as `data-test-date-override` on <body>. This keeps
// the override as a single source of truth: set it once in .env and both
// the server-rendered date and this "today" link follow it automatically.
// Empty/missing means "use the visitor's real current date".
function getTodayDateSlug() {
  const override = document.body.dataset.testDateOverride;
  const date = override ? new Date(`${override}T00:00:00`) : new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

document.addEventListener('DOMContentLoaded', () => {
  const demoBtn = document.getElementById('demo-btn');
  const demoOutput = document.getElementById('demo-output');

  if (demoBtn && demoOutput) {
    demoBtn.addEventListener('click', () => {
      demoOutput.textContent = `Clicked at ${new Date().toLocaleTimeString()}`;
    });
  }

  // Resolved here, in the browser, rather than baked in at build time — so
  // the link always points at whatever day it actually is for the visitor,
  // even on a static deploy that was built days ago.
  const todayLink = document.getElementById('today-link');

  if (todayLink) {
    todayLink.href = `/day/${getTodayDateSlug()}`;
  }

  const dayGreeting = document.getElementById('day-greeting');

  if (dayGreeting) {
    const name = window.SiteCookie.get('name');
    dayGreeting.textContent = name
      ? `Hello, ${name}! Enjoy today's page.`
      : "We don't know your name yet — set it on the home page for a personal greeting.";
  }

  const nameGreeting = document.getElementById('name-greeting');
  const nameFormWrapper = document.getElementById('name-form-wrapper');

  if (nameGreeting && nameFormWrapper) {
    showNameState();

    nameFormWrapper.addEventListener('form:success', (event) => {
      if (event.detail.form.id === 'nameForm-form') {
        showNameState();
      }
    });
  }

  function showNameState() {
    const name = window.SiteCookie.get('name');

    if (name) {
      nameGreeting.textContent = `Hello, ${name}!`;
      nameGreeting.hidden = false;
      nameFormWrapper.hidden = true;
    } else {
      nameGreeting.hidden = true;
      nameFormWrapper.hidden = false;
    }
  }
});
