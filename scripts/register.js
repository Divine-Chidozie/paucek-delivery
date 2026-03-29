// ================== REGISTER JS ==================
const registerForm = document.getElementById("registration-form");

registerForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const firstname = document.getElementById("firstname").value.trim();
  const lastname = document.getElementById("lastname").value.trim();
  const password = document.getElementById("password").value.trim();
  const email = document.getElementById("email").value.trim();
  const accountType = document.getElementById("account-type").value;
  const checkbox = document.getElementById("checkbox").checked;

  const firstnameError = document.getElementById("firstname-error");
  const lastnameError = document.getElementById("lastname-error");
  const passwordError = document.getElementById("error-password");
  const emailError = document.getElementById("email-error");
  const accountTypeError = document.getElementById("account-type-error");
  const checkboxError = document.getElementById("checkbox-error");

  // Clear errors
  [
    firstnameError,
    lastnameError,
    passwordError,
    emailError,
    accountTypeError,
    checkboxError,
  ].forEach((el) => (el.textContent = ""));

  let isValid = true;

  if (!firstname) {
    firstnameError.textContent = "First name is required";
    isValid = false;
  }

  if (!lastname) {
    lastnameError.textContent = "Last name is required";
    isValid = false;
  }

  if (!password) {
    passwordError.textContent = "Password is required";
    isValid = false;
  }

  if (!email) {
    emailError.textContent = "Email is required";
    isValid = false;
  }

  if (!accountType) {
    accountTypeError.textContent = "Select account type";
    isValid = false;
  }

  if (!checkbox) {
    checkboxError.textContent = "Accept terms first";
    isValid = false;
  }

  if (!isValid) return;

  // 🔥 SAVE USER TO LOCALSTORAGE
  const newUser = {
    firstname,
    lastname,
    email,
    password,
    accountType,
  };

  // Get existing users
  const users = JSON.parse(localStorage.getItem("users")) || [];

  // Check if user already exists
  const existingUser = users.find((user) => user.email === email);

  if (existingUser) {
    alert("User already exists. Please login.");
    return;
  }

  users.push(newUser);
  localStorage.setItem("users", JSON.stringify(users));

  alert("Registration successful!");

  // Redirect based on account type
  if (accountType === "user") {
    window.location.href = "/pages/user-dashboard.html";
  } else if (accountType === "rider") {
    window.location.href = "/pages/rider.html";
  } else if (accountType === "marchant") {
    window.location.href = "/pages/marchent.html";
  }
});
