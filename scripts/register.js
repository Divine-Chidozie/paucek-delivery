const registerForm = document.getElementById("registration-form");
const registerMessage = document.getElementById("register-message");

const firstnameInput = document.getElementById("firstname");
const lastnameInput = document.getElementById("lastname");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");
const termsInput = document.getElementById("terms");
const googleSignUpButton = document.getElementById("google-sign-up");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const errorIds = [
  "firstname-error",
  "lastname-error",
  "email-error",
  "error-password",
  "confirm-password-error",
  "account-type-error",
  "terms-error",
];

function showError(id, message) {
  const errorElement = document.getElementById(id);

  if (errorElement) {
    errorElement.textContent = message;
  }
}

function showMessage(message) {
  registerMessage.textContent = message;
}

function clearErrors() {
  errorIds.forEach((id) => showError(id, ""));

  [
    firstnameInput,
    lastnameInput,
    emailInput,
    passwordInput,
    confirmPasswordInput,
    termsInput,
  ].forEach((input) => input.removeAttribute("aria-invalid"));

  registerForm
    .querySelectorAll('input[name="accountType"]')
    .forEach((input) => input.removeAttribute("aria-invalid"));

  showMessage("");
}

registerForm.querySelectorAll(".password-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.target);

    if (!input) return;

    const shouldShow = input.type === "password";

    input.type = shouldShow ? "text" : "password";
    button.textContent = shouldShow ? "Hide" : "Show";
    button.setAttribute("aria-pressed", String(shouldShow));
  });
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearErrors();

  let isValid = true;

  function markInvalid(input, errorId, message) {
    showError(errorId, message);
    input.setAttribute("aria-invalid", "true");
    isValid = false;
  }

  if (!firstnameInput.value.trim()) {
    markInvalid(firstnameInput, "firstname-error", "Enter your first name.");
  }

  if (!lastnameInput.value.trim()) {
    markInvalid(lastnameInput, "lastname-error", "Enter your last name.");
  }

  const email = emailInput.value.trim();

  if (!email || !emailPattern.test(email)) {
    markInvalid(emailInput, "email-error", "Enter a valid email address.");
  }

  if (passwordInput.value.length < 8) {
    markInvalid(
      passwordInput,
      "error-password",
      "Your password must contain at least 8 characters.",
    );
  }

  if (!confirmPasswordInput.value) {
    markInvalid(
      confirmPasswordInput,
      "confirm-password-error",
      "Confirm your password.",
    );
  } else if (confirmPasswordInput.value !== passwordInput.value) {
    markInvalid(
      confirmPasswordInput,
      "confirm-password-error",
      "Your passwords do not match.",
    );
  }

  const selectedAccount = registerForm.querySelector(
    'input[name="accountType"]:checked',
  );

  if (!selectedAccount) {
    showError("account-type-error", "Select Vendor or Rider.");

    registerForm
      .querySelectorAll('input[name="accountType"]')
      .forEach((input) => input.setAttribute("aria-invalid", "true"));

    isValid = false;
  }

  if (!termsInput.checked) {
    markInvalid(
      termsInput,
      "terms-error",
      "You must accept the terms to continue.",
    );
  }

  if (!isValid) {
    showMessage("Please correct the highlighted fields.");
    return;
  }

  showMessage(
    "Your details passed validation, but account creation is not connected yet. No account has been created.",
  );
});

googleSignUpButton.addEventListener("click", () => {
  const selectedAccount = registerForm.querySelector(
    'input[name="accountType"]:checked',
  );

  if (!selectedAccount) {
    showError("account-type-error", "Select Vendor or Rider first.");
    showMessage("Choose your account type to continue.");
    return;
  }

  showMessage(
    "Google sign-up is not configured yet. No account has been created.",
  );
});
