const registerForm = document.getElementById("registration-form");
const registerMessage = document.getElementById("register-message");

const firstnameInput = document.getElementById("firstname");
const lastnameInput = document.getElementById("lastname");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const phoneField = document.getElementById("phone-field");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");
const termsInput = document.getElementById("terms");
const googleSignUpButton = document.getElementById("google-sign-up");

const submitButton = registerForm.querySelector('[type="submit"]');
const originalButtonText = submitButton
  ? submitButton.textContent.trim()
  : "Create Account";

const API_BASE_URL = "http://localhost:5000/api";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const errorIds = [
  "firstname-error",
  "lastname-error",
  "email-error",
  "phone-error",
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
    phoneInput,
    passwordInput,
    confirmPasswordInput,
    termsInput,
  ]
    .filter(Boolean)
    .forEach((input) => input.removeAttribute("aria-invalid"));

  registerForm
    .querySelectorAll('input[name="accountType"]')
    .forEach((input) => input.removeAttribute("aria-invalid"));

  showMessage("");
}

function updateAccountFields() {
  const selectedAccount = registerForm.querySelector(
    'input[name="accountType"]:checked',
  );

  const isRider = selectedAccount?.value === "rider";

  phoneField.hidden = !isRider;
  phoneInput.required = isRider;

  if (!isRider) {
    phoneInput.value = "";
    showError("phone-error", "");
    phoneInput.removeAttribute("aria-invalid");
  }
}

// Update the form when Vendor or Rider is selected.
registerForm.querySelectorAll('input[name="accountType"]').forEach((input) => {
  input.addEventListener("change", () => {
    clearErrors();
    updateAccountFields();
  });
});

// Set the correct field visibility on initial page load.
updateAccountFields();

// Show and hide passwords.
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

// Vendor and rider registration.
registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors();

  let isValid = true;

  function markInvalid(input, errorId, message) {
    showError(errorId, message);
    input.setAttribute("aria-invalid", "true");
    isValid = false;
  }

  const firstName = firstnameInput.value.trim();
  const lastName = lastnameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const phone = phoneInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

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

  if (!firstName) {
    markInvalid(firstnameInput, "firstname-error", "Enter your first name.");
  }

  if (!lastName) {
    markInvalid(lastnameInput, "lastname-error", "Enter your last name.");
  }

  if (!email || !emailPattern.test(email)) {
    markInvalid(emailInput, "email-error", "Enter a valid email address.");
  }

  if (selectedAccount?.value === "rider" && !phone) {
    markInvalid(phoneInput, "phone-error", "Enter your phone number.");
  }

  if (password.length < 8) {
    markInvalid(
      passwordInput,
      "error-password",
      "Your password must contain at least 8 characters.",
    );
  }

  if (!confirmPassword) {
    markInvalid(
      confirmPasswordInput,
      "confirm-password-error",
      "Confirm your password.",
    );
  } else if (confirmPassword !== password) {
    markInvalid(
      confirmPasswordInput,
      "confirm-password-error",
      "Your passwords do not match.",
    );
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

  const accountType = selectedAccount.value;

  const endpoint =
    accountType === "rider"
      ? `${API_BASE_URL}/riders/register`
      : `${API_BASE_URL}/vendors/register`;

  const accountLabel = accountType === "rider" ? "rider" : "vendor";

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Creating Account...";
    }

    showMessage(`Creating your ${accountLabel} account...`);

    const requestBody = {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      accountType,
      terms: termsInput.checked,
    };

    if (accountType === "rider") {
      requestBody.phone = phone;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(data.message || "Registration failed. Please try again.");
      return;
    }

    registerForm.reset();
    updateAccountFields();
    clearErrors();

    if (accountType === "rider") {
      showMessage(
        "Your rider account has been created and is awaiting approval. You can log in to check your account status.",
      );
    } else {
      showMessage("Your vendor account has been created successfully!");
    }
  } catch (error) {
    console.error("Registration request failed:", error);

    showMessage(
      "Unable to connect to the server. Make sure the Paucek backend is running and try again.",
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  }
});

// Google sign-up is not connected yet.
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
