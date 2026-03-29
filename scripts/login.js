// ================== LOGIN JS ==================
const loginForm = document.getElementById("my-form");
const togglePassword = document.getElementById("togglePassword");

const passwordInput = document.getElementById("password");

// ================== LOGIN ==================
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = passwordInput.value.trim();
  const accountType = document.getElementById("account-type").value;

  const usernameError = document.getElementById("username-error");
  const passwordError = document.getElementById("password-error");

  usernameError.textContent = "";
  passwordError.textContent = "";

  if (!username || !password || !accountType) {
    passwordError.textContent = "All fields are required";
    return;
  }

  // 🔥 GET USERS
  const users = JSON.parse(localStorage.getItem("users")) || [];

  const foundUser = users.find(
    (user) =>
      user.email === username &&
      user.password === password &&
      user.accountType === accountType,
  );

  if (!foundUser) {
    passwordError.textContent = "Invalid credentials or wrong account type";
    return;
  }

  // ✅ REDIRECT
  if (accountType === "user") {
    window.location.href = "/pages/user-dashboard.html";
    // window.location.href = "/pages/pickup.html";
  } else if (accountType === "rider") {
    window.location.href = "/pages/rider.html";
  } else if (accountType === "marchant") {
    window.location.href = "/pages/marchent.html";
  }
});

// const currentUser = JSON.parse(localStorage.getItem("currentUser"));
// if (!currentUser || currentUser.accountType !== "user") {
//   alert("Access denied. Only users can request delivery.");
//   window.location.href = "/pages/login.html";
//   localStorage.setItem("currentUser", JSON.stringify(foundUser));
// }

// ================== TOGGLE PASSWORD ==================
togglePassword.addEventListener("click", () => {
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    togglePassword.textContent = "Hide Password";
  } else {
    passwordInput.type = "password";
    togglePassword.textContent = "Show Password";
  }
});

// ================== ACCOUNT CARD SELECT ==================
const cards = document.querySelectorAll(".account-card");
const hiddenInput = document.getElementById("account-type");

cards.forEach((card) => {
  card.addEventListener("click", () => {
    cards.forEach((c) => c.classList.remove("active"));
    card.classList.add("active");
    hiddenInput.value = card.dataset.value;
  });
});
