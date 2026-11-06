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
document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('form[data-js="form"]');

  forms.forEach((form) => {
    const status = findStatusElement(form);

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        setStatus(
          status,
          form.dataset.errorMessage || 'Please fix the highlighted fields and try again.',
          'error'
        );
        return;
      }

      if (!hasCorrectAnswers(form)) {
        setStatus(
          status,
          form.dataset.errorMessage || 'That answer is not quite right — try again.',
          'error'
        );
        return;
      }

      setStatus(
        status,
        form.dataset.successMessage || 'Thanks! Your submission has been received.',
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
