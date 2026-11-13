// Vanilla JS entry point shared across all pages.
// Form validation/success handling now lives in js/forms.js, shared by every
// page's form via the `data-js="form"` convention — see that file.

import { SiteCookie } from './site-cookie.js';
import { SiteDate } from './site-date.js';

export function initMain() {
  // Resolved here, in the browser, rather than baked in at build time — so
  // the link always points at whatever day it actually is for the visitor,
  // even on a static deploy that was built days ago.
  const todayLink = document.getElementById('today-link');

  if (todayLink) {
    todayLink.href = `/day/${SiteDate.todaySlug()}`;
  }

  const dayGreeting = document.getElementById('day-greeting');

  if (dayGreeting) {
    const name = SiteCookie.get('name');
    dayGreeting.textContent = name
      ? `Salut, ${name} ! Profite bien de la page du jour.`
      : "On ne connaît pas encore ton prénom — renseigne-le sur la page d'accueil pour un message personnalisé.";
  }

  const nameGreeting = document.getElementById('name-greeting');
  const nameFormWrapper = document.getElementById('name-form-wrapper');

  const clearCookiesLink = document.getElementById('clear-cookies-link');

  if (clearCookiesLink) {
    clearCookiesLink.addEventListener('click', (event) => {
      event.preventDefault();
      SiteCookie.clearAllExceptName();
      window.location.reload();
    });
  }

  if (nameGreeting && nameFormWrapper) {
    showNameState();

    nameFormWrapper.addEventListener('form:success', (event) => {
      if (event.detail.form.id === 'nameForm-form') {
        showNameState();
      }
    });
  }

  function showNameState() {
    const name = SiteCookie.get('name');

    if (name) {
      nameGreeting.textContent = `Salut, ${name} !`;
      nameGreeting.hidden = false;
      nameFormWrapper.hidden = true;
    } else {
      nameGreeting.hidden = true;
      nameFormWrapper.hidden = false;
    }
  }
}

document.addEventListener('DOMContentLoaded', initMain);
