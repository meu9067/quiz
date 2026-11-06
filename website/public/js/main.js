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
});
