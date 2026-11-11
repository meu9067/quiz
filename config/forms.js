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
//
// Quizzes (multiple-choice or image-choice, "pick the right answer") share
// one more behaviour: only one wrong try is allowed. A second miss locks the
// form, shows a final message, and records the loss in the shared cookie
// (see `maxAttempts`/`lockoutMessage` in js/forms.js) so refreshing the page
// doesn't grant a new attempt. `radioQuiz(...)` and `imageQuiz(...)` below
// build that whole form config from just a page, a question, and the
// options — to reuse the same quiz format on another page, add a new entry
// that calls one of them, e.g.:
//
//   dayQuiz1112: radioQuiz({
//     page: '11-12',
//     question: 'How many legs does a spider have?',
//     options: [
//       { value: 'a', label: '6' },
//       { value: 'b', label: '8', correct: true },
//       { value: 'c', label: '10' },
//     ],
//   }),
//
//   dayQuiz1113: imageQuiz({
//     page: '11-13',
//     question: 'Which one is the odd one out?',
//     options: [
//       { value: 'a', label: 'A', image: '/images/quiz/pic1.png' },
//       { value: 'b', label: 'B', image: '/images/quiz/pic2.png', correct: true },
//       { value: 'c', label: 'C', image: '/images/quiz/pic3.png' },
//     ],
//   }),
//
// Every option below the `page`/`question`/`options` can be left out to use
// the sensible default shown in each helper's signature.
function quiz(fieldType) {
  return ({
    page,
    question,
    options,
    storageKey,
    maxAttempts = 1,
    submitLabel = 'Valider la réponse',
    successMessage = 'Correct ! Bien joué.',
    errorMessage = 'Pas tout à fait — retente ta chance.',
    lockoutMessage = "Tu as utilisé ta tentative pour aujourd'hui — reviens un autre jour pour réessayer.",
  }) => ({
    page,
    submitLabel,
    successMessage,
    errorMessage,
    maxAttempts,
    lockoutMessage,
    // Keyed by page so the same question reused on two different pages
    // doesn't share a lockout — see data-quiz-storage-key in js/forms.js.
    // Follows the same `<game>-<date>` scheme used by js/hangman-game.js
    // and js/drop-game.js's storage keys.
    quizStorageKey: storageKey || `quiz-${page}`,
    fields: [
      {
        name: 'choice',
        label: question,
        type: fieldType,
        required: true,
        options,
      },
    ],
  });
}

const radioQuiz = quiz('radio');
const imageQuiz = quiz('image');

