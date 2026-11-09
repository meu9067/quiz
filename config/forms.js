// Single source of truth for every form on the site.
//
// Add a new form by adding a key here — no other JS is needed. The page
// named in `page` gets this form available as `formsByName.<key>` in its
// template context (see server.js), ready to render with the shared
// `{{> form }}` partial (see views/partials/form.hbs).
//
// Field types supported by the partial: text, email, password, tel, number,
// textarea, select (needs `options: [{ value, label }]`), checkbox, radio
// (needs `options: [{ value, label, correct }]`), image (like radio, but each
// option also needs an `image` URL and renders as a picture to click instead
// of text — see views/partials/form.hbs).
// Field validation (required, minlength, pattern, min, max, etc.) maps
// straight to native HTML5 attributes, which js/forms.js relies on to
// validate.
//
// Optional `saveToCookie: '<fieldName>'` stores that field's value in a
// cookie of the same name once the form succeeds (see js/forms.js).
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

  nameForm: {
    page: 'home',
    submitLabel: 'Save',
    successMessage: 'Thanks! We will remember your name.',
    errorMessage: "Please enter your name.",
    // Stores the given field's value in a cookie of the same name once the
    // form succeeds — see `saveToCookie` handling in js/forms.js.
    saveToCookie: 'name',
    fields: [{ name: 'name', label: "What's your name?", type: 'text', required: true, minlength: 1 }],
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

  // Daily quizzes — each one lives on its own real day page under
  // views/pages/days/<date>.hbs. The `page` here is the date slug itself,
  // matching how server.js groups forms by page.
  dayQuiz1107: {
    page: '11-07',
    submitLabel: 'Submit answer',
    successMessage: "Correct! You nailed today's quiz.",
    errorMessage: 'Not quite — try again.',
    fields: [
      {
        name: 'choice',
        label: 'What is 2 + 2?',
        type: 'radio',
        required: true,
        options: [
          { value: 'a', label: '3' },
          { value: 'b', label: '4', correct: true },
          { value: 'c', label: '5' },
        ],
      },
    ],
  },

  dayQuiz1108: {
    page: '11-08',
    submitLabel: 'Submit answer',
    successMessage: 'Correct! Nicely done.',
    errorMessage: 'Not quite — give it another go.',
    fields: [
      {
        name: 'choice',
        label: 'Which planet is known as the Red Planet?',
        type: 'radio',
        required: true,
        options: [
          { value: 'a', label: 'Venus' },
          { value: 'b', label: 'Mars', correct: true },
          { value: 'c', label: 'Jupiter' },
        ],
      },
    ],
  },


  dayQuiz1106: {
    page: '11-06',
    submitLabel: 'Submit answer',
    successMessage: 'Correct! Nicely done.',
    errorMessage: 'Not quite — give it another go.',
    fields: [
      {
        name: 'choice',
        label: 'Which planet is known as the Red Planet?',
        type: 'image',
        required: true,
        options: [
          { value: 'a', label: 'Venus', image: '/images/quiz/venus.svg' },
          { value: 'b', label: 'Mars', image: '/images/quiz/mars.svg', correct: true },
          { value: 'c', label: 'Jupiter', image: '/images/quiz/jupiter.svg' },
        ],
      },
    ],
  },

  // Unlocked once the memory game on this day's page is fully solved — see
  // js/memory-game.js, which reveals the `#memory-form-wrapper` element
  // wrapping this form after all 8 pairs are matched.
  dayMemory1109: {
    page: '11-09',
    submitLabel: 'Claim your win',
    successMessage: 'Nicely played — your win has been recorded!',
    errorMessage: 'Please enter your name to claim your win.',
    fields: [{ name: 'playerName', label: 'Your name', type: 'text', required: true, minlength: 1 }],
  },

  // Unlocked once the hangman game on this day's page is won — see
  // js/hangman-game.js, which reveals the `#hangman-form-wrapper` element
  // wrapping this form once the word is fully guessed.
  dayHangman1110: {
    page: '11-10',
    submitLabel: 'Claim your win',
    successMessage: 'Nicely guessed — your win has been recorded!',
    errorMessage: 'Please enter your name to claim your win.',
    fields: [{ name: 'playerName', label: 'Your name', type: 'text', required: true, minlength: 1 }],
  },

  // Unlocked once the drag-and-drop game on this day's page is won — see
  // js/drop-game.js, which reveals the `#drop-form-wrapper` element wrapping
  // this form once all 5 valid objects have been dropped in the box.
  dayDrop1111: {
    page: '11-11',
    submitLabel: 'Claim your win',
    successMessage: 'Great sorting — your win has been recorded!',
    errorMessage: 'Please enter your name to claim your win.',
    fields: [{ name: 'playerName', label: 'Your name', type: 'text', required: true, minlength: 1 }],
  },
};
