// Generic form handler shared by every page.
//
// Any <form> that opts in with `data-js="form"` gets the same validation
// and success/error messaging, so individual pages only need to declare
// their own fields in markup — no per-page JS required.
//
// Supported attributes (all optional unless noted):
//   data-js="form"                 (required) opts the form into this handler
//   data-success-message="..."     message shown in the status element on success
//   data-error-message="..."       message shown in the status element on invalid input
//   data-status-target="#selector" explicit status element (defaults to the
//                                  closest [data-form-status] inside the form,
//                                  or an element with id `${form.id}-status`)
//
// Validation relies on native HTML5 constraints (required, type="email",
// minlength, pattern, etc.) declared directly on the fields.
//
// Some forms (e.g. a quiz) only count as "correct" when a specific option is
// picked. Mark that option's input with `data-correct="true"` (see the
// `radio` field type in views/partials/form.hbs) and this handler will treat
// any other choice in that input's name-group as a validation failure.
//
// A form can also persist a field's value as a top-level field in the
// shared site cookie on success by setting `data-save-cookie-field="<fieldName>"`
// on the <form> (driven by the `saveToCookie` config option — see
// config/forms.js). Storage goes through SiteCookie (see js/site-cookie.js)
// so this doesn't create its own cookie.
//
// A quiz-style form (one using `data-correct`) can also be limited to a
// number of wrong tries by setting `data-max-attempts="<n>"` on the <form>
// (driven by the `maxAttempts` config option — see config/forms.js). Once a
// wrong answer has been submitted more than `maxAttempts` times, the form
// locks: `data-lockout-message` (or `lockoutMessage` in config) is shown
// instead of the usual error, every field is disabled, the whole page dims
// (via js/site-page-fade.js, like js/hangman-game.js and js/drop-game.js do
// on a loss), and the shared SiteCookie records `{ date, failed: true }`
// under this form's storage key (`data-quiz-storage-key`, defaulting to the
// form's id). If that's already present on load, the form renders as
// already locked and a page refresh does not grant a new attempt.
document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('form[data-js="form"]');

  forms.forEach((form) => {
    const status = findStatusElement(form);
    const maxAttempts = parseInt(form.dataset.maxAttempts, 10) || null;
    const storageKey = form.dataset.quizStorageKey || form.id;
    let wrongAttempts = 0;

    if (maxAttempts && window.SiteCookie.getGame(storageKey)) {
      lockForm(form, status);
      window.SitePageFade.fadeOut();
      return;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        setStatus(
          status,
          form.dataset.errorMessage || 'Merci de corriger les champs en surbrillance et de réessayer.',
          'error'
        );
        return;
      }

      if (!hasCorrectAnswers(form)) {
        wrongAttempts += 1;

        if (maxAttempts && wrongAttempts > maxAttempts) {
          window.SiteCookie.setGame(storageKey, { date: window.SiteDate.todaySlug(), failed: true });
          lockForm(form, status);
          window.SitePageFade.fadeOut();
          form.dispatchEvent(new CustomEvent('form:locked', { bubbles: true, detail: { form } }));
          return;
        }

        setStatus(
          status,
          form.dataset.errorMessage || 'Cette réponse n\'est pas tout à fait bonne — réessaie.',
          'error'
        );
        return;
      }

      saveCookieField(form);

      setStatus(
        status,
        form.dataset.successMessage || 'Merci ! Ta soumission a bien été reçue.',
        'success'
      );
      form.reset();

      // Let page-specific code react to a successful submit (e.g. redirect,
      // send analytics) without having to duplicate validation logic.
      form.dispatchEvent(
        new CustomEvent('form:success', { bubbles: true, detail: { form } })
      );
    });
  });

  function lockForm(form, status) {
    setStatus(
      status,
      form.dataset.lockoutMessage || "Tu as utilisé ta tentative — reviens un autre jour pour réessayer.",
      'error'
    );
    [...form.elements].forEach((field) => {
      field.disabled = true;
    });
  }

  function hasCorrectAnswers(form) {
    const groupNames = new Set(
      [...form.querySelectorAll('[data-correct]')].map((el) => el.name)
    );

    for (const name of groupNames) {
      const checked = form.querySelector(`[name="${name}"]:checked`);
      if (!checked || checked.dataset.correct !== 'true') {
        return false;
      }
    }

    return true;
  }

  function saveCookieField(form) {
    const fieldName = form.dataset.saveCookieField;
    if (!fieldName) return;

    const field = form.elements.namedItem(fieldName);
    if (!field) return;

    window.SiteCookie.set(fieldName, field.value);
  }

  function findStatusElement(form) {
    if (form.dataset.statusTarget) {
      return document.querySelector(form.dataset.statusTarget);
    }
    return (
      form.querySelector('[data-form-status]') ||
      document.getElementById(`${form.id}-status`) ||
      null
    );
  }

  function setStatus(element, message, state) {
    if (!element) return;
    element.textContent = message;
    element.classList.remove('form-status--success', 'form-status--error');
    element.classList.add(state === 'error' ? 'form-status--error' : 'form-status--success');
  }
});
