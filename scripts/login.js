const loginForm = document.getElementById("my-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const formMessage = document.getElementById("form-message");
const googleSignInButton = document.getElementById("google-sign-in");
const forgotPasswordLink = document.getElementById("forgot-password");

const emailError = document.getElementById("email-error");
const passwordError = document.getElementById("password-error");
const accountTypeError = document.getElementById("account-type-error");

function clearErrors() {
  emailError.textContent = "";
  passwordError.textContent = "";
  accountTypeError.textContent = "";

  emailInput.removeAttribute("aria-invalid");
  passwordInput.removeAttribute("aria-invalid");
}

function showMessage(message) {
  formMessage.textContent = message;
}

togglePassword.addEventListener("click", () => {
  const showPassword = passwordInput.type === "password";

  passwordInput.type = showPassword ? "text" : "password";
  togglePassword.textContent = showPassword ? "Hide" : "Show";
  togglePassword.setAttribute("aria-pressed", String(showPassword));
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  clearErrors();
  showMessage("");

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const accountType = loginForm.querySelector(
    'input[name="accountType"]:checked',
  );

  let isValid = true;

  if (!email || !emailInput.validity.valid) {
    emailError.textContent = "Enter a valid email address.";
    emailInput.setAttribute("aria-invalid", "true");
    isValid = false;
  }

  if (!password) {
    passwordError.textContent = "Enter your password.";
    passwordInput.setAttribute("aria-invalid", "true");
    isValid = false;
  }

  if (!accountType) {
    accountTypeError.textContent = "Select Vendor or Rider.";
    isValid = false;
  }

  if (!isValid) {
    showMessage("Please correct the highlighted fields.");
    return;
  }

  showMessage(
    "Your details passed validation, but login is unavailable because authentication has not been connected yet.",
  );
});

googleSignInButton.addEventListener("click", () => {
  showMessage(
    "Google sign-in is not configured yet. Connect an authentication provider before using this option.",
  );
});

forgotPasswordLink.addEventListener("click", (event) => {
  event.preventDefault();

  showMessage(
    "Password recovery is not available yet. It will work after authentication is configured.",
  );
});
