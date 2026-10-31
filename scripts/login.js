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

// Live Render backend API
const API_BASE_URL = "https://paucek-delivery.onrender.com/api";

// Keep dashboard navigation on the Vercel frontend
const DASHBOARDS = {
  merchant: "/dashboard/vendorDashboard.html",
  rider: "/dashboard/riderDashboard.html",
};

function clearErrors() {
  emailError.textContent = "";
  passwordError.textContent = "";
  accountTypeError.textContent = "";

  emailInput.removeAttribute("aria-invalid");
  passwordInput.removeAttribute("aria-invalid");
}

function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.style.color = isError ? "#dc2626" : "#15803d";
}

// Show or hide password
togglePassword.addEventListener("click", () => {
  const showPassword = passwordInput.type === "password";

  passwordInput.type = showPassword ? "text" : "password";
  togglePassword.textContent = showPassword ? "Hide" : "Show";
  togglePassword.setAttribute("aria-pressed", String(showPassword));
});

// Handle login submission
loginForm.addEventListener("submit", async (event) => {
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
    showMessage("Please correct the highlighted fields.", true);
    return;
  }

  const selectedType = accountType.value;

  if (!DASHBOARDS[selectedType]) {
    showMessage("Invalid account type selected.", true);
    return;
  }

  const isRider = selectedType === "rider";

  const apiUrl = isRider
    ? `${API_BASE_URL}/riders/login`
    : `${API_BASE_URL}/vendors/login`;

  const submitButton = loginForm.querySelector(
    'button[type="submit"], input[type="submit"]',
  );

  if (submitButton) submitButton.disabled = true;

  showMessage("Signing you in...");

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        accountType: selectedType,
      }),
    });

    const responseText = await response.text();
    let data;

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error(
        `Invalid server response (HTTP ${response.status}). Check the backend logs.`,
      );
    }

    if (!response.ok) {
      throw new Error(
        data.message || `Login failed (HTTP ${response.status}).`,
      );
    }

    const account = isRider ? data.rider : data.vendor;

    if (!data.token || !account) {
      throw new Error(
        `The server did not return the expected ${
          isRider ? "rider" : "vendor"
        } account.`,
      );
    }

    if (isRider) {
      // Keep the rider session separate from the vendor session.
      localStorage.setItem("paucekRiderToken", data.token);
      localStorage.setItem("paucekRider", JSON.stringify(data.rider));

      // Pending riders can log in but cannot accept deliveries
      // until approved by the administrator.
      if (data.rider.approvalStatus === "Pending") {
        showMessage(
          "Login successful. Your rider account is awaiting approval.",
        );
      }
    } else {
      localStorage.setItem("paucekToken", data.token);
      localStorage.setItem("paucekVendor", JSON.stringify(data.vendor));
    }

    // Redirect to the appropriate Vercel dashboard.
    window.location.href = DASHBOARDS[selectedType];
  } catch (error) {
    console.error("Login error:", error);

    if (error.message === "Failed to fetch" || error instanceof TypeError) {
      showMessage(
        "Cannot connect to the backend. Please try again shortly.",
        true,
      );
    } else {
      showMessage(
        error.message || "Something went wrong. Please try again.",
        true,
      );
    }
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

// Google sign-in placeholder
if (googleSignInButton) {
  googleSignInButton.addEventListener("click", () => {
    showMessage("Google sign-in is not configured yet.", true);
  });
}

// Forgot-password placeholder
if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", (event) => {
    event.preventDefault();
    showMessage("Password recovery is not available yet.", true);
  });
}
