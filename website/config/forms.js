// Single source of truth for every form on the site.
//
// Add a new form by adding a key here — no other JS is needed. The page
// named in `page` gets this form available as `formsByName.<key>` in its
// template context (see server.js), ready to render with the shared
// `{{> form }}` partial (see views/partials/form.hbs).
//
// Field types supported by the partial: text, email, password, tel, number,
// textarea, select (needs `options: [{ value, label }]`), checkbox.
// Field validation (required, minlength, pattern, min, max, etc.) maps
// straight to native HTML5 attributes, which js/forms.js relies on to
// validate.
module.exports = {
  contact: {
    page: 'contact',
    submitLabel: 'Send',
    successMessage: 'Thanks! Your message has been sent.',
    errorMessage: 'Please fill in your name and a message before sending.',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, minlength: 2 },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'message', label: 'Message', type: 'textarea', rows: 4, required: true },
    ],
  },

  newsletter: {
    page: 'home',
    submitLabel: 'Subscribe',
    successMessage: "You're subscribed! Check your inbox for a confirmation.",
    errorMessage: 'Please enter a valid email address.',
    fields: [{ name: 'email', label: 'Email', type: 'email', required: true }],
  },

  signup: {
    page: 'signup',
    submitLabel: 'Create account',
    successMessage: 'Welcome aboard! Your account has been created.',
    errorMessage: 'Please check the highlighted fields — passwords must match and be at least 8 characters.',
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text', required: true, minlength: 2 },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true, minlength: 8 },
      { name: 'confirmPassword', label: 'Confirm password', type: 'password', required: true, minlength: 8 },
      { name: 'terms', label: 'I agree to the terms and conditions', type: 'checkbox', required: true },
    ],
  },

  feedback: {
    page: 'feedback',
    submitLabel: 'Submit feedback',
    successMessage: 'Thank you for your feedback!',
    errorMessage: 'Please select a rating and add a comment.',
    fields: [
      {
        name: 'rating',
        label: 'How would you rate your experience?',
        type: 'select',
        required: true,
        placeholder: 'Select a rating',
        options: [
          { value: '5', label: 'Excellent' },
          { value: '4', label: 'Good' },
          { value: '3', label: 'Average' },
          { value: '2', label: 'Poor' },
          { value: '1', label: 'Very poor' },
        ],
      },
      { name: 'comments', label: 'Comments', type: 'textarea', rows: 4, required: true },
    ],
  },

  booking: {
    page: 'booking',
    submitLabel: 'Book now',
    successMessage: 'Your booking request has been received — we will confirm shortly.',
    errorMessage: 'Please fill in your phone number and number of guests.',
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text', required: true, minlength: 2 },
      { name: 'phone', label: 'Phone number', type: 'tel', required: true, pattern: '[0-9+ ]{7,15}' },
      { name: 'guests', label: 'Number of guests', type: 'number', required: true, min: 1, max: 20 },
      { name: 'notes', label: 'Special requests', type: 'textarea', rows: 3 },
    ],
  },

  quiz: {
    page: 'quiz',
    submitLabel: 'Submit answer',
    successMessage: "Correct! That's the one.",
    errorMessage: 'Not quite — pick the middle option.',
    fields: [
      {
        name: 'choice',
        label: 'Which option is correct?',
        type: 'radio',
        required: true,
        options: [
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B', correct: true },
          { value: 'c', label: 'Option C' },
        ],
      },
    ],
  },
};