module.exports = {
  contact: {
    page: 'contact',
    submitLabel: 'Envoyer',
    successMessage: 'Merci ! Ton message a été envoyé.',
    errorMessage: 'Merci de renseigner ton nom et un message avant d\'envoyer.',
    fields: [
      { name: 'name', label: 'Nom', type: 'text', required: true, minlength: 2 },
      { name: 'email', label: 'E-mail', type: 'email', required: true },
      { name: 'message', label: 'Message', type: 'textarea', rows: 4, required: true },
    ],
  },

  newsletter: {
    page: 'home',
    submitLabel: "S'abonner",
    successMessage: 'Tu es abonné(e) ! Vérifie ta boîte mail pour confirmer.',
    errorMessage: 'Merci de saisir une adresse e-mail valide.',
    fields: [{ name: 'email', label: 'E-mail', type: 'email', required: true }],
  },

  nameForm: {
    page: 'home',
    submitLabel: 'Enregistrer',
    successMessage: 'Merci ! Nous retiendrons ton prénom.',
    errorMessage: "Merci de saisir ton prénom.",
    // Stores the given field's value in a cookie of the same name once the
    // form succeeds — see `saveToCookie` handling in js/forms.js.
    saveToCookie: 'name',
    fields: [{ name: 'name', label: "Quel est ton prénom ?", type: 'text', required: true, minlength: 1 }],
  },

  signup: {
    page: 'signup',
    submitLabel: 'Créer le compte',
    successMessage: 'Bienvenue ! Ton compte a été créé.',
    errorMessage: 'Merci de vérifier les champs en surbrillance — les mots de passe doivent correspondre et contenir au moins 8 caractères.',
    fields: [
      { name: 'fullName', label: 'Nom complet', type: 'text', required: true, minlength: 2 },
      { name: 'email', label: 'E-mail', type: 'email', required: true },
      { name: 'password', label: 'Mot de passe', type: 'password', required: true, minlength: 8 },
      { name: 'confirmPassword', label: 'Confirmer le mot de passe', type: 'password', required: true, minlength: 8 },
      { name: 'terms', label: "J'accepte les conditions générales", type: 'checkbox', required: true },
    ],
  },

  feedback: {
    page: 'feedback',
    submitLabel: "Envoyer l'avis",
    successMessage: 'Merci pour ton avis !',
    errorMessage: 'Merci de choisir une note et d\'ajouter un commentaire.',
    fields: [
      {
        name: 'rating',
        label: 'Comment évaluerais-tu ton expérience ?',
        type: 'select',
        required: true,
        placeholder: 'Choisis une note',
        options: [
          { value: '5', label: 'Excellent' },
          { value: '4', label: 'Bien' },
          { value: '3', label: 'Moyen' },
          { value: '2', label: 'Mauvais' },
          { value: '1', label: 'Très mauvais' },
        ],
      },
      { name: 'comments', label: 'Commentaires', type: 'textarea', rows: 4, required: true },
    ],
  },

  booking: {
    page: 'booking',
    submitLabel: 'Réserver',
    successMessage: 'Ta demande de réservation a été reçue — nous te confirmerons bientôt.',
    errorMessage: 'Merci de renseigner ton numéro de téléphone et le nombre de convives.',
    fields: [
      { name: 'fullName', label: 'Nom complet', type: 'text', required: true, minlength: 2 },
      { name: 'phone', label: 'Numéro de téléphone', type: 'tel', required: true, pattern: '[0-9+ ]{7,15}' },
      { name: 'guests', label: 'Nombre de convives', type: 'number', required: true, min: 1, max: 20 },
      { name: 'notes', label: 'Demandes spéciales', type: 'textarea', rows: 3 },
    ],
  },

  quiz: radioQuiz({
    page: 'quiz',
    question: 'Quelle option est correcte ?',
    successMessage: "Correct ! C'est la bonne.",
    errorMessage: "Pas tout à fait — choisis l'option du milieu.",
    options: [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B', correct: true },
      { value: 'c', label: 'Option C' },
    ],
  }),

  // Daily quizzes — each one lives on its own real day page under
  // views/pages/days/<date>.hbs. The `page` here is the date slug itself,
  // matching how server.js groups forms by page.
  dayQuiz1107: radioQuiz({
    page: '11-07',
    question: 'Combien font 2 + 2 ?',
    successMessage: "Correct ! Tu as réussi le quiz du jour.",
    options: [
      { value: 'a', label: '3' },
      { value: 'b', label: '4', correct: true },
      { value: 'c', label: '5' },
    ],
  }),

  dayQuiz1108: radioQuiz({
    page: '11-08',
    question: 'Quelle planète est surnommée la planète rouge ?',
    options: [
      { value: 'a', label: 'Vénus' },
      { value: 'b', label: 'Mars', correct: true },
      { value: 'c', label: 'Jupiter' },
    ],
  }),

  dayQuiz1106: imageQuiz({
    page: '11-06',
    question: 'Sélectionne le chien que papi avait quand il était jeune.',
    options: [
      { value: 'a', label: 'A', image: '/images/quiz/dog1.png' },
      { value: 'b', label: 'B', image: '/images/quiz/dog2.png', correct: true },
      { value: 'c', label: 'C', image: '/images/quiz/dog3.png' },
    ],
  }),

  // Unlocked once the memory game on this day's page is fully solved — see
  // js/memory-game.js, which reveals the `#memory-form-wrapper` element
  // wrapping this form after all 8 pairs are matched.
  dayMemory1109: {
    page: '11-09',
    submitLabel: 'Réclamer ta victoire',
    successMessage: 'Bien joué — ta victoire a été enregistrée !',
    errorMessage: 'Merci de saisir ton prénom pour réclamer ta victoire.',
    fields: [{ name: 'playerName', label: 'Ton prénom', type: 'text', required: true, minlength: 1 }],
  },

  // Unlocked once the hangman game on this day's page is won — see
  // js/hangman-game.js, which reveals the `#hangman-form-wrapper` element
  // wrapping this form once the word is fully guessed.
  dayHangman1110: {
    page: '11-10',
    submitLabel: 'Réclamer ta victoire',
    successMessage: 'Bien deviné — ta victoire a été enregistrée !',
    errorMessage: 'Merci de saisir ton prénom pour réclamer ta victoire.',
    fields: [{ name: 'playerName', label: 'Ton prénom', type: 'text', required: true, minlength: 1 }],
  },

  // Unlocked once the drag-and-drop game on this day's page is won — see
  // js/drop-game.js, which reveals the `#drop-form-wrapper` element wrapping
  // this form once all 5 valid objects have been dropped in the box.
  dayDrop1111: {
    page: '11-11',
    submitLabel: 'Réclamer ta victoire',
    successMessage: 'Bien trié — ta victoire a été enregistrée !',
    errorMessage: 'Merci de saisir ton prénom pour réclamer ta victoire.',
    fields: [{ name: 'playerName', label: 'Ton prénom', type: 'text', required: true, minlength: 1 }],
  },

  // Unlocked once the flappy-bird game on this day's page is won — see
  // js/flappy-game.js, which reveals the `#flappy-form-wrapper` element
  // wrapping this form once the goal/finish line is reached.
  dayFlappy1112: {
    page: '11-12',
    submitLabel: 'Réclamer ta victoire',
    successMessage: 'Bien volé — ta victoire a été enregistrée !',
    errorMessage: 'Merci de saisir ton prénom pour réclamer ta victoire.',
    fields: [{ name: 'playerName', label: 'Ton prénom', type: 'text', required: true, minlength: 1 }],
  },
};
