// Vanilla JS entry point shared across all pages.
// Form validation/success handling now lives in js/forms.js, shared by every
// page's form via the `data-js="form"` convention — see that file.

// Set this to a string like '2026-12-25' to manually test the "today" link
// against a different date in the browser, without waiting for the real
// date to change. Set back to null to use the visitor's real current date.
const CLIENT_TEST_DATE_OVERRIDE = null;

function getTodayDateSlug() {
  const date = CLIENT_TEST_DATE_OVERRIDE
    ? new Date(`${CLIENT_TEST_DATE_OVERRIDE}T00:00:00`)
    : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    const name = getCookie('name');
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
    const name = getCookie('name');

    if (name) {
      nameGreeting.textContent = `Hello, ${name}!`;
      nameGreeting.hidden = false;
      nameFormWrapper.hidden = true;
    } else {
      nameGreeting.hidden = true;
      nameFormWrapper.hidden = false;
    }
  }

  function getCookie(key) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }
});
