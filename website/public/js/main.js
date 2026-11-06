// Vanilla JS entry point shared across all pages.
// Form validation/success handling now lives in js/forms.js, shared by every
// page's form via the `data-js="form"` convention — see that file.
document.addEventListener('DOMContentLoaded', () => {
  const demoBtn = document.getElementById('demo-btn');
  const demoOutput = document.getElementById('demo-output');

  if (demoBtn && demoOutput) {
    demoBtn.addEventListener('click', () => {
      demoOutput.textContent = `Clicked at ${new Date().toLocaleTimeString()}`;
    });
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
